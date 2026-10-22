-- Module 9: declarative workflows. Definitions contain only allow-listed JSON data.

alter table public.workflow_definitions
  add column conditions jsonb not null default '{"logic":"all","conditions":[]}'::jsonb check (jsonb_typeof(conditions) = 'object'),
  add column retry_policy jsonb not null default '{"maxAttempts":3,"backoffSeconds":60}'::jsonb check (jsonb_typeof(retry_policy) = 'object'),
  add column created_by uuid references auth.users(id),
  add column updated_by uuid references auth.users(id),
  add column disabled_at timestamptz;

update public.workflow_definitions workflow set created_by = organization.created_by, updated_by = organization.created_by
from public.organizations organization where organization.id = workflow.organization_id;
alter table public.workflow_definitions alter column created_by set not null, alter column updated_by set not null;
alter table public.workflow_definitions drop constraint workflow_definitions_status_check;
update public.workflow_definitions set status = 'disabled', disabled_at = now() where status = 'paused';
alter table public.workflow_definitions add constraint workflow_definitions_status_check check (status in ('draft','active','disabled','archived'));
alter table public.workflow_definitions add constraint workflow_name_length_check check (char_length(name) between 1 and 120),
  add constraint workflow_description_length_check check (char_length(description) <= 500),
  add constraint workflow_key_check check (key ~ '^[a-z][a-z0-9_]{0,63}$');

create table public.workflow_executions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null,
  workflow_definition_id uuid not null, workflow_version integer not null,
  trigger_type text not null check (trigger_type in ('record.created','record.updated','record.status_changed','schedule','manual')),
  source_object_definition_id uuid, source_record_id uuid, idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending','running','retrying','succeeded','failed','skipped')),
  attempt integer not null default 0 check (attempt between 0 and 5), max_attempts integer not null check (max_attempts between 1 and 5),
  test_run boolean not null default false, input jsonb not null default '{}'::jsonb check (jsonb_typeof(input) = 'object'),
  error_code text, error_message text, initiated_by uuid not null references auth.users(id),
  started_at timestamptz, completed_at timestamptz, next_retry_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), unique (organization_id, workflow_definition_id, idempotency_key),
  foreign key (workflow_definition_id, organization_id) references public.workflow_definitions(id, organization_id) on delete restrict,
  foreign key (source_object_definition_id, organization_id) references public.object_definitions(id, organization_id) on delete restrict,
  foreign key (source_record_id, organization_id) references public.object_records(id, organization_id) on delete restrict
);
create table public.workflow_execution_steps (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, execution_id uuid not null,
  action_key text not null, action_type text not null check (action_type in ('update_record','create_record','send_notification','request_approval','assign_user','assign_branch','change_status','create_task')),
  position integer not null check (position between 0 and 49), status text not null default 'pending' check (status in ('pending','running','succeeded','failed','skipped')),
  attempt integer not null default 0 check (attempt between 0 and 5), input jsonb not null default '{}'::jsonb check (jsonb_typeof(input) = 'object'),
  output jsonb not null default '{}'::jsonb check (jsonb_typeof(output) = 'object'), error_code text, error_message text,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), unique (execution_id, action_key),
  foreign key (execution_id, organization_id) references public.workflow_executions(id, organization_id) on delete cascade
);
create table public.workflow_audit_history (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_definition_id uuid not null, event text not null check (event in ('created','updated','enabled','disabled','archived','tested','retried')),
  version integer not null, snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'), actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(), foreign key (workflow_definition_id, organization_id) references public.workflow_definitions(id, organization_id) on delete cascade
);
create table public.workflow_notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_step_id uuid not null, recipient_user_id uuid references auth.users(id), recipient_role_key text,
  title text not null, message text not null, status text not null default 'pending' check (status in ('pending','sent','failed')),
  created_at timestamptz not null default now(), unique (execution_step_id),
  foreign key (execution_step_id, organization_id) references public.workflow_execution_steps(id, organization_id) on delete cascade,
  check ((recipient_user_id is not null) <> (recipient_role_key is not null))
);
create table public.workflow_approval_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_step_id uuid not null, source_record_id uuid, approver_user_id uuid references auth.users(id), approver_role_key text,
  title text not null, message text, status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid not null references auth.users(id), decided_by uuid references auth.users(id), decided_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (execution_step_id),
  foreign key (execution_step_id, organization_id) references public.workflow_execution_steps(id, organization_id) on delete cascade,
  foreign key (source_record_id, organization_id) references public.object_records(id, organization_id) on delete restrict,
  check ((approver_user_id is not null) <> (approver_role_key is not null))
);
create table public.workflow_tasks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_step_id uuid not null, source_record_id uuid, title text not null, description text,
  assignee_user_id uuid references auth.users(id), branch_id uuid, due_at timestamptz,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (execution_step_id), foreign key (execution_step_id, organization_id) references public.workflow_execution_steps(id, organization_id) on delete cascade,
  foreign key (source_record_id, organization_id) references public.object_records(id, organization_id) on delete restrict,
  foreign key (branch_id, organization_id) references public.branches(id, organization_id) on delete restrict
);

