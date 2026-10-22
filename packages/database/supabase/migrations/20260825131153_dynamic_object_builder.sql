-- Phase 2, Module 6: metadata-driven objects and shared JSONB record storage.
-- Custom objects never create or alter tenant-specific PostgreSQL tables.

insert into public.permissions (key, domain, action, description) values
  ('record.read', 'record', 'read', 'View metadata-driven object records'),
  ('record.create', 'record', 'create', 'Create metadata-driven object records'),
  ('record.update', 'record', 'update', 'Update metadata-driven object records')
on conflict (key) do update set description = excluded.description;

create function private.install_object_permissions(requested_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  join public.permissions permission on permission.key = any (case role.key
    when 'owner' then array['record.read', 'record.create', 'record.update']
    when 'administrator' then array['record.read', 'record.create', 'record.update']
    when 'manager' then array['record.read', 'record.create', 'record.update']
    when 'cashier' then array['record.read', 'record.create', 'record.update']
    when 'staff' then array['record.read', 'record.create', 'record.update']
    when 'viewer' then array['record.read']
    else array[]::text[]
  end)
  where role.organization_id = requested_organization_id
    and role.is_system
  on conflict do nothing;
end;
$$;

revoke all on function private.install_object_permissions(uuid)
  from public, anon, authenticated;

create function private.handle_main_branch_object_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.code = 'main' then
    perform private.install_object_permissions(new.organization_id);
  end if;
  return new;
end;
$$;

revoke all on function private.handle_main_branch_object_permissions()
  from public, anon, authenticated;

create trigger zz_install_object_permissions_on_main_branch
  after insert on public.branches
  for each row execute function private.handle_main_branch_object_permissions();

select private.install_object_permissions(organization.id)
from public.organizations organization;

alter table public.field_definitions
  drop constraint field_definitions_data_type_check;

alter table public.field_definitions
  add constraint field_definitions_data_type_check check (data_type in (
    'text', 'textarea', 'number', 'decimal', 'currency', 'percentage',
    'boolean', 'date', 'datetime', 'email', 'phone', 'url', 'select',
    'multiselect', 'status', 'user', 'branch', 'relation', 'attachment'
  ));

create table public.object_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  object_definition_id uuid not null,
  branch_id uuid,
  display_value text not null,
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (object_definition_id, organization_id)
    references public.object_definitions(id, organization_id) on delete cascade,
  foreign key (branch_id, organization_id)
    references public.branches(id, organization_id) on delete restrict,
  check ((status = 'archived') = (archived_at is not null))
);

create table private.object_record_unique_values (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_definition_id uuid not null,
  record_id uuid not null,
  canonical_value text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, field_definition_id, canonical_value),
  unique (record_id, field_definition_id),
  foreign key (field_definition_id, organization_id)
    references public.field_definitions(id, organization_id) on delete cascade,
  foreign key (record_id, organization_id)
    references public.object_records(id, organization_id) on delete cascade
);

create index field_definitions_object_order_idx
  on public.field_definitions (object_definition_id, organization_id, status, sort_order, id);
create index relationship_definitions_source_idx
  on public.relationship_definitions (source_object_id, organization_id);
create index relationship_definitions_target_idx
  on public.relationship_definitions (target_object_id, organization_id);
create index object_records_active_list_idx
  on public.object_records (organization_id, object_definition_id, created_at desc, id desc)
  where status = 'active';
create index object_records_branch_active_idx
  on public.object_records (organization_id, branch_id, object_definition_id, created_at desc)
  where branch_id is not null and status = 'active';
create index object_records_display_value_idx
  on public.object_records (organization_id, object_definition_id, lower(display_value) text_pattern_ops)
  where status = 'active';
create index object_records_attributes_gin_idx
  on public.object_records using gin (attributes jsonb_path_ops);
