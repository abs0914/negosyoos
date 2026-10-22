-- Module 25: safe, declarative AI configuration proposals.
-- The stored operation documents are data only. No SQL, JavaScript, source-code,
-- shell, URL, or arbitrary API operation exists in the command vocabulary.

alter table public.configuration_change_sets
  drop constraint if exists configuration_change_sets_status_check;
alter table public.configuration_change_sets
  add constraint configuration_change_sets_status_check check(status in(
    'proposed','validated','approved','applying','applied','rejected','failed','rolling_back','rolled_back'
  )),
  add column validation_result jsonb not null default'{}'::jsonb check(jsonb_typeof(validation_result)='object'),
  add column warnings jsonb not null default'[]'::jsonb check(jsonb_typeof(warnings)='array'),
  add column rollback_snapshot jsonb check(rollback_snapshot is null or jsonb_typeof(rollback_snapshot)='array'),
  add column reviewed_at timestamptz,
  add column rolled_back_at timestamptz,
  add column rollback_revision bigint check(rollback_revision is null or rollback_revision>target_revision),
  add column failure_reason text check(failure_reason is null or char_length(failure_reason)<=1000);
alter table public.configuration_change_sets add constraint configuration_change_sets_id_organization_unique unique(id,organization_id);

create table public.organization_entity_labels(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id)on delete cascade,
  entity_key text not null check(entity_key~'^[a-z][a-z0-9_]*$'and char_length(entity_key)<=64),
  singular_label text not null check(char_length(btrim(singular_label))between 1 and 120),
  plural_label text not null check(char_length(btrim(plural_label))between 1 and 120),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(organization_id,entity_key)
);

create table public.configuration_change_set_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id)on delete cascade,
  change_set_id uuid not null,
  event text not null check(event in('proposed','validated','approved','rejected','apply_started','applied','apply_failed','rollback_started','rolled_back','rollback_failed')),
  actor_id uuid not null references auth.users(id),
  details jsonb not null default'{}'::jsonb check(jsonb_typeof(details)='object'),
  created_at timestamptz not null default now(),
  foreign key(change_set_id,organization_id)references public.configuration_change_sets(id,organization_id)on delete cascade
);
create index configuration_change_set_events_history_idx on public.configuration_change_set_events(organization_id,change_set_id,created_at);
create trigger set_updated_at before update on public.organization_entity_labels for each row execute function private.set_updated_at();

create function private.ai_configuration_operations_are_valid(operations jsonb)
returns boolean language plpgsql immutable set search_path=''as $$
declare item jsonb;kind text;allowed text[];
begin
 if jsonb_typeof(operations)<>'array'or jsonb_array_length(operations)not between 1 and 50 then return false;end if;
 if operations::text~*'"(sql|javascript|sourceCode|shell|command|endpoint|apiUrl|webhookUrl)"[[:space:]]*:'then return false;end if;
 for item in select value from jsonb_array_elements(operations)loop
  if jsonb_typeof(item)<>'object'or not(item?'operation')then return false;end if;kind:=item->>'operation';
  allowed:=case kind
   when'enable_module'then array['operation','moduleKey','configuration']
   when'disable_module'then array['operation','moduleKey']
   when'rename_entity'then array['operation','entityKey','singularLabel','pluralLabel']
   when'add_object'then array['operation','object']
   when'add_field'then array['operation','objectKey','field']
   when'update_field'then array['operation','objectKey','fieldKey','changes']
   when'add_view'then array['operation','objectKey','view']
   when'update_view'then array['operation','objectKey','viewKey','changes']
   when'add_form'then array['operation','objectKey','form']
   when'update_form'then array['operation','objectKey','formKey','changes']
   when'add_workflow'then array['operation','workflow']
   when'update_workflow'then array['operation','workflowKey','changes']
   when'add_dashboard_widget'then array['operation','dashboardKey','dashboardName','widget']
   when'add_report'then array['operation','report']
   when'update_permission'then array['operation','roleKey','permissionKey','enabled']
   else array[]::text[] end;
  if cardinality(allowed)=0 or item-allowed<>'{}'::jsonb then return false;end if;
 end loop;return true;
exception when others then return false;end;$$;

create function private.record_configuration_event(org uuid,change_id uuid,event_name text,detail jsonb default'{}')returns void language sql security definer set search_path=''as $$
 insert into public.configuration_change_set_events(organization_id,change_set_id,event,actor_id,details)values(org,change_id,event_name,(select auth.uid()),detail);
$$;

