-- Phase 2, Module 5: reusable Module Registry and tenant-safe activation.

alter table public.module_definitions
  drop constraint module_definitions_key_check;

alter table public.module_definitions
  add constraint module_definitions_key_check
    check (key ~ '^[a-z][a-z0-9_]*$'),
  add column category text not null default 'operations'
    check (category in ('sales', 'operations', 'customers', 'finance', 'workforce')),
  add column icon text not null default 'boxes'
    check (icon ~ '^[a-z][a-z0-9-]*$'),
  add column minimum_plan text not null default 'starter'
    check (minimum_plan in ('starter', 'growth', 'pro')),
  add column configuration_schema jsonb not null default '{"properties":{},"additionalProperties":false}'::jsonb
    check (jsonb_typeof(configuration_schema) = 'object');

create table public.module_dependencies (
  module_key text not null references public.module_definitions(key) on update cascade on delete cascade,
  dependency_module_key text not null references public.module_definitions(key) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  primary key (module_key, dependency_module_key),
  check (module_key <> dependency_module_key)
);

create index module_dependencies_dependency_key_idx
  on public.module_dependencies (dependency_module_key, module_key);

create function private.prevent_module_dependency_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    with recursive transitive_dependency(module_key) as (
      select new.dependency_module_key
      union
      select dependency.dependency_module_key
      from public.module_dependencies dependency
      join transitive_dependency path on path.module_key = dependency.module_key
    )
    select 1 from transitive_dependency where module_key = new.module_key
  ) then
    raise exception 'Module dependencies cannot contain a cycle.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_module_dependency_cycle()
  from public, anon, authenticated;

create trigger prevent_module_dependency_cycle
  before insert or update on public.module_dependencies
  for each row execute function private.prevent_module_dependency_cycle();

alter table public.module_dependencies enable row level security;

create policy module_dependencies_select_authenticated
  on public.module_dependencies for select to authenticated using (true);

revoke all on public.module_dependencies from public, anon, authenticated;
grant select on public.module_dependencies to authenticated;