create index object_records_created_by_idx on public.object_records (created_by);
create index object_records_updated_by_idx on public.object_records (updated_by);
create index object_record_unique_values_record_idx
  on private.object_record_unique_values (record_id, organization_id);

create trigger set_updated_at before update on public.object_records
  for each row execute function private.set_updated_at();
create trigger prevent_tenant_reassignment before update on public.object_records
  for each row execute function private.prevent_tenant_reassignment();

create function private.prevent_object_record_parent_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.object_definition_id <> old.object_definition_id then
    raise exception 'Object records cannot be moved between object definitions.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_object_record_parent_reassignment()
  from public, anon, authenticated;

create trigger prevent_object_record_parent_reassignment
  before update on public.object_records
  for each row execute function private.prevent_object_record_parent_reassignment();

alter table public.object_records enable row level security;
alter table private.object_record_unique_values enable row level security;

drop policy object_definitions_select_authorized on public.object_definitions;
drop policy field_definitions_select_authorized on public.field_definitions;
drop policy relationship_definitions_select_authorized on public.relationship_definitions;

create policy object_definitions_select_authorized on public.object_definitions
  for select to authenticated
  using (
    private.has_organization_permission(organization_id, 'metadata.read')
    or private.has_organization_permission(organization_id, 'metadata.manage')
    or private.has_organization_permission(organization_id, 'record.read')
    or private.has_organization_permission(organization_id, 'record.create')
    or private.has_organization_permission(organization_id, 'record.update')
  );
create policy field_definitions_select_authorized on public.field_definitions
  for select to authenticated
  using (
    private.has_organization_permission(organization_id, 'metadata.read')
    or private.has_organization_permission(organization_id, 'metadata.manage')
    or private.has_organization_permission(organization_id, 'record.read')
    or private.has_organization_permission(organization_id, 'record.create')
    or private.has_organization_permission(organization_id, 'record.update')
  );
create policy relationship_definitions_select_authorized on public.relationship_definitions
  for select to authenticated
  using (
    private.has_organization_permission(organization_id, 'metadata.read')
    or private.has_organization_permission(organization_id, 'metadata.manage')
    or private.has_organization_permission(organization_id, 'record.read')
    or private.has_organization_permission(organization_id, 'record.create')
    or private.has_organization_permission(organization_id, 'record.update')
  );

create policy object_records_select_authorized on public.object_records
  for select to authenticated
  using (private.can_business_permission(organization_id, 'record.read', branch_id));

revoke all on public.object_records from public, anon, authenticated;
grant select on public.object_records to authenticated;
revoke insert, update, delete on public.object_definitions, public.field_definitions
  from authenticated;

