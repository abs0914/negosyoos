insert into public.permissions(key,domain,action,description)values
('audit.read','audit','read','View the immutable, business-wide audit trail.')
on conflict(key)do update set domain=excluded.domain,action=excluded.action,description=excluded.description;

create function private.install_audit_permissions(requested_organization_id uuid)returns void
language plpgsql security definer set search_path='' as $$
begin
  insert into public.role_permissions(role_id,permission_id)
  select role.id,permission.id
  from public.roles role cross join public.permissions permission
  where role.organization_id=requested_organization_id
    and role.key in('owner','administrator')
    and permission.key='audit.read'
  on conflict do nothing;
end$$;

create function private.handle_main_branch_audit_permissions()returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.code='main'then perform private.install_audit_permissions(new.organization_id);end if;
  return new;
end$$;

create trigger zzzzzzzzzzzz_install_audit_permissions_on_main_branch
after insert on public.branches for each row execute function private.handle_main_branch_audit_permissions();
select private.install_audit_permissions(id)from public.organizations;

create table public.audit_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id)on delete cascade,
  branch_id uuid,
  actor_user_id uuid references auth.users(id)on delete set null,
  action text not null check(action~'^[a-z][a-z0-9_.-]{0,99}$'),
  entity_type text not null check(entity_type~'^[a-z][a-z0-9_.-]{0,99}$'),
  entity_id text check(entity_id is null or char_length(entity_id)between 1 and 200),
  before_data jsonb check(before_data is null or jsonb_typeof(before_data)='object'),
  after_data jsonb check(after_data is null or jsonb_typeof(after_data)='object'),
  ip_metadata jsonb not null default'{}'::jsonb check(jsonb_typeof(ip_metadata)='object'),
  source text not null check(source in('user','ai','workflow','system','api')),
  occurred_at timestamptz not null default clock_timestamp(),
  foreign key(branch_id,organization_id)references public.branches(id,organization_id)on delete set null(branch_id)
);
create index audit_events_business_time_idx on public.audit_events(organization_id,occurred_at desc,id desc);
create index audit_events_business_source_idx on public.audit_events(organization_id,source,occurred_at desc);
create index audit_events_business_entity_idx on public.audit_events(organization_id,entity_type,entity_id,occurred_at desc);
create index audit_events_business_actor_idx on public.audit_events(organization_id,actor_user_id,occurred_at desc)where actor_user_id is not null;
create index audit_events_business_branch_idx on public.audit_events(organization_id,branch_id,occurred_at desc)where branch_id is not null;

create function private.sanitize_audit_json(value jsonb)returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb;item record;
begin
  if value is null then return null;end if;
  if jsonb_typeof(value)='object'then
    result='{}'::jsonb;
    for item in select key,val from jsonb_each(value)e(key,val)loop
      result=result||jsonb_build_object(item.key,
        case when lower(item.key)~'(^|_)(password|passcode|pin|secret|token|api_?key|authorization|cookie|session|private_?key|card_?number|cvv|cvc|bank_?account|account_?number|routing_?number)($|_)'
          then to_jsonb('[REDACTED]'::text)
          else private.sanitize_audit_json(item.val)end);
    end loop;
    return result;
  elsif jsonb_typeof(value)='array'then
    select coalesce(jsonb_agg(private.sanitize_audit_json(element)),'[]'::jsonb)into result
    from jsonb_array_elements(value)element;
    return result;
  end if;
  return value;
end$$;

create function private.audit_request_metadata()returns jsonb
language plpgsql stable set search_path='' as $$
declare headers jsonb:='{}'::jsonb;raw_headers text;ip text;agent text;request_id text;
begin
  raw_headers=current_setting('request.headers',true);
  if coalesce(raw_headers,'')<>''then
    begin headers=raw_headers::jsonb;exception when others then headers='{}'::jsonb;end;
  end if;
  ip=coalesce(nullif(headers->>'cf-connecting-ip',''),nullif(split_part(headers->>'x-forwarded-for',',',1),''),nullif(headers->>'x-real-ip',''));
  agent=nullif(left(headers->>'user-agent',500),'');
  request_id=coalesce(nullif(headers->>'x-request-id',''),nullif(headers->>'sb-request-id',''));
  return jsonb_strip_nulls(jsonb_build_object('ipAddress',ip,'userAgent',agent,'requestId',request_id));
end$$;

