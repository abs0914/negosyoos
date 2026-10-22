-- Module 10: reusable, sequential business approvals with an immutable audit trail.

drop policy workflow_approvals_read on public.workflow_approval_requests;
drop policy workflow_approvals_write on public.workflow_approval_requests;
drop policy workflow_approvals_runtime_write on public.workflow_approval_requests;

alter table public.workflow_approval_requests rename to approval_requests;
alter table public.approval_requests rename column execution_step_id to workflow_execution_step_id;
alter table public.approval_requests rename column message to description;
alter table public.approval_requests rename column requested_by to requester_id;
alter table public.approval_requests alter column workflow_execution_step_id drop not null;
alter table public.approval_requests add column category text not null default 'custom'
  check (category in ('discount','expense','purchase','refund','inventory_adjustment','custom'));
alter table public.approval_requests add column source_object_definition_id uuid;
alter table public.approval_requests add column current_step_position integer not null default 0 check (current_step_position between 0 and 9);
alter table public.approval_requests add column total_steps integer not null default 1 check (total_steps between 1 and 10);
alter table public.approval_requests add column completed_at timestamptz;
alter table public.approval_requests add column cancelled_by uuid references auth.users(id);
alter table public.approval_requests add column cancellation_reason text check (char_length(cancellation_reason) <= 500);
alter table public.approval_requests add constraint approval_title_length_check check (char_length(btrim(title)) between 1 and 160);
alter table public.approval_requests add constraint approval_description_length_check check (char_length(description) <= 2000);
alter table public.approval_requests add constraint approval_requests_id_organization_unique unique (id, organization_id);
update public.approval_requests request set source_object_definition_id = record.object_definition_id
from public.object_records record where record.id = request.source_record_id and record.organization_id = request.organization_id;
alter table public.approval_requests add foreign key (source_object_definition_id, organization_id)
  references public.object_definitions(id, organization_id) on delete restrict;

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, approval_request_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,63}$'), name text not null check (char_length(btrim(name)) between 1 and 120),
  position integer not null check (position between 0 and 9), approver_type text not null check (approver_type in ('user','role')),
  approver_user_id uuid references auth.users(id), approver_role_key text,
  status text not null default 'waiting' check (status in ('waiting','pending','approved','rejected','cancelled')),
  activated_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), unique (approval_request_id, position), unique (approval_request_id, key),
  foreign key (approval_request_id, organization_id) references public.approval_requests(id, organization_id) on delete cascade,
  check ((approver_type = 'user' and approver_user_id is not null and approver_role_key is null)
    or (approver_type = 'role' and approver_user_id is null and approver_role_key is not null))
);

insert into public.approval_steps (organization_id,approval_request_id,key,name,position,approver_type,approver_user_id,approver_role_key,status,activated_at,completed_at)
select organization_id,id,'approval','Approval',0,case when approver_user_id is not null then 'user' else 'role' end,
  approver_user_id,approver_role_key,status,created_at,decided_at
from public.approval_requests;

create table public.approval_decisions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, approval_request_id uuid not null, approval_step_id uuid not null,
  decision text not null check (decision in ('approved','rejected')), comment text check (char_length(comment) <= 2000),
  decided_by uuid not null references auth.users(id), decided_at timestamptz not null default now(),
  unique (approval_step_id), foreign key (approval_request_id, organization_id) references public.approval_requests(id, organization_id) on delete cascade,
  foreign key (approval_step_id, organization_id) references public.approval_steps(id, organization_id) on delete restrict
);
insert into public.approval_decisions (organization_id,approval_request_id,approval_step_id,decision,decided_by,decided_at)
select request.organization_id,request.id,step.id,request.status,request.decided_by,request.decided_at
from public.approval_requests request join public.approval_steps step on step.approval_request_id=request.id
where request.status in ('approved','rejected') and request.decided_by is not null and request.decided_at is not null;

alter table public.approval_requests drop constraint workflow_approval_requests_check;
alter table public.approval_requests drop column approver_user_id, drop column approver_role_key, drop column decided_by, drop column decided_at;

create table public.approval_audit_history (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, approval_request_id uuid not null, approval_step_id uuid,
  event text not null check (event in ('requested','step_activated','step_approved','approved','rejected','cancelled')),
  actor_id uuid not null references auth.users(id), details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'), created_at timestamptz not null default now(),
  foreign key (approval_request_id, organization_id) references public.approval_requests(id, organization_id) on delete cascade,
  foreign key (approval_step_id, organization_id) references public.approval_steps(id, organization_id) on delete restrict
);

