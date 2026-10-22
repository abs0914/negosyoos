-- Module 28: immutable, tenant-scoped configuration version history.
alter table public.configuration_change_sets drop constraint if exists configuration_change_sets_source_check;
alter table public.configuration_change_sets add constraint configuration_change_sets_source_check check(source in('manual','ai','template','system'));
create table public.configuration_versions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id)on delete cascade,
 version bigint not null check(version>=0),
 author_id uuid not null references auth.users(id),
 source text not null check(source in('manual','ai','template','system')),
 changes jsonb not null check(jsonb_typeof(changes)='object'),
 description text not null check(char_length(btrim(description))between 1 and 1000),
 change_set_id uuid,
 restores_version bigint,
 rollback_snapshot jsonb check(rollback_snapshot is null or jsonb_typeof(rollback_snapshot)='array'),
 created_at timestamptz not null default now(),
 unique(organization_id,version),
 unique(change_set_id),
 foreign key(change_set_id,organization_id)references public.configuration_change_sets(id,organization_id)on delete restrict,
 foreign key(organization_id,restores_version)references public.configuration_versions(organization_id,version)on delete restrict
);
create index configuration_versions_history_idx on public.configuration_versions(organization_id,version desc);

create table public.configuration_version_restores(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id)on delete cascade,
 target_version bigint not null,
 base_revision bigint not null,
 status text not null check(status in('applying','completed','failed')),
 requested_by uuid not null references auth.users(id),
 failure_reason text,
 created_at timestamptz not null default now(),completed_at timestamptz,
 foreign key(organization_id,target_version)references public.configuration_versions(organization_id,version)on delete restrict
);
create unique index one_active_configuration_restore_idx on public.configuration_version_restores(organization_id)where status='applying';

alter table public.configuration_versions enable row level security;
alter table public.configuration_version_restores enable row level security;
create policy configuration_versions_read on public.configuration_versions for select to authenticated using(
 private.can_business_permission(organization_id,'metadata.read',null)or private.can_business_permission(organization_id,'metadata.manage',null)or private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null)
);
create policy configuration_restores_read on public.configuration_version_restores for select to authenticated using(
 private.can_business_permission(organization_id,'metadata.read',null)or private.can_business_permission(organization_id,'metadata.manage',null)or private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null)
);
revoke all on table public.configuration_versions,public.configuration_version_restores from public,anon,authenticated;
grant select on table public.configuration_versions,public.configuration_version_restores to authenticated;

-- Applying an AI proposal and creating its immutable version are one transaction.
create or replace function public.complete_ai_configuration_apply(requested_organization_id uuid,requested_proposal_id uuid,requested_rollback_snapshot jsonb)returns void
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());proposal public.configuration_change_sets%rowtype;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)or jsonb_typeof(requested_rollback_snapshot)<>'array'then raise exception'Permission denied or invalid snapshot.'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,25));select*into proposal from public.configuration_change_sets where id=requested_proposal_id and organization_id=requested_organization_id for update;
 if proposal.status<>'applying'then raise exception'Proposal is not applying.'using errcode='P0001';end if;
 update public.organization_configuration_revisions set revision=proposal.target_revision,updated_by=actor where organization_id=requested_organization_id and revision=proposal.base_revision;if not found then raise exception'Configuration revision changed during apply.'using errcode='P0001';end if;
 insert into public.configuration_versions(organization_id,version,author_id,source,changes,description)
 values(requested_organization_id,0,actor,'system','{"operation":"baseline"}'::jsonb,'Initial configuration')on conflict(organization_id,version)do nothing;
 insert into public.configuration_versions(organization_id,version,author_id,source,changes,description,change_set_id,rollback_snapshot)
 values(requested_organization_id,proposal.target_revision,actor,proposal.source,jsonb_build_object('operations',proposal.operations),proposal.summary,proposal.id,requested_rollback_snapshot);
 update public.configuration_change_sets set status='applied',applied_at=now(),rollback_snapshot=requested_rollback_snapshot where id=proposal.id;
 perform private.record_configuration_event(requested_organization_id,proposal.id,'applied',jsonb_build_object('revision',proposal.target_revision));
end;$$;

-- A rollback never deletes an old version; it appends a system-authored version.
create or replace function public.complete_ai_configuration_rollback(requested_organization_id uuid,requested_proposal_id uuid)returns void
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());proposal public.configuration_change_sets%rowtype;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,25));select*into proposal from public.configuration_change_sets where id=requested_proposal_id and organization_id=requested_organization_id for update;
 if proposal.status<>'rolling_back'then raise exception'Proposal is not rolling back.'using errcode='P0001';end if;
 update public.organization_configuration_revisions set revision=revision+1,updated_by=actor where organization_id=requested_organization_id and revision=proposal.target_revision returning revision into proposal.rollback_revision;if not found then raise exception'Configuration revision changed during rollback.'using errcode='P0001';end if;
 insert into public.configuration_versions(organization_id,version,author_id,source,changes,description,restores_version)
 values(requested_organization_id,proposal.rollback_revision,actor,'system',jsonb_build_object('operation','rollback','changeSetId',proposal.id,'revertedOperations',proposal.operations),'Rolled back: '||proposal.title,proposal.base_revision);
 update public.configuration_change_sets set status='rolled_back',rolled_back_at=now(),rollback_revision=proposal.rollback_revision where id=proposal.id;
 perform private.record_configuration_event(requested_organization_id,proposal.id,'rolled_back',jsonb_build_object('revision',proposal.rollback_revision));