create index workflow_executions_definition_created_idx on public.workflow_executions (organization_id, workflow_definition_id, created_at desc);
create index workflow_executions_retry_idx on public.workflow_executions (next_retry_at) where status = 'retrying';
create index workflow_steps_execution_idx on public.workflow_execution_steps (execution_id, position);
create index workflow_audit_definition_idx on public.workflow_audit_history (workflow_definition_id, created_at desc);
create trigger set_updated_at before update on public.workflow_executions for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.workflow_execution_steps for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.workflow_approval_requests for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.workflow_tasks for each row execute function private.set_updated_at();

alter table public.workflow_executions enable row level security;
alter table public.workflow_execution_steps enable row level security;
alter table public.workflow_audit_history enable row level security;
alter table public.workflow_notifications enable row level security;
alter table public.workflow_approval_requests enable row level security;
alter table public.workflow_tasks enable row level security;
create policy workflow_executions_read on public.workflow_executions for select to authenticated using (private.has_organization_permission(organization_id, 'workflow.read') or private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_steps_read on public.workflow_execution_steps for select to authenticated using (private.has_organization_permission(organization_id, 'workflow.read') or private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_audit_read on public.workflow_audit_history for select to authenticated using (private.has_organization_permission(organization_id, 'workflow.read') or private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_notifications_read on public.workflow_notifications for select to authenticated using (recipient_user_id = (select auth.uid()) or private.has_organization_permission(organization_id, 'workflow.read') or exists (select 1 from public.organization_memberships membership join public.membership_roles assignment on assignment.membership_id=membership.id join public.roles role on role.id=assignment.role_id where membership.organization_id=workflow_notifications.organization_id and membership.user_id=(select auth.uid()) and membership.status='active' and role.key=workflow_notifications.recipient_role_key));
create policy workflow_approvals_read on public.workflow_approval_requests for select to authenticated using (approver_user_id = (select auth.uid()) or private.has_organization_permission(organization_id, 'workflow.read') or exists (select 1 from public.organization_memberships membership join public.membership_roles assignment on assignment.membership_id=membership.id join public.roles role on role.id=assignment.role_id where membership.organization_id=workflow_approval_requests.organization_id and membership.user_id=(select auth.uid()) and membership.status='active' and role.key=workflow_approval_requests.approver_role_key));
create policy workflow_tasks_read on public.workflow_tasks for select to authenticated using (assignee_user_id = (select auth.uid()) or private.has_organization_permission(organization_id, 'workflow.read'));
create policy workflow_executions_write on public.workflow_executions for all to authenticated using (private.has_organization_permission(organization_id, 'workflow.manage')) with check (private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_steps_write on public.workflow_execution_steps for all to authenticated using (private.has_organization_permission(organization_id, 'workflow.manage')) with check (private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_notifications_write on public.workflow_notifications for all to authenticated using (private.has_organization_permission(organization_id, 'workflow.manage')) with check (private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_approvals_write on public.workflow_approval_requests for all to authenticated using (private.has_organization_permission(organization_id, 'workflow.manage')) with check (private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_tasks_write on public.workflow_tasks for all to authenticated using (private.has_organization_permission(organization_id, 'workflow.manage')) with check (private.has_organization_permission(organization_id, 'workflow.manage'));
create policy workflow_definitions_runtime_read on public.workflow_definitions for select to authenticated using (status = 'active' and (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update')));
create policy workflow_executions_runtime_write on public.workflow_executions for all to authenticated using (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update')) with check (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update'));
create policy workflow_steps_runtime_write on public.workflow_execution_steps for all to authenticated using (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update')) with check (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update'));
create policy workflow_notifications_runtime_write on public.workflow_notifications for all to authenticated using (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update')) with check (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update'));
create policy workflow_approvals_runtime_write on public.workflow_approval_requests for all to authenticated using (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update')) with check (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update'));
create policy workflow_tasks_runtime_write on public.workflow_tasks for all to authenticated using (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update')) with check (private.has_organization_permission(organization_id, 'record.create') or private.has_organization_permission(organization_id, 'record.update'));

create function private.workflow_values_are_valid(requested_values jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(requested_values) is distinct from 'object' or (select count(*) from jsonb_object_keys(requested_values)) > 50 then return false; end if;
  for item in select value from jsonb_each(requested_values) loop
    if jsonb_typeof(item) = 'object' and not (
      (item - array['sourceFieldKey']::text[] = '{}'::jsonb and item ? 'sourceFieldKey' and item ->> 'sourceFieldKey' ~ '^[a-z][a-z0-9_]{0,63}$')
      or (item - array['executionValue']::text[] = '{}'::jsonb and item ->> 'executionValue' in ('initiated_by','source_record_id','source_branch_id'))
    ) then return false; end if;
    if jsonb_typeof(item) not in ('string','number','boolean','null','array','object') then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create function private.workflow_approval_steps_are_valid(requested_steps jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; step_keys text[] := array[]::text[];
begin
  if jsonb_typeof(requested_steps) is distinct from 'array' or jsonb_array_length(requested_steps) not between 1 and 10 then return false; end if;
  for item in select value from jsonb_array_elements(requested_steps) loop
    if jsonb_typeof(item) <> 'object' or item - array['key','name','approverUserId','approverRoleKey']::text[] <> '{}'::jsonb
      or item->>'key' !~ '^[a-z][a-z0-9_]{0,63}$' or item->>'key'=any(step_keys)
      or ((item ? 'approverUserId') = (item ? 'approverRoleKey')) then return false; end if;
    step_keys := array_append(step_keys,item->>'key');
  end loop;
  return true;
exception when others then return false;
end; $$;

create function private.workflow_configuration_is_valid(requested_trigger jsonb, requested_conditions jsonb, requested_actions jsonb, requested_retry jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; action_type text; action_keys text[] := array[]::text[];
begin
  if jsonb_typeof(requested_trigger) is distinct from 'object' or not (requested_trigger ? 'type')
    or requested_trigger ->> 'type' not in ('record.created','record.updated','record.status_changed','schedule','manual') then return false; end if;
  if requested_trigger ->> 'type' in ('record.created','record.updated') and requested_trigger - array['type','objectDefinitionId']::text[] <> '{}'::jsonb then return false; end if;
  if requested_trigger ->> 'type' = 'record.status_changed' and requested_trigger - array['type','objectDefinitionId','fieldKey','from','to']::text[] <> '{}'::jsonb then return false; end if;
  if requested_trigger ->> 'type' = 'schedule' and (requested_trigger - array['type','cron','timezone']::text[] <> '{}'::jsonb or requested_trigger ->> 'cron' !~ '^(\S+\s+){4}\S+$') then return false; end if;
  if requested_trigger ->> 'type' = 'manual' and requested_trigger - array['type','objectDefinitionId']::text[] <> '{}'::jsonb then return false; end if;
  if jsonb_typeof(requested_conditions) is distinct from 'object' or requested_conditions - array['logic','conditions']::text[] <> '{}'::jsonb
    or requested_conditions ->> 'logic' not in ('all','any') or jsonb_typeof(requested_conditions -> 'conditions') is distinct from 'array'
    or jsonb_array_length(requested_conditions -> 'conditions') > 25 then return false; end if;
  for item in select value from jsonb_array_elements(requested_conditions -> 'conditions') loop
    if item - array['fieldKey','operator','value']::text[] <> '{}'::jsonb or item ->> 'operator' not in ('equals','not_equals','greater_than','less_than','contains','is_empty','not_empty')
      or ((item ->> 'operator' in ('is_empty','not_empty')) = (item ? 'value')) then return false; end if;
  end loop;
  if jsonb_typeof(requested_actions) is distinct from 'array' or jsonb_array_length(requested_actions) not between 1 and 50 then return false; end if;
  for item in select value from jsonb_array_elements(requested_actions) loop
    action_type := item ->> 'type';
    if item ->> 'key' !~ '^[a-z][a-z0-9_]{0,63}$' or item ->> 'key' = any(action_keys)
      or action_type not in ('update_record','create_record','send_notification','request_approval','assign_user','assign_branch','change_status','create_task')
      or not (item ?& array['key','name','type','continueOnFailure']) then return false; end if;
    if action_type = 'update_record' and item - array['key','name','type','continueOnFailure','values']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'create_record' and item - array['key','name','type','continueOnFailure','objectDefinitionId','branchId','values']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'send_notification' and item - array['key','name','type','continueOnFailure','recipientUserId','recipientRoleKey','title','message']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'request_approval' and item - array['key','name','type','continueOnFailure','category','approvalSteps','approverUserId','approverRoleKey','title','message']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'assign_user' and item - array['key','name','type','continueOnFailure','fieldKey','userId']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'assign_branch' and item - array['key','name','type','continueOnFailure','branchId']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'change_status' and item - array['key','name','type','continueOnFailure','fieldKey','status']::text[] <> '{}'::jsonb then return false; end if;
    if action_type = 'create_task' and item - array['key','name','type','continueOnFailure','title','description','assigneeUserId','branchId','dueInDays']::text[] <> '{}'::jsonb then return false; end if;
    if action_type in ('update_record','create_record') and not private.workflow_values_are_valid(item -> 'values') then return false; end if;
    if action_type = 'send_notification' and ((item ? 'recipientUserId') = (item ? 'recipientRoleKey')) then return false; end if;
    if action_type = 'request_approval' and (
      (item ? 'approvalSteps' and ((item ? 'approverUserId') or (item ? 'approverRoleKey') or not private.workflow_approval_steps_are_valid(item->'approvalSteps')))
      or (not (item ? 'approvalSteps') and ((item ? 'approverUserId') = (item ? 'approverRoleKey')))
      or (item ? 'category' and item->>'category' not in ('discount','expense','purchase','refund','inventory_adjustment','custom'))
    ) then return false; end if;
    action_keys := array_append(action_keys, item ->> 'key');
  end loop;
  return jsonb_typeof(requested_retry) = 'object' and requested_retry - array['maxAttempts','backoffSeconds']::text[] = '{}'::jsonb
    and (requested_retry ->> 'maxAttempts')::integer between 1 and 5 and (requested_retry ->> 'backoffSeconds')::integer between 0 and 86400;
exception when others then return false;
end;
$$;

create function private.save_workflow_definition(requested_organization_id uuid, requested_key text, requested_name text, requested_description text,
  requested_trigger jsonb, requested_conditions jsonb, requested_actions jsonb, requested_retry_policy jsonb, requested_status text, requested_workflow_definition_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_id uuid := coalesce(requested_workflow_definition_id, gen_random_uuid()); target_version integer; audit_event text; previous_status text;
begin
  if (select auth.uid()) is null or not private.can_business_permission(requested_organization_id, 'workflow.manage', null) then raise exception 'Permission denied.' using errcode='42501'; end if;
  if requested_key !~ '^[a-z][a-z0-9_]{0,63}$' or char_length(btrim(requested_name)) not between 1 and 120 or char_length(coalesce(requested_description,'')) > 500
    or requested_status not in ('draft','active','disabled') or not private.workflow_configuration_is_valid(requested_trigger, requested_conditions, requested_actions, requested_retry_policy)
  then raise exception 'Invalid workflow definition.' using errcode='22023'; end if;
  if requested_workflow_definition_id is null then target_version := 1; audit_event := 'created';
  else select version + 1,status into target_version,previous_status from public.workflow_definitions where id = target_id and organization_id = requested_organization_id and key = requested_key and status <> 'archived' for update;
    if not found then raise exception 'Workflow definition not found.' using errcode='22023'; end if;
    audit_event := case when previous_status <> requested_status and requested_status = 'active' then 'enabled' when previous_status <> requested_status and requested_status = 'disabled' then 'disabled' else 'updated' end; end if;
  insert into public.workflow_definitions (id,organization_id,key,name,description,trigger_config,conditions,steps,retry_policy,version,status,created_by,updated_by,disabled_at)
  values (target_id,requested_organization_id,requested_key,btrim(requested_name),nullif(btrim(requested_description),''),requested_trigger,requested_conditions,requested_actions,requested_retry_policy,target_version,requested_status,(select auth.uid()),(select auth.uid()),case when requested_status='disabled' then now() end)
  on conflict (id) do update set name=excluded.name,description=excluded.description,trigger_config=excluded.trigger_config,conditions=excluded.conditions,steps=excluded.steps,retry_policy=excluded.retry_policy,version=excluded.version,status=excluded.status,updated_by=(select auth.uid()),disabled_at=case when excluded.status='disabled' then coalesce(public.workflow_definitions.disabled_at,now()) else null end;
  insert into public.workflow_audit_history (organization_id,workflow_definition_id,event,version,snapshot,actor_id)
  select requested_organization_id,target_id,audit_event,target_version,to_jsonb(definition) - 'organization_id',(select auth.uid()) from public.workflow_definitions definition where definition.id=target_id;
  return target_id;
end;
$$;

create function public.save_workflow_definition(requested_organization_id uuid, requested_key text, requested_name text, requested_description text,
  requested_trigger jsonb, requested_conditions jsonb, requested_actions jsonb, requested_retry_policy jsonb, requested_status text, requested_workflow_definition_id uuid default null)
returns uuid language sql security definer set search_path='' as $$ select private.save_workflow_definition(requested_organization_id,requested_key,requested_name,requested_description,requested_trigger,requested_conditions,requested_actions,requested_retry_policy,requested_status,requested_workflow_definition_id); $$;

create function private.record_workflow_audit_event(requested_organization_id uuid, requested_workflow_definition_id uuid, requested_event text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or requested_event not in ('tested','retried') or not private.can_business_permission(requested_organization_id,'workflow.manage',null) then raise exception 'Permission denied.' using errcode='42501'; end if;
  insert into public.workflow_audit_history (organization_id,workflow_definition_id,event,version,snapshot,actor_id)
  select requested_organization_id,definition.id,requested_event,definition.version,to_jsonb(definition)-'organization_id',(select auth.uid()) from public.workflow_definitions definition where definition.id=requested_workflow_definition_id and definition.organization_id=requested_organization_id;
  if not found then raise exception 'Workflow definition not found.' using errcode='22023'; end if;
end;
$$;
create function public.record_workflow_audit_event(requested_organization_id uuid, requested_workflow_definition_id uuid, requested_event text)
returns void language sql security definer set search_path='' as $$ select private.record_workflow_audit_event(requested_organization_id,requested_workflow_definition_id,requested_event); $$;

revoke all on table public.workflow_definitions,public.workflow_executions,public.workflow_execution_steps,public.workflow_audit_history,public.workflow_notifications,public.workflow_approval_requests,public.workflow_tasks from public,anon,authenticated;
grant select on table public.workflow_definitions,public.workflow_executions,public.workflow_execution_steps,public.workflow_audit_history,public.workflow_notifications,public.workflow_approval_requests,public.workflow_tasks to authenticated;
grant insert,update on table public.workflow_executions,public.workflow_execution_steps,public.workflow_notifications,public.workflow_approval_requests,public.workflow_tasks to authenticated;
revoke all on function private.workflow_values_are_valid(jsonb),private.workflow_approval_steps_are_valid(jsonb),private.workflow_configuration_is_valid(jsonb,jsonb,jsonb,jsonb),private.save_workflow_definition(uuid,text,text,text,jsonb,jsonb,jsonb,jsonb,text,uuid),private.record_workflow_audit_event(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.save_workflow_definition(uuid,text,text,text,jsonb,jsonb,jsonb,jsonb,text,uuid) from public,anon;
grant execute on function public.save_workflow_definition(uuid,text,text,text,jsonb,jsonb,jsonb,jsonb,text,uuid) to authenticated;
revoke all on function public.record_workflow_audit_event(uuid,uuid,text) from public,anon;
grant execute on function public.record_workflow_audit_event(uuid,uuid,text) to authenticated;

comment on table public.workflow_definitions is 'Versioned declarative Trigger/Conditions/Actions metadata. No executable code is accepted.';
comment on table public.workflow_executions is 'Idempotent workflow run history with retry and terminal failure state.';
