-- World is a presentation layer: no operational records are changed here.
create table public.business_world_configs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  suggestion_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.business_world_preferences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  landing_view text not null default 'dashboard' check (landing_view in ('dashboard','world')),
  branch_id uuid,
  motion text not null default 'system' check (motion in ('system','paused','enabled')),
  representation text not null default '3d' check (representation in ('3d','2d')),
  updated_at timestamptz not null default now(),
  primary key (organization_id,user_id),
  foreign key (branch_id,organization_id) references public.branches(id,organization_id) on delete cascade
);
alter table public.business_world_configs enable row level security;
alter table public.business_world_preferences enable row level security;
grant select,insert,update,delete on public.business_world_configs,public.business_world_preferences to authenticated;
create policy world_config_read on public.business_world_configs for select to authenticated
  using (private.is_organization_member(organization_id));
create policy world_config_write on public.business_world_configs for all to authenticated
  using (private.is_organization_member(organization_id) and private.can_business_permission(organization_id,'settings.manage',null))
  with check (private.is_organization_member(organization_id) and private.can_business_permission(organization_id,'settings.manage',null));
create policy world_preferences_own on public.business_world_preferences for all to authenticated
  using (user_id=(select auth.uid()) and private.is_organization_member(organization_id))
  with check (user_id=(select auth.uid()) and private.is_organization_member(organization_id)
    and (branch_id is null or private.can_business_permission(organization_id,'organization.read',branch_id)));

-- Only safe module keys, never settings or operational rows. Staff may lack module.read.
create function public.business_world_modules(requested_organization_id uuid) returns setof text
language sql stable security definer set search_path='' as $$
  select d.key from public.organization_modules m join public.module_definitions d on d.id=m.module_id
  where m.organization_id=requested_organization_id and m.is_enabled
    and private.is_organization_member(requested_organization_id)
$$;
revoke all on function public.business_world_modules(uuid) from public,anon;
grant execute on function public.business_world_modules(uuid) to authenticated;

create function private.world_topic_allowed(topic text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare org uuid; domain text; permission text;
begin
  if topic !~ '^world:[0-9a-f-]{36}:[a-z_]+$' then return false; end if;
  begin org:=split_part(topic,':',2)::uuid; exception when invalid_text_representation then return false; end;
  domain:=split_part(topic,':',3);
  permission:=case domain when 'sales' then 'sales.read' when 'inventory' then 'inventory.read'
    when 'purchasing' then 'purchasing.read' when 'crm' then 'crm.read' when 'delivery' then 'delivery.read'
    when 'invoicing' then 'invoices.read' when 'appointments' then 'appointments.read'
    when 'job_orders' then 'job-orders.read' when 'employees' then 'employee.read'
    when 'config' then 'organization.read' end;
  return (select auth.uid()) is not null and permission is not null
    and private.is_organization_member(org) and private.can_business_permission(org,permission,null)
    and (domain='config' or exists(select 1 from public.organization_modules m
      join public.module_definitions d on d.id=m.module_id where m.organization_id=org and m.is_enabled and d.key=domain));
end $$;
revoke all on function private.world_topic_allowed(text) from public,anon;
grant execute on function private.world_topic_allowed(text) to authenticated;
create policy world_private_receive on realtime.messages for select to authenticated
  using (extension='broadcast' and private.world_topic_allowed((select realtime.topic())));

-- Only an empty invalidation is broadcast. No amounts, IDs of records, or personal data.
-- Never make an operational transaction fail because the optional live view is offline.
create function private.invalidate_business_world() returns trigger
language plpgsql security definer set search_path='' as $$
declare org uuid;
begin
  org:=case when TG_OP='DELETE' then OLD.organization_id else NEW.organization_id end;
  begin
    perform realtime.send('{}'::jsonb,'invalidate','world:'||org::text||':'||TG_ARGV[0],true);
    if TG_OP='UPDATE' and OLD.organization_id is distinct from NEW.organization_id then
      perform realtime.send('{}'::jsonb,'invalidate','world:'||OLD.organization_id::text||':'||TG_ARGV[0],true);
    end if;
  exception when others then raise warning 'World invalidation unavailable'; end;
  return null;
end $$;
revoke all on function private.invalidate_business_world() from public,anon,authenticated;
do $$ declare entry text[]; begin
  foreach entry slice 1 in array array[
    ['sales_transactions','sales'],['stock_balances','inventory'],['stock_movements','inventory'],
    ['inventory_items','inventory'],['inventory_locations','inventory'],['purchase_orders','purchasing'],
    ['purchase_requests','purchasing'],['goods_receipts','purchasing'],['sales_customers','crm'],
    ['deliveries','delivery'],['invoices','invoicing'],['ar_payments','invoicing'],
    ['appointments','appointments'],['job_orders','job_orders'],['employees','employees'],
    ['organization_modules','config'],['business_world_configs','config'],['branches','config'],
    ['organization_memberships','config']
  ] loop
    execute format('create trigger world_invalidate after insert or update or delete on public.%I for each row execute function private.invalidate_business_world(%L)',entry[1],entry[2]);
  end loop;
end $$;