create function public.submit_ai_configuration_proposal(requested_organization_id uuid,requested_title text,requested_summary text,requested_operations jsonb,requested_base_revision bigint,requested_warnings jsonb default'[]')returns uuid
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());current_revision bigint;proposal_id uuid;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 if char_length(btrim(requested_title))not between 1 and 160 or char_length(btrim(requested_summary))not between 1 and 1000 or not private.ai_configuration_operations_are_valid(requested_operations)or jsonb_typeof(requested_warnings)<>'array'or jsonb_array_length(requested_warnings)>20 then raise exception'Invalid AI configuration proposal.'using errcode='22023';end if;
 insert into public.organization_configuration_revisions(organization_id,revision,updated_by)values(requested_organization_id,0,actor)on conflict do nothing;
 select revision into current_revision from public.organization_configuration_revisions where organization_id=requested_organization_id;
 if current_revision<>requested_base_revision then raise exception'Configuration revision changed; preview again.'using errcode='P0001';end if;
 insert into public.configuration_change_sets(organization_id,base_revision,target_revision,source,title,summary,operations,status,proposed_by,validation_result,warnings)
 values(requested_organization_id,current_revision,current_revision+1,'ai',btrim(requested_title),btrim(requested_summary),requested_operations,'validated',actor,'{"schema":"passed","tenantAuthorization":"passed","dependencies":"passed","businessRules":"passed"}',requested_warnings)returning id into proposal_id;
 perform private.record_configuration_event(requested_organization_id,proposal_id,'proposed');perform private.record_configuration_event(requested_organization_id,proposal_id,'validated');return proposal_id;
end;$$;

create function public.review_ai_configuration_proposal(requested_organization_id uuid,requested_proposal_id uuid,requested_decision text)returns void
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());event_name text;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 if requested_decision not in('approved','rejected')then raise exception'Invalid review decision.'using errcode='22023';end if;
 update public.configuration_change_sets set status=requested_decision,approved_by=case when requested_decision='approved'then actor else null end,reviewed_at=now()
 where id=requested_proposal_id and organization_id=requested_organization_id and source='ai'and status='validated';if not found then raise exception'Proposal is not awaiting review.'using errcode='P0001';end if;
 event_name:=requested_decision;perform private.record_configuration_event(requested_organization_id,requested_proposal_id,event_name);
end;$$;

create function public.begin_ai_configuration_apply(requested_organization_id uuid,requested_proposal_id uuid)returns jsonb
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());proposal public.configuration_change_sets%rowtype;current_revision bigint;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,25));select*into proposal from public.configuration_change_sets where id=requested_proposal_id and organization_id=requested_organization_id and source='ai'for update;
 select revision into current_revision from public.organization_configuration_revisions where organization_id=requested_organization_id;
 if proposal.status<>'approved'or proposal.base_revision<>current_revision then raise exception'Proposal must be approved and based on the current revision.'using errcode='P0001';end if;
 update public.configuration_change_sets set status='applying',failure_reason=null where id=proposal.id;perform private.record_configuration_event(requested_organization_id,proposal.id,'apply_started');return jsonb_build_object('operations',proposal.operations,'baseRevision',proposal.base_revision,'targetRevision',proposal.target_revision);
end;$$;

create function public.complete_ai_configuration_apply(requested_organization_id uuid,requested_proposal_id uuid,requested_rollback_snapshot jsonb)returns void
language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());proposal public.configuration_change_sets%rowtype;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)or jsonb_typeof(requested_rollback_snapshot)<>'array'then raise exception'Permission denied or invalid snapshot.'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,25));select*into proposal from public.configuration_change_sets where id=requested_proposal_id and organization_id=requested_organization_id for update;
 if proposal.status<>'applying'then raise exception'Proposal is not applying.'using errcode='P0001';end if;
 update public.organization_configuration_revisions set revision=proposal.target_revision,updated_by=actor where organization_id=requested_organization_id and revision=proposal.base_revision;if not found then raise exception'Configuration revision changed during apply.'using errcode='P0001';end if;
 update public.configuration_change_sets set status='applied',applied_at=now(),rollback_snapshot=requested_rollback_snapshot where id=proposal.id;perform private.record_configuration_event(requested_organization_id,proposal.id,'applied',jsonb_build_object('revision',proposal.target_revision));
end;$$;

create function public.fail_ai_configuration_apply(requested_organization_id uuid,requested_proposal_id uuid,requested_reason text)returns void language plpgsql security definer set search_path=''as $$
begin if(select auth.uid())is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;update public.configuration_change_sets set status='failed',failure_reason=left(requested_reason,1000)where id=requested_proposal_id and organization_id=requested_organization_id and status='applying';if found then perform private.record_configuration_event(requested_organization_id,requested_proposal_id,'apply_failed',jsonb_build_object('reason',left(requested_reason,1000)));end if;end;$$;

create function public.begin_ai_configuration_rollback(requested_organization_id uuid,requested_proposal_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());proposal public.configuration_change_sets%rowtype;current_revision bigint;
begin if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,25));select*into proposal from public.configuration_change_sets where id=requested_proposal_id and organization_id=requested_organization_id for update;select revision into current_revision from public.organization_configuration_revisions where organization_id=requested_organization_id;if proposal.status<>'applied'or proposal.rollback_snapshot is null or current_revision<>proposal.target_revision then raise exception'Only the latest applied proposal can be rolled back.'using errcode='P0001';end if;update public.configuration_change_sets set status='rolling_back'where id=proposal.id;perform private.record_configuration_event(requested_organization_id,proposal.id,'rollback_started');return proposal.rollback_snapshot;end;$$;