create function private.object_value_is_valid(
  requested_organization_id uuid,
  requested_type text,
  requested_config jsonb,
  requested_value jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  text_value text;
  numeric_value numeric;
  array_value jsonb;
  relation_object_id uuid;
begin
  if requested_value is null or requested_value = 'null'::jsonb then return false; end if;

  if requested_type in ('text', 'textarea', 'email', 'phone', 'url', 'date', 'datetime', 'select', 'status', 'user', 'branch', 'relation') then
    if jsonb_typeof(requested_value) <> 'string' then return false; end if;
    text_value := requested_value #>> '{}';
  end if;

  if requested_type in ('text', 'textarea') then
    if requested_config -> 'validation' ? 'minLength'
      and length(text_value) < (requested_config -> 'validation' ->> 'minLength')::integer then return false; end if;
    if requested_config -> 'validation' ? 'maxLength'
      and length(text_value) > (requested_config -> 'validation' ->> 'maxLength')::integer then return false; end if;
  elsif requested_type = 'email' then
    if text_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
  elsif requested_type = 'phone' then
    if text_value !~ '^\+?[0-9 ()-]{7,20}$' then return false; end if;
  elsif requested_type = 'url' then
    if text_value !~* '^https?://[^[:space:]]+$' then return false; end if;
  elsif requested_type = 'date' then
    perform text_value::date;
    if text_value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  elsif requested_type = 'datetime' then
    perform text_value::timestamptz;
  elsif requested_type in ('number', 'decimal', 'currency', 'percentage') then
    if jsonb_typeof(requested_value) <> 'number' then return false; end if;
    numeric_value := (requested_value #>> '{}')::numeric;
    if requested_type = 'percentage' and (numeric_value < 0 or numeric_value > 100) then return false; end if;
    if requested_config -> 'validation' ? 'minimum'
      and numeric_value < (requested_config -> 'validation' ->> 'minimum')::numeric then return false; end if;
    if requested_config -> 'validation' ? 'maximum'
      and numeric_value > (requested_config -> 'validation' ->> 'maximum')::numeric then return false; end if;
  elsif requested_type = 'boolean' then
    if jsonb_typeof(requested_value) <> 'boolean' then return false; end if;
  elsif requested_type in ('select', 'status') then
    if not exists (
      select 1 from jsonb_array_elements(requested_config -> 'options') option
      where option ->> 'value' = text_value
    ) then return false; end if;
  elsif requested_type = 'multiselect' then
    if jsonb_typeof(requested_value) <> 'array' or jsonb_array_length(requested_value) > 100 then return false; end if;
    for array_value in select value from jsonb_array_elements(requested_value) loop
      if jsonb_typeof(array_value) <> 'string' or not exists (
        select 1 from jsonb_array_elements(requested_config -> 'options') option
        where option ->> 'value' = array_value #>> '{}'
      ) then return false; end if;
    end loop;
    if jsonb_array_length(requested_value) <> (
      select count(distinct value) from jsonb_array_elements_text(requested_value)
    ) then return false; end if;
  elsif requested_type = 'user' then
    if not exists (
      select 1 from auth.users app_user
      join public.organization_memberships membership on membership.user_id = app_user.id
      where app_user.id = text_value::uuid
        and membership.organization_id = requested_organization_id
        and membership.status = 'active'
    ) then return false; end if;
  elsif requested_type = 'branch' then
    if not exists (
      select 1 from public.branches branch
      where branch.id = text_value::uuid and branch.organization_id = requested_organization_id
    ) then return false; end if;
  elsif requested_type = 'relation' then
    relation_object_id := (requested_config ->> 'relationObjectId')::uuid;
    if not exists (
      select 1 from public.object_records related_record
      where related_record.id = text_value::uuid
        and related_record.organization_id = requested_organization_id
        and related_record.object_definition_id = relation_object_id
        and related_record.status = 'active'
    ) then return false; end if;
  elsif requested_type = 'attachment' then
    if jsonb_typeof(requested_value) <> 'array' or jsonb_array_length(requested_value) > 20 then return false; end if;
    for array_value in select value from jsonb_array_elements(requested_value) loop
      if jsonb_typeof(array_value) <> 'string'
        or array_value #>> '{}' !~ ('^' || requested_organization_id::text || '/.+') then return false; end if;
    end loop;
  else
    return false;
  end if;
  return true;
exception
  when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
    return false;
end;
$$;

revoke all on function private.object_value_is_valid(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;

create function private.object_attributes_are_valid(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_attributes jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  field record;
  attribute_key text;
begin
  if jsonb_typeof(requested_attributes) <> 'object' then return false; end if;

  for attribute_key in select jsonb_object_keys(requested_attributes) loop
    if not exists (
      select 1 from public.field_definitions definition
      where definition.organization_id = requested_organization_id
        and definition.object_definition_id = requested_object_definition_id
        and definition.key = attribute_key
        and definition.status = 'active'
    ) then return false; end if;
  end loop;

  for field in
    select * from public.field_definitions definition
    where definition.organization_id = requested_organization_id
      and definition.object_definition_id = requested_object_definition_id
      and definition.status = 'active'
  loop
    if not requested_attributes ? field.key then
      if field.is_required and not field.config ? 'defaultValue' then return false; end if;
      continue;
    end if;
    if (coalesce(field.config ->> 'visibility', 'visible') = 'hidden'
      or coalesce((field.config ->> 'readOnly')::boolean, false))
      and (not field.config ? 'defaultValue' or requested_attributes -> field.key <> field.config -> 'defaultValue') then
      return false;
    end if;
    if not private.object_value_is_valid(
      requested_organization_id, field.data_type, field.config,
      requested_attributes -> field.key
    ) then return false; end if;
  end loop;
  return true;
end;
$$;

revoke all on function private.object_attributes_are_valid(uuid, uuid, jsonb)
  from public, anon, authenticated;

create function private.canonical_object_value(requested_type text, requested_value jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when requested_type in ('email', 'text', 'textarea', 'url')
      then lower(trim(requested_value #>> '{}'))
    else requested_value::text
  end;
$$;

revoke all on function private.canonical_object_value(text, jsonb)
  from public, anon, authenticated;

create function private.create_dynamic_object(
  requested_organization_id uuid,
  requested_key text,
  requested_singular_label text,
  requested_plural_label text,
  requested_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  if (select auth.uid()) is null
    or not private.can_business_permission(requested_organization_id, 'metadata.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  if requested_key !~ '^[a-z][a-z0-9_]*$' or length(requested_key) > 64
    or length(trim(requested_singular_label)) not between 1 and 120
    or length(trim(requested_plural_label)) not between 1 and 120
    or length(requested_description) > 500 then
    raise exception 'Invalid object definition.' using errcode = '22023';
  end if;
  insert into public.object_definitions (
    organization_id, key, singular_label, plural_label, description, status
  ) values (
    requested_organization_id, requested_key, trim(requested_singular_label),
    trim(requested_plural_label), nullif(trim(requested_description), ''), 'active'
  ) returning id into created_id;
  return created_id;
end;
$$;

create function private.upsert_object_field(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_key text,
  requested_label text,
  requested_type text,
  requested_required boolean,
  requested_unique boolean,
  requested_config jsonb,
  requested_field_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  existing_type text;
  next_sort_order integer;
begin
  if (select auth.uid()) is null
    or not private.can_business_permission(requested_organization_id, 'metadata.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.object_definitions object_definition
    where object_definition.id = requested_object_definition_id
      and object_definition.organization_id = requested_organization_id
      and object_definition.status <> 'archived'
  ) then raise exception 'Object definition not found.' using errcode = '22023'; end if;
  if requested_key !~ '^[a-z][a-z0-9_]*$' or length(requested_key) > 64
    or length(trim(requested_label)) not between 1 and 120
    or requested_type not in (
      'text', 'textarea', 'number', 'decimal', 'currency', 'percentage',
      'boolean', 'date', 'datetime', 'email', 'phone', 'url', 'select',
      'multiselect', 'status', 'user', 'branch', 'relation', 'attachment'
    ) or jsonb_typeof(requested_config) <> 'object' then
    raise exception 'Invalid field definition.' using errcode = '22023';
  end if;
  if requested_unique and requested_type in ('multiselect', 'attachment') then
    raise exception 'Array fields cannot be unique.' using errcode = '22023';
  end if;
  if coalesce(requested_config ->> 'visibility', 'visible') not in ('visible', 'hidden')
    or (requested_config ? 'readOnly' and jsonb_typeof(requested_config -> 'readOnly') <> 'boolean')
    or (requested_config ? 'validation' and jsonb_typeof(requested_config -> 'validation') <> 'object')
    or (requested_config ? 'options' and jsonb_typeof(requested_config -> 'options') <> 'array') then
    raise exception 'Invalid field configuration.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(requested_config) config_key
    where config_key not in (
      'defaultValue', 'placeholder', 'helpText', 'options', 'validation',
      'visibility', 'readOnly', 'relationObjectId'
    )
  ) then raise exception 'Unknown field configuration property.' using errcode = '22023'; end if;
  if requested_config ? 'placeholder' and (
    jsonb_typeof(requested_config -> 'placeholder') <> 'string'
    or length(requested_config ->> 'placeholder') > 200
  ) then raise exception 'Invalid field placeholder.' using errcode = '22023'; end if;
  if requested_config ? 'helpText' and (
    jsonb_typeof(requested_config -> 'helpText') <> 'string'
    or length(requested_config ->> 'helpText') > 500
  ) then raise exception 'Invalid field help text.' using errcode = '22023'; end if;
  if jsonb_typeof(requested_config -> 'options') = 'array' and (
    exists (
      select 1 from jsonb_array_elements(requested_config -> 'options') option
      where jsonb_typeof(option) <> 'object'
        or jsonb_typeof(option -> 'value') is distinct from 'string'
        or jsonb_typeof(option -> 'label') is distinct from 'string'
        or option ->> 'value' !~ '^[a-z][a-z0-9_]*$'
    ) or (
      select count(*) from jsonb_array_elements(requested_config -> 'options')
    ) <> (
      select count(distinct option ->> 'value')
      from jsonb_array_elements(requested_config -> 'options') option
    )
  ) then raise exception 'Invalid field options.' using errcode = '22023'; end if;
  if jsonb_typeof(requested_config -> 'validation') = 'object' and exists (
    select 1 from jsonb_each(requested_config -> 'validation') validation
    where validation.key not in ('minLength', 'maxLength', 'minimum', 'maximum')
      or jsonb_typeof(validation.value) <> 'number'
  ) then raise exception 'Invalid field validation.' using errcode = '22023'; end if;
  if requested_required and coalesce((requested_config ->> 'readOnly')::boolean, false)
    and not requested_config ? 'defaultValue' then
    raise exception 'A required read-only field needs a default value.' using errcode = '22023';
  end if;
  if requested_type in ('select', 'multiselect', 'status') and (
    jsonb_typeof(requested_config -> 'options') is distinct from 'array'
    or jsonb_array_length(requested_config -> 'options') = 0
  ) then raise exception 'Field options are required.' using errcode = '22023'; end if;
  if requested_type not in ('select', 'multiselect', 'status')
    and coalesce(jsonb_array_length(requested_config -> 'options'), 0) > 0 then
    raise exception 'Options are not supported for this field type.' using errcode = '22023';
  end if;
  if requested_type <> 'relation' and requested_config ? 'relationObjectId' then
    raise exception 'Only relation fields can have a target object.' using errcode = '22023';
  end if;
  if requested_type = 'relation' and not exists (
    select 1 from public.object_definitions relation_object
    where relation_object.id = (requested_config ->> 'relationObjectId')::uuid
      and relation_object.organization_id = requested_organization_id
      and relation_object.status <> 'archived'
  ) then raise exception 'Relation target not found.' using errcode = '22023'; end if;
  if requested_config ? 'defaultValue' and not private.object_value_is_valid(
    requested_organization_id, requested_type, requested_config,
    requested_config -> 'defaultValue'
  ) then raise exception 'Invalid default value.' using errcode = '22023'; end if;

  if requested_field_id is null then
    select coalesce(max(field.sort_order), -1) + 1 into next_sort_order
    from public.field_definitions field
    where field.organization_id = requested_organization_id
      and field.object_definition_id = requested_object_definition_id;
    insert into public.field_definitions (
      organization_id, object_definition_id, key, label, data_type,
      is_required, is_unique, sort_order, config, status
    ) values (
      requested_organization_id, requested_object_definition_id, requested_key,
      trim(requested_label), requested_type, requested_required, requested_unique,
      next_sort_order, requested_config, 'active'
    ) returning id into saved_id;
  else
    select field.data_type into existing_type
    from public.field_definitions field
    where field.id = requested_field_id
      and field.organization_id = requested_organization_id
      and field.object_definition_id = requested_object_definition_id
      and field.status = 'active'
    for update;
    if not found then raise exception 'Field definition not found.' using errcode = '22023'; end if;
    if existing_type <> requested_type and exists (
      select 1 from public.object_records record
      where record.organization_id = requested_organization_id
        and record.object_definition_id = requested_object_definition_id
    ) then raise exception 'Field type cannot change after records exist.' using errcode = 'P0001'; end if;
    update public.field_definitions field set
      label = trim(requested_label), data_type = requested_type,
      is_required = requested_required, is_unique = requested_unique,
      config = requested_config
    where field.id = requested_field_id;
    saved_id := requested_field_id;
  end if;

  delete from private.object_record_unique_values unique_value
  where unique_value.field_definition_id = saved_id;
  if requested_unique then
    insert into private.object_record_unique_values (
      organization_id, field_definition_id, record_id, canonical_value
    )
    select requested_organization_id, saved_id, record.id,
      private.canonical_object_value(requested_type, record.attributes -> requested_key)
    from public.object_records record
    where record.organization_id = requested_organization_id
      and record.object_definition_id = requested_object_definition_id
      and record.status = 'active'
      and record.attributes ? requested_key;
  end if;
  return saved_id;
end;
$$;

create function private.reorder_object_fields(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_field_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not private.can_business_permission(requested_organization_id, 'metadata.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  if coalesce(cardinality(requested_field_ids), 0) = 0
    or cardinality(requested_field_ids) <> (
      select count(*) from public.field_definitions field
      where field.organization_id = requested_organization_id
        and field.object_definition_id = requested_object_definition_id
        and field.status = 'active'
    ) or cardinality(requested_field_ids) <> (
      select count(distinct field_id) from unnest(requested_field_ids) field_id
    ) or exists (
      select 1 from unnest(requested_field_ids) field_id
      where not exists (
        select 1 from public.field_definitions field
        where field.id = field_id and field.organization_id = requested_organization_id
          and field.object_definition_id = requested_object_definition_id and field.status = 'active'
      )
    ) then raise exception 'Field order must contain every active field exactly once.' using errcode = '22023'; end if;

  update public.field_definitions field set sort_order = ordered.ordinality - 1
  from unnest(requested_field_ids) with ordinality ordered(field_id, ordinality)
  where field.id = ordered.field_id;
end;
$$;

create function private.archive_object_field(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_field_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not private.can_business_permission(requested_organization_id, 'metadata.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  update public.field_definitions field set status = 'archived'
  where field.id = requested_field_id
    and field.organization_id = requested_organization_id
    and field.object_definition_id = requested_object_definition_id
    and field.status = 'active';
  if not found then raise exception 'Field definition not found.' using errcode = '22023'; end if;
  delete from private.object_record_unique_values unique_value
  where unique_value.field_definition_id = requested_field_id;
end;
$$;

create function private.save_object_record(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_branch_id uuid default null,
  requested_attributes jsonb default '{}'::jsonb,
  requested_record_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid := coalesce(requested_record_id, gen_random_uuid());
  normalized_attributes jsonb := requested_attributes;
  historical_attributes jsonb := '{}'::jsonb;
  existing_branch_id uuid;
  field record;
  title_field record;
  resolved_display_value text;
begin
  if (select auth.uid()) is null then raise exception 'Permission denied.' using errcode = '42501'; end if;
  if requested_record_id is null then
    if not private.can_business_permission(requested_organization_id, 'record.create', requested_branch_id) then
      raise exception 'Permission denied.' using errcode = '42501';
    end if;
  else
    select record.branch_id into existing_branch_id
    from public.object_records record
    where record.id = requested_record_id
      and record.organization_id = requested_organization_id
      and record.object_definition_id = requested_object_definition_id
      and record.status = 'active'
    for update;
    if not found then raise exception 'Object record not found.' using errcode = '22023'; end if;
    if not private.can_business_permission(requested_organization_id, 'record.update', existing_branch_id)
      or not private.can_business_permission(requested_organization_id, 'record.update', requested_branch_id) then
      raise exception 'Permission denied.' using errcode = '42501';
    end if;
    select coalesce(jsonb_object_agg(attribute.key, attribute.value), '{}'::jsonb)
      into historical_attributes
    from public.object_records existing_record,
      jsonb_each(existing_record.attributes) attribute
    where existing_record.id = requested_record_id
      and not exists (
        select 1 from public.field_definitions active_field
        where active_field.organization_id = requested_organization_id
          and active_field.object_definition_id = requested_object_definition_id
          and active_field.key = attribute.key and active_field.status = 'active'
      );
  end if;
  if requested_branch_id is not null and not exists (
    select 1 from public.branches branch
    where branch.id = requested_branch_id and branch.organization_id = requested_organization_id
      and branch.is_active
  ) then raise exception 'Branch not found.' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.object_definitions object_definition
    where object_definition.id = requested_object_definition_id
      and object_definition.organization_id = requested_organization_id
      and object_definition.status = 'active'
  ) then raise exception 'Object definition not found.' using errcode = '22023'; end if;

  for field in
    select * from public.field_definitions definition
    where definition.organization_id = requested_organization_id
      and definition.object_definition_id = requested_object_definition_id
      and definition.status = 'active'
      and definition.config ? 'defaultValue'
  loop
    if not normalized_attributes ? field.key then
      normalized_attributes := jsonb_set(
        normalized_attributes, array[field.key], field.config -> 'defaultValue', true
      );
    end if;
  end loop;
  if not private.object_attributes_are_valid(
    requested_organization_id, requested_object_definition_id, normalized_attributes
  ) then raise exception 'Invalid object record attributes.' using errcode = '22023'; end if;

  select definition.* into title_field
  from public.field_definitions definition
  where definition.organization_id = requested_organization_id
    and definition.object_definition_id = requested_object_definition_id
    and definition.status = 'active'
    and definition.data_type in ('text', 'textarea', 'email', 'phone', 'select', 'status')
    and normalized_attributes ? definition.key
  order by definition.sort_order, definition.id
  limit 1;
  resolved_display_value := case when found
    then left(normalized_attributes ->> title_field.key, 200)
    else 'Record ' || left(target_id::text, 8)
  end;

  insert into public.object_records (
    id, organization_id, object_definition_id, branch_id, display_value,
    attributes, created_by, updated_by
  ) values (
    target_id, requested_organization_id, requested_object_definition_id,
    requested_branch_id, resolved_display_value,
    historical_attributes || normalized_attributes, (select auth.uid()), (select auth.uid())
  )
  on conflict (id) do update set
    branch_id = excluded.branch_id,
    display_value = excluded.display_value,
    attributes = excluded.attributes,
    updated_by = (select auth.uid());

  delete from private.object_record_unique_values unique_value
  where unique_value.record_id = target_id;
  insert into private.object_record_unique_values (
    organization_id, field_definition_id, record_id, canonical_value
  )
  select requested_organization_id, definition.id, target_id,
    private.canonical_object_value(definition.data_type, normalized_attributes -> definition.key)
  from public.field_definitions definition
  where definition.organization_id = requested_organization_id
    and definition.object_definition_id = requested_object_definition_id
    and definition.status = 'active' and definition.is_unique
    and normalized_attributes ? definition.key;
  return target_id;
end;
$$;

revoke all on function private.create_dynamic_object(uuid, text, text, text, text),
  private.upsert_object_field(uuid, uuid, text, text, text, boolean, boolean, jsonb, uuid),
  private.reorder_object_fields(uuid, uuid, uuid[]),
  private.archive_object_field(uuid, uuid, uuid),
  private.save_object_record(uuid, uuid, uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function private.create_dynamic_object(uuid, text, text, text, text),
  private.upsert_object_field(uuid, uuid, text, text, text, boolean, boolean, jsonb, uuid),
  private.reorder_object_fields(uuid, uuid, uuid[]),
  private.archive_object_field(uuid, uuid, uuid),
  private.save_object_record(uuid, uuid, uuid, jsonb, uuid)
  to authenticated;

create function public.create_dynamic_object(
  requested_organization_id uuid, requested_key text, requested_singular_label text,
  requested_plural_label text, requested_description text default ''
) returns uuid language sql security invoker set search_path = '' as $$
  select private.create_dynamic_object(requested_organization_id, requested_key, requested_singular_label, requested_plural_label, requested_description);
$$;
create function public.upsert_object_field(
  requested_organization_id uuid, requested_object_definition_id uuid,
  requested_key text, requested_label text, requested_type text,
  requested_required boolean, requested_unique boolean, requested_config jsonb,
  requested_field_id uuid default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.upsert_object_field(requested_organization_id, requested_object_definition_id, requested_key, requested_label, requested_type, requested_required, requested_unique, requested_config, requested_field_id);
$$;
create function public.reorder_object_fields(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_field_ids uuid[]
) returns void language sql security invoker set search_path = '' as $$
  select private.reorder_object_fields(requested_organization_id, requested_object_definition_id, requested_field_ids);
$$;
create function public.archive_object_field(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_field_id uuid
) returns void language sql security invoker set search_path = '' as $$
  select private.archive_object_field(requested_organization_id, requested_object_definition_id, requested_field_id);
$$;
create function public.save_object_record(
  requested_organization_id uuid, requested_object_definition_id uuid,
  requested_branch_id uuid default null, requested_attributes jsonb default '{}'::jsonb,
  requested_record_id uuid default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.save_object_record(requested_organization_id, requested_object_definition_id, requested_branch_id, requested_attributes, requested_record_id);
$$;

create function public.list_object_records_page(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_cursor_created_at timestamptz default null,
  requested_cursor_id uuid default null,
  requested_limit integer default 50
)
returns setof public.object_records
language sql
stable
security invoker
set search_path = ''
as $$
  select record.*
  from public.object_records record
  where record.organization_id = requested_organization_id
    and record.object_definition_id = requested_object_definition_id
    and record.status = 'active'
    and (
      requested_cursor_created_at is null
      or (record.created_at, record.id) < (requested_cursor_created_at, requested_cursor_id)
    )
  order by record.created_at desc, record.id desc
  limit least(greatest(requested_limit, 1), 100);
$$;

revoke all on function public.create_dynamic_object(uuid, text, text, text, text),
  public.upsert_object_field(uuid, uuid, text, text, text, boolean, boolean, jsonb, uuid),
  public.reorder_object_fields(uuid, uuid, uuid[]),
  public.archive_object_field(uuid, uuid, uuid),
  public.save_object_record(uuid, uuid, uuid, jsonb, uuid),
  public.list_object_records_page(uuid, uuid, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.create_dynamic_object(uuid, text, text, text, text),
  public.upsert_object_field(uuid, uuid, text, text, text, boolean, boolean, jsonb, uuid),
  public.reorder_object_fields(uuid, uuid, uuid[]),
  public.archive_object_field(uuid, uuid, uuid),
  public.save_object_record(uuid, uuid, uuid, jsonb, uuid),
  public.list_object_records_page(uuid, uuid, timestamptz, uuid, integer)
  to authenticated;

comment on table public.object_records is
  'Shared tenant-isolated runtime records. Configurable attributes live in validated JSONB; system fields remain indexed columns.';
comment on table private.object_record_unique_values is
  'Internal normalized projection enforcing uniqueness for dynamic fields without per-tenant DDL.';