end;$$;

-- Template installation is also versioned, while idempotent replays create no version.
create or replace function public.install_business_os_template(requested_organization_id uuid,requested_version_id uuid)returns uuid
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());before_version uuid;after_version uuid;installation_id uuid;revision_value bigint;definition_value jsonb;summary_value text;
begin
 select installed_version_id into before_version from public.business_os_installations where organization_id=requested_organization_id;
 installation_id:=private.install_business_os_template(requested_organization_id,requested_version_id);
 select installed_version_id into after_version from public.business_os_installations where id=installation_id;
 if before_version is distinct from after_version then
  insert into public.organization_configuration_revisions(organization_id,revision,updated_by)values(requested_organization_id,0,actor)on conflict do nothing;
  insert into public.configuration_versions(organization_id,version,author_id,source,changes,description)values(requested_organization_id,0,actor,'system','{"operation":"baseline"}'::jsonb,'Initial configuration')on conflict(organization_id,version)do nothing;
  update public.organization_configuration_revisions set revision=revision+1,updated_by=actor where organization_id=requested_organization_id returning revision into revision_value;
  select definition,change_summary into definition_value,summary_value from public.business_os_template_versions where id=after_version;
  insert into public.configuration_versions(organization_id,version,author_id,source,changes,description)
  values(requested_organization_id,revision_value,actor,'template',jsonb_build_object('templateVersionId',after_version,'definition',definition_value),summary_value);
 end if;
 return installation_id;
end;$$;

create function public.begin_configuration_version_restore(requested_organization_id uuid,requested_target_version bigint)returns jsonb
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());current_revision bigint;effective_version bigint;restore_id uuid;patches jsonb;missing_patch boolean;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'metadata.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,28));
 if exists(select 1 from public.configuration_version_restores where organization_id=requested_organization_id and status='applying')then raise exception'A configuration restore is already in progress.'using errcode='P0001';end if;
 select revision into current_revision from public.organization_configuration_revisions where organization_id=requested_organization_id for update;
 select coalesce(restores_version,version)into effective_version from public.configuration_versions where organization_id=requested_organization_id and version=current_revision;
 if effective_version is null then effective_version:=current_revision;end if;
 if requested_target_version>=effective_version or not exists(select 1 from public.configuration_versions where organization_id=requested_organization_id and version=requested_target_version)then raise exception'Restore target must be an earlier configuration version.'using errcode='22023';end if;
 select exists(select 1 from public.configuration_versions where organization_id=requested_organization_id and version>requested_target_version and version<=effective_version and rollback_snapshot is null)into missing_patch;
 if missing_patch then raise exception'This version cannot be restored automatically because an intervening change has no rollback snapshot.'using errcode='P0001';end if;
 select coalesce(jsonb_agg(rollback_snapshot order by version desc),'[]'::jsonb)into patches from public.configuration_versions where organization_id=requested_organization_id and version>requested_target_version and version<=effective_version;
 insert into public.configuration_version_restores(organization_id,target_version,base_revision,status,requested_by)values(requested_organization_id,requested_target_version,current_revision,'applying',actor)returning id into restore_id;
 return jsonb_build_object('restoreId',restore_id,'snapshots',patches);
end;$$;

create function public.complete_configuration_version_restore(requested_organization_id uuid,requested_restore_id uuid)returns bigint
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());restore_row public.configuration_version_restores%rowtype;next_revision bigint;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'metadata.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,28));select*into restore_row from public.configuration_version_restores where id=requested_restore_id and organization_id=requested_organization_id for update;
 if restore_row.status<>'applying'then raise exception'Restore is not applying.'using errcode='P0001';end if;
 update public.organization_configuration_revisions set revision=revision+1,updated_by=actor where organization_id=requested_organization_id and revision=restore_row.base_revision returning revision into next_revision;if not found then raise exception'Configuration changed during restore.'using errcode='P0001';end if;
 insert into public.configuration_versions(organization_id,version,author_id,source,changes,description,restores_version)
 values(requested_organization_id,next_revision,actor,'system',jsonb_build_object('operation','restore_version','restoredVersion',restore_row.target_version),'Restored configuration version '||restore_row.target_version,restore_row.target_version);
 update public.configuration_version_restores set status='completed',completed_at=now()where id=restore_row.id;
 return next_revision;
end;$$;

create function public.fail_configuration_version_restore(requested_organization_id uuid,requested_restore_id uuid,requested_reason text)returns void
language plpgsql security definer set search_path=''as $$begin
 if(select auth.uid())is null or not private.can_business_permission(requested_organization_id,'metadata.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 update public.configuration_version_restores set status='failed',failure_reason=left(requested_reason,1000),completed_at=now()where id=requested_restore_id and organization_id=requested_organization_id and status='applying';
end;$$;

revoke all on function public.begin_configuration_version_restore(uuid,bigint),public.complete_configuration_version_restore(uuid,uuid),public.fail_configuration_version_restore(uuid,uuid,text)from public,anon;
grant execute on function public.begin_configuration_version_restore(uuid,bigint),public.complete_configuration_version_restore(uuid,uuid),public.fail_configuration_version_restore(uuid,uuid,text)to authenticated;
comment on table public.configuration_versions is'Append-only configuration history. Restores create new versions and never rewrite prior history.';