insert into public.approval_audit_history (organization_id,approval_request_id,approval_step_id,event,actor_id,details,created_at)
select request.organization_id,request.id,step.id,'requested',request.requester_id,jsonb_build_object('migrated',true),request.created_at
from public.approval_requests request join public.approval_steps step on step.approval_request_id=request.id;
insert into public.approval_audit_history (organization_id,approval_request_id,approval_step_id,event,actor_id,details,created_at)
select decision.organization_id,decision.approval_request_id,decision.approval_step_id,
  case when decision.decision='approved' then 'approved' else 'rejected' end,decision.decided_by,jsonb_build_object('migrated',true),decision.decided_at
from public.approval_decisions decision;

create index approval_requests_inbox_idx on public.approval_requests (organization_id,status,created_at desc);
create index approval_steps_routing_idx on public.approval_steps (organization_id,status,approver_user_id,approver_role_key);
create index approval_audit_request_idx on public.approval_audit_history (approval_request_id,created_at);
create trigger set_updated_at before update on public.approval_steps for each row execute function private.set_updated_at();

insert into public.permissions (key,domain,action,description) values
  ('approval.read','approval','read','View approval requests available to the member'),
  ('approval.request','approval','request','Create business approval requests'),
  ('approval.decide','approval','decide','Approve or reject assigned approval steps'),
  ('approval.manage','approval','manage','View, decide, and cancel any Business approval')
on conflict (key) do update set domain=excluded.domain,action=excluded.action,description=excluded.description;