create function private.module_configuration_is_valid(
  requested_schema jsonb,
  requested_configuration jsonb
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  property_key text;
  property_schema jsonb;
  property_value jsonb;
  property_type text;
  numeric_value numeric;
begin
  if jsonb_typeof(requested_schema) <> 'object'
    or jsonb_typeof(requested_schema -> 'properties') <> 'object'
    or requested_schema ->> 'additionalProperties' <> 'false'
    or jsonb_typeof(requested_configuration) <> 'object' then
    return false;
  end if;

  for property_key in select jsonb_object_keys(requested_configuration) loop
    property_schema := requested_schema -> 'properties' -> property_key;
    property_value := requested_configuration -> property_key;

    if property_schema is null or jsonb_typeof(property_schema) <> 'object' then
      return false;
    end if;

    property_type := property_schema ->> 'type';
    if property_type in ('string', 'enum') then
      if jsonb_typeof(property_value) <> 'string' then return false; end if;
      if property_schema ? 'minLength'
        and length(property_value #>> '{}') < (property_schema ->> 'minLength')::integer then
        return false;
      end if;
      if property_schema ? 'maxLength'
        and length(property_value #>> '{}') > (property_schema ->> 'maxLength')::integer then
        return false;
      end if;
      if property_type = 'enum' and not exists (
        select 1 from jsonb_array_elements_text(property_schema -> 'options') option_value
        where option_value = property_value #>> '{}'
      ) then
        return false;
      end if;
    elsif property_type = 'boolean' then
      if jsonb_typeof(property_value) <> 'boolean' then return false; end if;
    elsif property_type in ('integer', 'number') then
      if jsonb_typeof(property_value) <> 'number' then return false; end if;
      numeric_value := (property_value #>> '{}')::numeric;
      if property_type = 'integer' and trunc(numeric_value) <> numeric_value then return false; end if;
      if property_schema ? 'minimum'
        and numeric_value < (property_schema ->> 'minimum')::numeric then return false;
      end if;
      if property_schema ? 'maximum'
        and numeric_value > (property_schema ->> 'maximum')::numeric then return false;
      end if;
    else
      return false;
    end if;
  end loop;

  for property_key, property_schema in
    select key, value from jsonb_each(requested_schema -> 'properties')
  loop
    if coalesce((property_schema ->> 'required')::boolean, false)
      and not requested_configuration ? property_key then
      return false;
    end if;
  end loop;

  return true;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return false;
end;
$$;

revoke all on function private.module_configuration_is_valid(jsonb, jsonb)
  from public, anon, authenticated;

insert into public.module_definitions (
  key, name, description, category, icon, minimum_plan,
  configuration_schema, version, manifest, status
) values
  ('sales', 'Sales', 'Capture sales transactions and monitor revenue.', 'sales', 'badge-dollar-sign', 'starter',
    '{"properties":{"default_tax_rate":{"type":"number","label":"Default tax rate (%)","minimum":0,"maximum":100,"default":12}},"additionalProperties":false}', 1, '{}', 'published'),
  ('pos', 'Point of Sale', 'Run counter sales with receipt and checkout preferences.', 'sales', 'shopping-cart', 'starter',
    '{"properties":{"receipt_footer":{"type":"string","label":"Receipt footer","maxLength":200,"default":"Salamat po!"}},"additionalProperties":false}', 1, '{}', 'published'),
  ('inventory', 'Inventory', 'Track stock levels, adjustments, and reorder controls.', 'operations', 'package-search', 'starter',
    '{"properties":{"allow_negative_stock":{"type":"boolean","label":"Allow negative stock","default":false},"low_stock_threshold":{"type":"integer","label":"Low-stock threshold","minimum":0,"maximum":100000,"default":5}},"additionalProperties":false}', 1, '{}', 'published'),
  ('crm', 'CRM', 'Maintain customer records and relationship history.', 'customers', 'contact-round', 'growth',
    '{"properties":{},"additionalProperties":false}', 1, '{}', 'published'),
  ('expenses', 'Expenses', 'Record and categorize operating expenses.', 'finance', 'receipt-text', 'starter',
    '{"properties":{"approval_threshold":{"type":"number","label":"Approval threshold","minimum":0,"maximum":100000000,"default":0}},"additionalProperties":false}', 1, '{}', 'published'),
  ('quotations', 'Quotations', 'Prepare and track customer quotations.', 'sales', 'file-text', 'starter',
    '{"properties":{"validity_days":{"type":"integer","label":"Default validity (days)","minimum":1,"maximum":365,"default":30}},"additionalProperties":false}', 1, '{}', 'published'),
  ('invoicing', 'Invoicing', 'Issue invoices and track settlement status.', 'finance', 'file-check', 'starter',
    '{"properties":{"payment_terms_days":{"type":"integer","label":"Payment terms (days)","minimum":0,"maximum":365,"default":30}},"additionalProperties":false}', 1, '{}', 'published'),
  ('purchasing', 'Purchasing', 'Manage suppliers and purchase orders.', 'operations', 'truck', 'growth',
    '{"properties":{},"additionalProperties":false}', 1, '{}', 'published'),
  ('appointments', 'Appointments', 'Schedule customer appointments and services.', 'customers', 'calendar-clock', 'growth',
    '{"properties":{"slot_minutes":{"type":"integer","label":"Appointment slot (minutes)","minimum":5,"maximum":480,"default":30}},"additionalProperties":false}', 1, '{}', 'published'),
  ('job_orders', 'Job Orders', 'Coordinate customer jobs, assignments, and completion.', 'operations', 'clipboard-list', 'growth',
    '{"properties":{},"additionalProperties":false}', 1, '{}', 'published'),
  ('delivery', 'Delivery', 'Plan fulfillment and delivery status tracking.', 'operations', 'map-pinned', 'growth',
    '{"properties":{"default_fee":{"type":"number","label":"Default delivery fee","minimum":0,"maximum":1000000,"default":0}},"additionalProperties":false}', 1, '{}', 'published'),
  ('employees', 'Employees', 'Maintain employee profiles and work assignments.', 'workforce', 'users', 'growth',
    '{"properties":{},"additionalProperties":false}', 1, '{}', 'published'),
  ('attendance', 'Attendance', 'Track employee time and attendance.', 'workforce', 'clock', 'growth',
    '{"properties":{"grace_period_minutes":{"type":"integer","label":"Grace period (minutes)","minimum":0,"maximum":180,"default":0}},"additionalProperties":false}', 1, '{}', 'published'),
  ('loyalty', 'Loyalty', 'Configure customer rewards and loyalty programs.', 'customers', 'gift', 'pro',
    '{"properties":{"points_per_peso":{"type":"number","label":"Points per peso","minimum":0,"maximum":100,"default":1}},"additionalProperties":false}', 1, '{}', 'published')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  minimum_plan = excluded.minimum_plan,
  configuration_schema = excluded.configuration_schema,
  version = excluded.version,
  status = excluded.status,
  updated_at = now();

insert into public.module_dependencies (module_key, dependency_module_key) values
  ('pos', 'sales'),
  ('pos', 'inventory'),
  ('quotations', 'crm'),
  ('invoicing', 'sales'),
  ('purchasing', 'inventory'),
  ('purchasing', 'expenses'),
  ('appointments', 'crm'),
  ('job_orders', 'crm'),
  ('job_orders', 'inventory'),
  ('delivery', 'sales'),
  ('attendance', 'employees'),
  ('loyalty', 'crm'),
  ('loyalty', 'sales')
on conflict do nothing;

create function private.set_business_module_state(
  requested_organization_id uuid,
  requested_module_key text,
  requested_enabled boolean,
  requested_configuration jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  definition public.module_definitions%rowtype;
  missing_dependencies text[];
  blocking_dependents text[];
  current_plan text;
  current_plan_rank integer;
  minimum_plan_rank integer;
begin
  if (select auth.uid()) is null
    or not private.can_business_permission(requested_organization_id, 'module.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  if requested_module_key !~ '^[a-z][a-z0-9_]*$'
    or jsonb_typeof(requested_configuration) <> 'object' then
    raise exception 'Invalid module request.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(requested_organization_id::text, 0)
  );

  select * into definition
  from public.module_definitions module_definition
  where module_definition.key = requested_module_key
    and module_definition.status = 'published';

  if not found then
    raise exception 'Published module not found.' using errcode = '22023';
  end if;

  if requested_enabled then
    select subscription.plan_key into current_plan
    from public.subscriptions subscription
    where subscription.organization_id = requested_organization_id
      and subscription.status in ('trialing', 'active')
    limit 1;

    current_plan := coalesce(current_plan, 'starter');
    current_plan_rank := case current_plan when 'pro' then 3 when 'growth' then 2 else 1 end;
    minimum_plan_rank := case definition.minimum_plan when 'pro' then 3 when 'growth' then 2 else 1 end;
    if current_plan_rank < minimum_plan_rank then
      raise exception 'Module requires the % plan.', definition.minimum_plan using errcode = 'P0001';
    end if;

    select array_agg(dependency.dependency_module_key order by dependency.dependency_module_key)
      into missing_dependencies
    from public.module_dependencies dependency
    where dependency.module_key = requested_module_key
      and not exists (
        select 1
        from public.organization_modules business_module
        join public.module_definitions dependency_definition
          on dependency_definition.id = business_module.module_id
        where business_module.organization_id = requested_organization_id
          and dependency_definition.key = dependency.dependency_module_key
          and business_module.is_enabled
      );

    if coalesce(cardinality(missing_dependencies), 0) > 0 then
      raise exception 'Enable required modules first: %.', array_to_string(missing_dependencies, ', ')
        using errcode = 'P0001';
    end if;

    if not private.module_configuration_is_valid(
      definition.configuration_schema,
      requested_configuration
    ) then
      raise exception 'Invalid module configuration.' using errcode = '22023';
    end if;

    insert into public.organization_modules (
      organization_id, module_id, config, enabled_at, enabled_by, is_enabled
    ) values (
      requested_organization_id, definition.id, requested_configuration,
      now(), (select auth.uid()), true
    )
    on conflict (organization_id, module_id) do update set
      config = excluded.config,
      enabled_at = now(),
      enabled_by = (select auth.uid()),
      is_enabled = true,
      updated_at = now();
  else
    select array_agg(dependent.key order by dependent.key)
      into blocking_dependents
    from public.module_dependencies dependency
    join public.module_definitions dependent
      on dependent.key = dependency.module_key
    join public.organization_modules business_module
      on business_module.module_id = dependent.id
      and business_module.organization_id = requested_organization_id
      and business_module.is_enabled
    where dependency.dependency_module_key = requested_module_key;

    if coalesce(cardinality(blocking_dependents), 0) > 0 then
      raise exception 'Module is required by enabled modules: %.', array_to_string(blocking_dependents, ', ')
        using errcode = 'P0001';
    end if;

    update public.organization_modules business_module
    set is_enabled = false, updated_at = now()
    where business_module.organization_id = requested_organization_id
      and business_module.module_id = definition.id;
  end if;
end;
$$;

revoke all on function private.set_business_module_state(uuid, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function private.set_business_module_state(uuid, text, boolean, jsonb)
  to authenticated;

create function public.set_business_module_state(
  requested_organization_id uuid,
  requested_module_key text,
  requested_enabled boolean,
  requested_configuration jsonb default '{}'::jsonb
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_business_module_state(
    requested_organization_id,
    requested_module_key,
    requested_enabled,
    requested_configuration
  );
$$;

revoke all on function public.set_business_module_state(uuid, text, boolean, jsonb)
  from public, anon;
grant execute on function public.set_business_module_state(uuid, text, boolean, jsonb)
  to authenticated;

revoke insert, update, delete on public.organization_modules from authenticated;

comment on table public.module_definitions is
  'Published reusable capability registry. Definitions are platform-owned, not tenant-authored.';
comment on table public.module_dependencies is
  'Directed dependency edges between reusable module definitions.';
comment on function public.set_business_module_state(uuid, text, boolean, jsonb) is
  'Atomically activates, configures, or deactivates a Business module with plan and dependency enforcement.';