create function public.complete_ai_configuration_rollback(requested_organization_id uuid,requested_proposal_id uuid)returns void language plpgsql security definer set search_path=''as $$
declare actor uuid:=(select auth.uid());proposal public.configuration_change_sets%rowtype;
begin if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;perform pg_advisory_xact_lock(hashtextextended(requested_organization_id::text,25));select*into proposal from public.configuration_change_sets where id=requested_proposal_id and organization_id=requested_organization_id for update;if proposal.status<>'rolling_back'then raise exception'Proposal is not rolling back.'using errcode='P0001';end if;update public.organization_configuration_revisions set revision=revision+1,updated_by=actor where organization_id=requested_organization_id and revision=proposal.target_revision returning revision into proposal.rollback_revision;if not found then raise exception'Configuration revision changed during rollback.'using errcode='P0001';end if;update public.configuration_change_sets set status='rolled_back',rolled_back_at=now(),rollback_revision=proposal.rollback_revision where id=proposal.id;perform private.record_configuration_event(requested_organization_id,proposal.id,'rolled_back',jsonb_build_object('revision',proposal.rollback_revision));end;$$;

create function public.fail_ai_configuration_rollback(requested_organization_id uuid,requested_proposal_id uuid,requested_reason text)returns void language plpgsql security definer set search_path=''as $$
begin if(select auth.uid())is null or not private.can_business_permission(requested_organization_id,'ai.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;update public.configuration_change_sets set status='applied',failure_reason=left(requested_reason,1000)where id=requested_proposal_id and organization_id=requested_organization_id and status='rolling_back';if found then perform private.record_configuration_event(requested_organization_id,requested_proposal_id,'rollback_failed',jsonb_build_object('reason',left(requested_reason,1000)));end if;end;$$;

alter table public.organization_entity_labels enable row level security;alter table public.configuration_change_set_events enable row level security;
create policy entity_labels_read on public.organization_entity_labels for select to authenticated using(private.can_business_permission(organization_id,'metadata.read',null)or private.can_business_permission(organization_id,'metadata.manage',null));
create policy entity_labels_manage on public.organization_entity_labels for all to authenticated using(private.can_business_permission(organization_id,'metadata.manage',null))with check(private.can_business_permission(organization_id,'metadata.manage',null));
create policy configuration_events_read on public.configuration_change_set_events for select to authenticated using(private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null));
drop policy if exists configuration_change_sets_select_authorized on public.configuration_change_sets;create policy configuration_change_sets_ai_read on public.configuration_change_sets for select to authenticated using(private.can_business_permission(organization_id,'ai.read',null)or private.can_business_permission(organization_id,'ai.manage',null));
drop policy if exists configuration_change_sets_insert_authorized on public.configuration_change_sets;drop policy if exists configuration_change_sets_update_authorized on public.configuration_change_sets;drop policy if exists configuration_change_sets_delete_authorized on public.configuration_change_sets;
revoke all on table public.organization_entity_labels,public.configuration_change_set_events from public,anon,authenticated;grant select,insert,update,delete on public.organization_entity_labels to authenticated;grant select on public.configuration_change_set_events to authenticated;
revoke insert,update,delete on public.configuration_change_sets,public.organization_configuration_revisions from authenticated;
revoke all on function private.ai_configuration_operations_are_valid(jsonb),private.record_configuration_event(uuid,uuid,text,jsonb)from public,anon,authenticated;
revoke all on function public.submit_ai_configuration_proposal(uuid,text,text,jsonb,bigint,jsonb),public.review_ai_configuration_proposal(uuid,uuid,text),public.begin_ai_configuration_apply(uuid,uuid),public.complete_ai_configuration_apply(uuid,uuid,jsonb),public.fail_ai_configuration_apply(uuid,uuid,text),public.begin_ai_configuration_rollback(uuid,uuid),public.complete_ai_configuration_rollback(uuid,uuid),public.fail_ai_configuration_rollback(uuid,uuid,text)from public,anon;
grant execute on function public.submit_ai_configuration_proposal(uuid,text,text,jsonb,bigint,jsonb),public.review_ai_configuration_proposal(uuid,uuid,text),public.begin_ai_configuration_apply(uuid,uuid),public.complete_ai_configuration_apply(uuid,uuid,jsonb),public.fail_ai_configuration_apply(uuid,uuid,text),public.begin_ai_configuration_rollback(uuid,uuid),public.complete_ai_configuration_rollback(uuid,uuid),public.fail_ai_configuration_rollback(uuid,uuid,text)to authenticated;
comment on table public.configuration_change_sets is'Human-reviewed configuration proposals. AI source rows contain only strict declarative operations.';