create function private.install_approval_permissions(requested_organization_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.role_permissions (role_id,permission_id)
  select role.id,permission.id from public.roles role cross join public.permissions permission
  where role.organization_id=requested_organization_id and role.key in ('owner','administrator') and permission.key like 'approval.%'
  on conflict do nothing;
  insert into public.role_permissions (role_id,permission_id)
  select role.id,permission.id from public.roles role join public.permissions permission on permission.key=any(
    case role.key when 'manager' then array['approval.read','approval.request','approval.decide']
      when 'cashier' then array['approval.read','approval.request'] when 'staff' then array['approval.read','approval.request']
      when 'viewer' then array['approval.read'] else array[]::text[] end)
  where role.organization_id=requested_organization_id and role.key in ('manager','cashier','staff','viewer') on conflict do nothing;
end; $$;
create function private.handle_main_branch_approval_permissions() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.code='main' then perform private.install_approval_permissions(new.organization_id); end if; return new; end; $$;
create trigger zz_install_approval_permissions_on_main_branch after insert on public.branches
  for each row execute function private.handle_main_branch_approval_permissions();
select private.install_approval_permissions(id) from public.organizations;

create function private.can_read_approval(requested_organization_id uuid, requested_approval_request_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.can_business_permission(requested_organization_id,'approval.manage',null)
    or private.can_business_permission(requested_organization_id,'approval.read',null)
    or exists (select 1 from public.approval_requests request where request.id=requested_approval_request_id and request.organization_id=requested_organization_id and request.requester_id=(select auth.uid()))
    or exists (select 1 from public.approval_steps step where step.approval_request_id=requested_approval_request_id and step.organization_id=requested_organization_id
      and (step.approver_user_id=(select auth.uid()) or exists (
        select 1 from public.organization_memberships membership join public.membership_roles membership_role on membership_role.membership_id=membership.id
        join public.roles role on role.id=membership_role.role_id where membership.organization_id=requested_organization_id
          and membership.user_id=(select auth.uid()) and membership.status='active' and role.key=step.approver_role_key)));
$$;

create function private.create_approval_request(requested_organization_id uuid, requested_category text, requested_title text, requested_description text,
  requested_source_object_definition_id uuid, requested_source_record_id uuid, requested_workflow_execution_step_id uuid, requested_steps jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_id uuid; item jsonb; item_position integer := 0; actor uuid := (select auth.uid());
begin
  if actor is null or not (private.can_business_permission(requested_organization_id,'approval.request',null) or private.can_business_permission(requested_organization_id,'workflow.manage',null)
    or (requested_workflow_execution_step_id is not null and (private.can_business_permission(requested_organization_id,'record.create',null) or private.can_business_permission(requested_organization_id,'record.update',null))
      and exists(select 1 from public.workflow_execution_steps step join public.workflow_executions execution on execution.id=step.execution_id and execution.organization_id=step.organization_id
        where step.id=requested_workflow_execution_step_id and step.organization_id=requested_organization_id and step.action_type='request_approval' and execution.initiated_by=actor)))
    then raise exception 'Permission denied.' using errcode='42501'; end if;
  if requested_workflow_execution_step_id is not null then
    select id into target_id from public.approval_requests where organization_id=requested_organization_id and workflow_execution_step_id=requested_workflow_execution_step_id;
    if found then return target_id; end if;
  end if;
  if requested_category not in ('discount','expense','purchase','refund','inventory_adjustment','custom')
    or char_length(btrim(requested_title)) not between 1 and 160 or char_length(coalesce(requested_description,'')) > 2000
    or jsonb_typeof(requested_steps) is distinct from 'array' or jsonb_array_length(requested_steps) not between 1 and 10
    or (requested_source_record_id is not null and requested_source_object_definition_id is null)
    then raise exception 'Invalid approval request.' using errcode='22023'; end if;
  if requested_source_object_definition_id is not null and not exists(select 1 from public.object_definitions where id=requested_source_object_definition_id and organization_id=requested_organization_id and status='active') then raise exception 'Source object not found.' using errcode='22023'; end if;
  if requested_source_record_id is not null and not exists(select 1 from public.object_records where id=requested_source_record_id and object_definition_id=requested_source_object_definition_id and organization_id=requested_organization_id) then raise exception 'Source record not found.' using errcode='22023'; end if;
  if requested_workflow_execution_step_id is not null and not exists(select 1 from public.workflow_execution_steps where id=requested_workflow_execution_step_id and organization_id=requested_organization_id) then raise exception 'Workflow step not found.' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(requested_steps) loop
    if jsonb_typeof(item) <> 'object' or item - array['key','name','approverUserId','approverRoleKey']::text[] <> '{}'::jsonb
      or item->>'key' !~ '^[a-z][a-z0-9_]{0,63}$' or char_length(btrim(item->>'name')) not between 1 and 120
      or ((item ? 'approverUserId') = (item ? 'approverRoleKey')) then raise exception 'Invalid approval step.' using errcode='22023'; end if;
    if item ? 'approverUserId' and not exists(select 1 from public.organization_memberships where organization_id=requested_organization_id and user_id=(item->>'approverUserId')::uuid and status='active') then raise exception 'Approver is not an active member.' using errcode='22023'; end if;
    if item ? 'approverRoleKey' and not exists(select 1 from public.roles where organization_id=requested_organization_id and key=item->>'approverRoleKey') then raise exception 'Approver role was not found.' using errcode='22023'; end if;
  end loop;
  if (select count(distinct value->>'key') from jsonb_array_elements(requested_steps)) <> jsonb_array_length(requested_steps) then raise exception 'Approval step keys must be unique.' using errcode='22023'; end if;
  insert into public.approval_requests (organization_id,category,title,description,source_object_definition_id,source_record_id,workflow_execution_step_id,requester_id,total_steps)
  values (requested_organization_id,requested_category,btrim(requested_title),nullif(btrim(requested_description),''),requested_source_object_definition_id,requested_source_record_id,requested_workflow_execution_step_id,actor,jsonb_array_length(requested_steps)) returning id into target_id;
  for item in select value from jsonb_array_elements(requested_steps) loop
    insert into public.approval_steps (organization_id,approval_request_id,key,name,position,approver_type,approver_user_id,approver_role_key,status,activated_at)
    values (requested_organization_id,target_id,item->>'key',btrim(item->>'name'),item_position,case when item ? 'approverUserId' then 'user' else 'role' end,
      case when item ? 'approverUserId' then (item->>'approverUserId')::uuid end,item->>'approverRoleKey',case when item_position=0 then 'pending' else 'waiting' end,case when item_position=0 then now() end);
    item_position := item_position + 1;
  end loop;
  insert into public.approval_audit_history (organization_id,approval_request_id,event,actor_id,details) values
    (requested_organization_id,target_id,'requested',actor,jsonb_build_object('category',requested_category,'totalSteps',jsonb_array_length(requested_steps))),
    (requested_organization_id,target_id,'step_activated',actor,jsonb_build_object('position',0));
  return target_id;
exception when unique_violation then
  if requested_workflow_execution_step_id is not null then select id into target_id from public.approval_requests where organization_id=requested_organization_id and workflow_execution_step_id=requested_workflow_execution_step_id; if found then return target_id; end if; end if;
  raise;
end; $$;

create function private.decide_approval(requested_organization_id uuid, requested_approval_request_id uuid, requested_approval_step_id uuid, requested_decision text, requested_comment text)
returns void language plpgsql security definer set search_path='' as $$
declare request_row public.approval_requests%rowtype; step_row public.approval_steps%rowtype; actor uuid := (select auth.uid()); next_step_id uuid;
begin
  select * into request_row from public.approval_requests where id=requested_approval_request_id and organization_id=requested_organization_id for update;
  select * into step_row from public.approval_steps where id=requested_approval_step_id and approval_request_id=requested_approval_request_id and organization_id=requested_organization_id for update;
  if actor is null then raise exception 'Permission denied.' using errcode='42501'; end if;
  if request_row.id is null or step_row.id is null then raise exception 'Approval step not found.' using errcode='22023'; end if;
  if request_row.status <> 'pending' or step_row.status <> 'pending' or step_row.position <> request_row.current_step_position then raise exception 'Approval step is no longer pending.' using errcode='P0001'; end if;
  if requested_decision not in ('approved','rejected') or char_length(coalesce(requested_comment,'')) > 2000 then raise exception 'Invalid approval decision.' using errcode='22023'; end if;
  if not private.can_business_permission(requested_organization_id,'approval.manage',null) and not (
    private.can_business_permission(requested_organization_id,'approval.decide',null) and (step_row.approver_user_id=actor or exists(
      select 1 from public.organization_memberships membership join public.membership_roles membership_role on membership_role.membership_id=membership.id join public.roles role on role.id=membership_role.role_id
      where membership.organization_id=requested_organization_id and membership.user_id=actor and membership.status='active' and role.key=step_row.approver_role_key)))
    then raise exception 'Permission denied.' using errcode='42501'; end if;
  insert into public.approval_decisions (organization_id,approval_request_id,approval_step_id,decision,comment,decided_by)
  values (requested_organization_id,request_row.id,step_row.id,requested_decision,nullif(btrim(requested_comment),''),actor);
  update public.approval_steps set status=requested_decision,completed_at=now() where id=step_row.id;
  if requested_decision='rejected' then
    update public.approval_requests set status='rejected',completed_at=now() where id=request_row.id;
    update public.approval_steps set status='cancelled',completed_at=now() where approval_request_id=request_row.id and status='waiting';
    insert into public.approval_audit_history (organization_id,approval_request_id,approval_step_id,event,actor_id,details)
      values (requested_organization_id,request_row.id,step_row.id,'rejected',actor,jsonb_build_object('comment',coalesce(requested_comment,'')));
  elsif step_row.position + 1 >= request_row.total_steps then
    update public.approval_requests set status='approved',completed_at=now() where id=request_row.id;
    insert into public.approval_audit_history (organization_id,approval_request_id,approval_step_id,event,actor_id,details) values
      (requested_organization_id,request_row.id,step_row.id,'step_approved',actor,jsonb_build_object('position',step_row.position)),
      (requested_organization_id,request_row.id,step_row.id,'approved',actor,'{}'::jsonb);
  else
    update public.approval_requests set current_step_position=current_step_position+1 where id=request_row.id;
    update public.approval_steps set status='pending',activated_at=now() where approval_request_id=request_row.id and position=step_row.position+1 returning id into next_step_id;
    insert into public.approval_audit_history (organization_id,approval_request_id,approval_step_id,event,actor_id,details) values
      (requested_organization_id,request_row.id,step_row.id,'step_approved',actor,jsonb_build_object('position',step_row.position)),
      (requested_organization_id,request_row.id,next_step_id,'step_activated',actor,jsonb_build_object('position',step_row.position+1));
  end if;
end; $$;

create function private.cancel_approval(requested_organization_id uuid, requested_approval_request_id uuid, requested_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare request_row public.approval_requests%rowtype; actor uuid := (select auth.uid());
begin
  select * into request_row from public.approval_requests where id=requested_approval_request_id and organization_id=requested_organization_id for update;
  if actor is null or request_row.id is null then raise exception 'Approval request not found.' using errcode='22023'; end if;
  if request_row.status <> 'pending' then raise exception 'Only pending approvals can be cancelled.' using errcode='P0001'; end if;
  if actor <> request_row.requester_id and not private.can_business_permission(requested_organization_id,'approval.manage',null) then raise exception 'Permission denied.' using errcode='42501'; end if;
  if char_length(btrim(requested_reason)) not between 1 and 500 then raise exception 'A cancellation reason is required.' using errcode='22023'; end if;
  update public.approval_requests set status='cancelled',completed_at=now(),cancelled_by=actor,cancellation_reason=btrim(requested_reason) where id=request_row.id;
  update public.approval_steps set status='cancelled',completed_at=now() where approval_request_id=request_row.id and status in ('waiting','pending');
  insert into public.approval_audit_history (organization_id,approval_request_id,event,actor_id,details)
    values (requested_organization_id,request_row.id,'cancelled',actor,jsonb_build_object('reason',btrim(requested_reason)));
end; $$;

create function public.create_approval_request(requested_organization_id uuid, requested_category text, requested_title text, requested_description text,
  requested_source_object_definition_id uuid, requested_source_record_id uuid, requested_workflow_execution_step_id uuid, requested_steps jsonb)
returns uuid language sql security definer set search_path='' as $$ select private.create_approval_request(requested_organization_id,requested_category,requested_title,requested_description,requested_source_object_definition_id,requested_source_record_id,requested_workflow_execution_step_id,requested_steps); $$;
create function public.decide_approval(requested_organization_id uuid, requested_approval_request_id uuid, requested_approval_step_id uuid, requested_decision text, requested_comment text)
returns void language sql security definer set search_path='' as $$ select private.decide_approval(requested_organization_id,requested_approval_request_id,requested_approval_step_id,requested_decision,requested_comment); $$;
create function public.cancel_approval(requested_organization_id uuid, requested_approval_request_id uuid, requested_reason text)
returns void language sql security definer set search_path='' as $$ select private.cancel_approval(requested_organization_id,requested_approval_request_id,requested_reason); $$;

alter table public.approval_steps enable row level security;
alter table public.approval_decisions enable row level security;
alter table public.approval_audit_history enable row level security;
create policy approval_requests_read on public.approval_requests for select to authenticated using (private.can_read_approval(organization_id,id));
create policy approval_steps_read on public.approval_steps for select to authenticated using (private.can_read_approval(organization_id,approval_request_id));
create policy approval_decisions_read on public.approval_decisions for select to authenticated using (private.can_read_approval(organization_id,approval_request_id));
create policy approval_audit_read on public.approval_audit_history for select to authenticated using (private.can_read_approval(organization_id,approval_request_id));

revoke all on table public.approval_requests,public.approval_steps,public.approval_decisions,public.approval_audit_history from public,anon,authenticated;
grant select on table public.approval_requests,public.approval_steps,public.approval_decisions,public.approval_audit_history to authenticated;
revoke all on function private.install_approval_permissions(uuid),private.handle_main_branch_approval_permissions(),private.can_read_approval(uuid,uuid),
  private.create_approval_request(uuid,text,text,text,uuid,uuid,uuid,jsonb),private.decide_approval(uuid,uuid,uuid,text,text),private.cancel_approval(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.can_read_approval(uuid,uuid) to authenticated;
revoke all on function public.create_approval_request(uuid,text,text,text,uuid,uuid,uuid,jsonb),public.decide_approval(uuid,uuid,uuid,text,text),public.cancel_approval(uuid,uuid,text) from public,anon;
grant execute on function public.create_approval_request(uuid,text,text,text,uuid,uuid,uuid,jsonb),public.decide_approval(uuid,uuid,uuid,text,text),public.cancel_approval(uuid,uuid,text) to authenticated;

comment on table public.approval_requests is 'Reusable approval aggregate linked optionally to an object record and workflow step.';
comment on table public.approval_steps is 'Ordered user- or role-routed approval steps; only one step is active at a time.';
comment on table public.approval_decisions is 'Immutable terminal decision for an approval step.';
comment on table public.approval_audit_history is 'Immutable audit history for every approval state-changing action.';