create function private.write_audit_event(
  requested_organization_id uuid,requested_branch_id uuid,requested_actor_user_id uuid,
  requested_action text,requested_entity_type text,requested_entity_id text,
  requested_before jsonb,requested_after jsonb,requested_source text,
  requested_ip_metadata jsonb default null
)returns uuid language plpgsql security definer set search_path='' as $$
declare target_id uuid:=gen_random_uuid();sanitized_before jsonb;sanitized_after jsonb;sanitized_ip jsonb;
begin
  if requested_action!~'^[a-z][a-z0-9_.-]{0,99}$'
    or requested_entity_type!~'^[a-z][a-z0-9_.-]{0,99}$'
    or requested_source not in('user','ai','workflow','system','api')
    or(requested_entity_id is not null and char_length(requested_entity_id)not between 1 and 200)
    or(requested_before is not null and jsonb_typeof(requested_before)<>'object')
    or(requested_after is not null and jsonb_typeof(requested_after)<>'object')then
    raise exception'Invalid audit event.'using errcode='22023';
  end if;
  if not exists(select 1 from public.organizations where id=requested_organization_id)
    or(requested_branch_id is not null and not exists(select 1 from public.branches where id=requested_branch_id and organization_id=requested_organization_id))then
    raise exception'Invalid audit scope.'using errcode='22023';
  end if;
  sanitized_before=private.sanitize_audit_json(requested_before);
  sanitized_after=private.sanitize_audit_json(requested_after);
  sanitized_ip=private.sanitize_audit_json(coalesce(requested_ip_metadata,private.audit_request_metadata()));
  if octet_length(coalesce(sanitized_before,'{}'::jsonb)::text)>262144
    or octet_length(coalesce(sanitized_after,'{}'::jsonb)::text)>262144
    or octet_length(sanitized_ip::text)>8192 then
    raise exception'Audit payload is too large.'using errcode='22023';
  end if;
  insert into public.audit_events(id,organization_id,branch_id,actor_user_id,action,entity_type,entity_id,before_data,after_data,ip_metadata,source)
  values(target_id,requested_organization_id,requested_branch_id,requested_actor_user_id,requested_action,requested_entity_type,requested_entity_id,sanitized_before,sanitized_after,sanitized_ip,requested_source);
  return target_id;
end$$;

create function private.audit_source_for_table(table_name text,row_data jsonb)returns text
language sql stable set search_path='' as $$
  select case
    when table_name like'ai\_%'escape'\'or table_name in('configuration_proposals','configuration_versions')and lower(coalesce(row_data->>'source',''))='ai'then'ai'
    when table_name in('workflow_executions','workflow_execution_steps','workflow_notifications','workflow_approval_requests','workflow_tasks')then'workflow'
    when(select auth.uid())is not null then'user'
    else'system'end;
$$;

create function private.capture_business_audit_event()returns trigger
language plpgsql security definer set search_path='' as $$
declare old_row jsonb;new_row jsonb;scope_row jsonb;business_id uuid;branch uuid;actor uuid;event_action text;record_id text;event_source text;
begin
  old_row=case when tg_op in('UPDATE','DELETE')then to_jsonb(old)else null end;
  new_row=case when tg_op in('INSERT','UPDATE')then to_jsonb(new)else null end;
  scope_row=coalesce(new_row,old_row);
  business_id=(scope_row->>'organization_id')::uuid;
  branch=nullif(scope_row->>'branch_id','')::uuid;
  actor=coalesce((select auth.uid()),nullif(scope_row->>'updated_by','')::uuid,nullif(scope_row->>'created_by','')::uuid,nullif(scope_row->>'actor_id','')::uuid);
  record_id=coalesce(nullif(scope_row->>'id',''),nullif(scope_row->>'key',''),nullif(scope_row->>'membership_id',''));
  event_action=case when tg_op='INSERT'then'created'when tg_op='DELETE'then'deleted'
    when old_row->'status'is distinct from new_row->'status'then'status_changed'else'updated'end;
  event_source=private.audit_source_for_table(tg_table_name,scope_row);
  perform private.write_audit_event(business_id,branch,actor,event_action,tg_table_name,record_id,old_row,new_row,event_source,null);
  return case when tg_op='DELETE'then old else new end;
end$$;

do $$declare item record;begin
  for item in
    select columns.table_schema,columns.table_name
    from information_schema.columns columns
    join information_schema.tables tables on tables.table_schema=columns.table_schema and tables.table_name=columns.table_name and tables.table_type='BASE TABLE'
    where columns.table_schema='public'and columns.column_name='organization_id'
      and columns.table_name<>'audit_events'
      and columns.table_name not like'%audit%'
      and columns.table_name not like'%history%'
  loop
    execute format('create trigger capture_business_audit_event after insert or update or delete on %I.%I for each row execute function private.capture_business_audit_event()',item.table_schema,item.table_name);
  end loop;
end$$;

create function private.reject_audit_event_mutation()returns trigger
language plpgsql set search_path='' as $$begin raise exception'Audit events are immutable.'using errcode='P0001';end$$;
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function private.reject_audit_event_mutation();

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
create policy audit_events_read on public.audit_events for select to authenticated
using(private.can_business_permission(organization_id,'audit.read',branch_id));
revoke all on table public.audit_events from public,anon,authenticated;
grant select on table public.audit_events to authenticated;

revoke all on function private.install_audit_permissions(uuid),private.handle_main_branch_audit_permissions(),private.sanitize_audit_json(jsonb),private.audit_request_metadata(),private.write_audit_event(uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,jsonb),private.audit_source_for_table(text,jsonb),private.capture_business_audit_event(),private.reject_audit_event_mutation()from public,anon,authenticated;

comment on table public.audit_events is'Canonical, immutable and sanitized tenant audit trail. Normal application roles can only read authorized rows; writes are produced by controlled mutation triggers.';
comment on column public.audit_events.ip_metadata is'Allowlisted request metadata only: IP address, user agent, and request ID when available. Cookies and authorization headers are never copied.';
comment on function private.sanitize_audit_json(jsonb)is'Recursively redacts credential, token, card and bank-account fields before they reach immutable audit storage.';
