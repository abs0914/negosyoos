-- Phase 2, Module 7: declarative dynamic forms generated from object metadata.
-- Layout JSON is data only. No executable JavaScript, SQL, or expressions are accepted.

insert into public.permissions (key, domain, action, description) values
  ('form.read', 'form', 'read', 'View and use metadata-driven forms'),
  ('form.manage', 'form', 'manage', 'Create and configure metadata-driven forms')
on conflict (key) do update set description = excluded.description;

create or replace function private.install_object_permissions(requested_organization_id uuid)
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
    when 'owner' then array['record.read', 'record.create', 'record.update', 'form.read', 'form.manage']
    when 'administrator' then array['record.read', 'record.create', 'record.update', 'form.read', 'form.manage']
    when 'manager' then array['record.read', 'record.create', 'record.update', 'form.read']
    when 'cashier' then array['record.read', 'record.create', 'record.update', 'form.read']
    when 'staff' then array['record.read', 'record.create', 'record.update', 'form.read']
    when 'viewer' then array['record.read', 'form.read']
    else array[]::text[]
  end)
  where role.organization_id = requested_organization_id and role.is_system
  on conflict do nothing;
end;
$$;

revoke all on function private.install_object_permissions(uuid) from public, anon, authenticated;

do $$ declare organization_row record;
begin
  for organization_row in select id from public.organizations loop
    perform private.install_object_permissions(organization_row.id);
  end loop;
end $$;

alter table public.form_definitions rename column label to name;
alter table public.form_definitions
  add column description text,
  add column mode text not null default 'create' check (mode in ('create', 'edit')),
  add column created_by uuid references auth.users(id),
  add column updated_by uuid references auth.users(id),
  add constraint form_definitions_name_length check (char_length(name) between 1 and 120),
  add constraint form_definitions_description_length check (char_length(description) <= 500),
  add constraint form_definitions_key_length check (char_length(key) <= 64);
update public.form_definitions definition set
  created_by = organization.created_by,
  updated_by = organization.created_by
from public.organizations organization
where organization.id = definition.organization_id;
alter table public.form_definitions
  alter column created_by set not null,
  alter column updated_by set not null;

create table public.form_layouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  form_definition_id uuid not null,
  version integer not null default 1 check (version > 0),
  sections jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, form_definition_id),
  foreign key (organization_id, form_definition_id)
    references public.form_definitions(organization_id, id) on delete cascade
);

insert into public.form_layouts (organization_id, form_definition_id, sections)
select definition.organization_id, definition.id,
  jsonb_build_array(jsonb_build_object(
    'key', 'details', 'title', 'Details', 'description', '', 'columns', 1,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fieldId', field.id, 'width', 'full', 'required', false, 'readOnly', false
      ) order by field.sort_order, field.id)
      from public.field_definitions field
      where field.organization_id = definition.organization_id
        and field.object_definition_id = definition.object_definition_id
        and field.status = 'active'
        and coalesce(field.config ->> 'visibility', 'visible') = 'visible'
    ), '[]'::jsonb)
  ))
from public.form_definitions definition
where exists (
  select 1 from public.field_definitions field
  where field.organization_id = definition.organization_id
    and field.object_definition_id = definition.object_definition_id
    and field.status = 'active'
    and coalesce(field.config ->> 'visibility', 'visible') = 'visible'
);
alter table public.form_definitions drop column sections;

create index form_definitions_active_object_idx
  on public.form_definitions (organization_id, object_definition_id, mode, name, id)
  where status = 'active';
create index form_definitions_created_by_idx on public.form_definitions (created_by);
create index form_definitions_updated_by_idx on public.form_definitions (updated_by);

create trigger set_updated_at before update on public.form_layouts
  for each row execute function private.set_updated_at();
create trigger prevent_tenant_reassignment before update on public.form_layouts
  for each row execute function private.prevent_tenant_reassignment();

create function private.prevent_form_parent_reassignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.object_definition_id <> old.object_definition_id or new.key <> old.key then
    raise exception 'Form object and key cannot be reassigned.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger prevent_form_parent_reassignment before update on public.form_definitions
  for each row execute function private.prevent_form_parent_reassignment();

create function private.prevent_form_layout_parent_reassignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.form_definition_id <> old.form_definition_id then
    raise exception 'Form layout parent cannot be reassigned.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger prevent_form_layout_parent_reassignment before update on public.form_layouts
  for each row execute function private.prevent_form_layout_parent_reassignment();

revoke all on function private.prevent_form_parent_reassignment(),
  private.prevent_form_layout_parent_reassignment() from public, anon, authenticated;

alter table public.form_definitions enable row level security;
alter table public.form_layouts enable row level security;

drop policy form_definitions_select_authorized on public.form_definitions;
drop policy form_definitions_insert_authorized on public.form_definitions;
drop policy form_definitions_update_authorized on public.form_definitions;
drop policy form_definitions_delete_authorized on public.form_definitions;

create policy form_definitions_select on public.form_definitions for select to authenticated
using (
  private.can_business_permission(organization_id, 'form.read', null)
  or private.can_business_permission(organization_id, 'form.manage', null)
);
create policy form_layouts_select on public.form_layouts for select to authenticated
using (
  private.can_business_permission(organization_id, 'form.read', null)
  or private.can_business_permission(organization_id, 'form.manage', null)
);

revoke all on table public.form_definitions, public.form_layouts from public, anon, authenticated;
grant select on table public.form_definitions, public.form_layouts to authenticated;

create function private.form_layout_is_valid(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_mode text,
  requested_sections jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  section jsonb;
  layout_field jsonb;
  visibility_rule jsonb;
  condition jsonb;
  field_row record;
  source_row record;
  field_id uuid;
  source_id uuid;
  encountered_ids uuid[] := array[]::uuid[];
  section_keys text[] := array[]::text[];
  field_count integer := 0;
begin
  if requested_mode not in ('create', 'edit')
    or jsonb_typeof(requested_sections) is distinct from 'array'
    or jsonb_array_length(requested_sections) not between 1 and 20 then return false; end if;

  for section in select value from jsonb_array_elements(requested_sections) loop
    if jsonb_typeof(section) is distinct from 'object'
      or section - array['key', 'title', 'description', 'columns', 'fields']::text[] <> '{}'::jsonb
      or jsonb_typeof(section -> 'key') is distinct from 'string'
      or (section ->> 'key') !~ '^[a-z][a-z0-9_]{0,63}$'
      or section ->> 'key' = any(section_keys)
      or jsonb_typeof(section -> 'title') is distinct from 'string'
      or char_length(section ->> 'title') not between 1 and 120
      or jsonb_typeof(section -> 'description') is distinct from 'string'
      or char_length(section ->> 'description') > 500
      or jsonb_typeof(section -> 'columns') is distinct from 'number'
      or section ->> 'columns' not in ('1', '2')
      or jsonb_typeof(section -> 'fields') is distinct from 'array'
      or jsonb_array_length(section -> 'fields') not between 1 and 100 then return false; end if;
    section_keys := array_append(section_keys, section ->> 'key');

    for layout_field in select value from jsonb_array_elements(section -> 'fields') loop
      field_count := field_count + 1;
      if field_count > 200 or jsonb_typeof(layout_field) is distinct from 'object'
        or layout_field - array['fieldId', 'width', 'required', 'readOnly', 'defaultValue', 'visibilityRule']::text[] <> '{}'::jsonb
        or jsonb_typeof(layout_field -> 'fieldId') is distinct from 'string'
        or jsonb_typeof(layout_field -> 'width') is distinct from 'string'
        or layout_field ->> 'width' not in ('full', 'half')
        or jsonb_typeof(layout_field -> 'required') is distinct from 'boolean'
        or jsonb_typeof(layout_field -> 'readOnly') is distinct from 'boolean' then return false; end if;
      field_id := (layout_field ->> 'fieldId')::uuid;
      if field_id = any(encountered_ids) then return false; end if;
      select definition.* into field_row from public.field_definitions definition
      where definition.id = field_id and definition.organization_id = requested_organization_id
        and definition.object_definition_id = requested_object_definition_id
        and definition.status = 'active';
      if not found or coalesce(field_row.config ->> 'visibility', 'visible') = 'hidden' then return false; end if;
      if layout_field ? 'defaultValue' then
        if coalesce((field_row.config ->> 'readOnly')::boolean, false)
          or not private.object_value_is_valid(requested_organization_id, field_row.data_type, field_row.config, layout_field -> 'defaultValue')
        then return false; end if;
      end if;

      if layout_field ? 'visibilityRule' then
        visibility_rule := layout_field -> 'visibilityRule';
        if field_row.is_required and not field_row.config ? 'defaultValue' and not layout_field ? 'defaultValue' then return false; end if;
        if jsonb_typeof(visibility_rule) is distinct from 'object'
          or visibility_rule - array['logic', 'conditions']::text[] <> '{}'::jsonb
          or jsonb_typeof(visibility_rule -> 'logic') is distinct from 'string'
          or visibility_rule ->> 'logic' not in ('all', 'any')
          or jsonb_typeof(visibility_rule -> 'conditions') is distinct from 'array'
          or jsonb_array_length(visibility_rule -> 'conditions') not between 1 and 10 then return false; end if;
        for condition in select value from jsonb_array_elements(visibility_rule -> 'conditions') loop
          if jsonb_typeof(condition) is distinct from 'object'
            or condition - array['sourceFieldId', 'operator', 'value']::text[] <> '{}'::jsonb
            or jsonb_typeof(condition -> 'sourceFieldId') is distinct from 'string'
            or jsonb_typeof(condition -> 'operator') is distinct from 'string'
            or condition ->> 'operator' not in ('equals', 'not_equals', 'is_empty', 'is_not_empty') then return false; end if;
          source_id := (condition ->> 'sourceFieldId')::uuid;
          if not source_id = any(encountered_ids) then return false; end if;
          select definition.* into source_row from public.field_definitions definition
          where definition.id = source_id and definition.organization_id = requested_organization_id
            and definition.object_definition_id = requested_object_definition_id and definition.status = 'active';
          if not found then return false; end if;
          if condition ->> 'operator' in ('equals', 'not_equals') then
            if not condition ? 'value'
              or not private.object_value_is_valid(requested_organization_id, source_row.data_type, source_row.config, condition -> 'value')
            then return false; end if;
          elsif condition ? 'value' then return false;
          end if;
        end loop;
      end if;
      encountered_ids := array_append(encountered_ids, field_id);
    end loop;
  end loop;

  if requested_mode = 'create' and exists (
    select 1 from public.field_definitions definition
    where definition.organization_id = requested_organization_id
      and definition.object_definition_id = requested_object_definition_id
      and definition.status = 'active' and definition.is_required
      and coalesce(definition.config ->> 'visibility', 'visible') = 'visible'
      and not coalesce((definition.config ->> 'readOnly')::boolean, false)
      and not definition.config ? 'defaultValue'
      and not definition.id = any(encountered_ids)
  ) then return false; end if;
  return true;
exception when others then return false;
end;
$$;

revoke all on function private.form_layout_is_valid(uuid, uuid, text, jsonb) from public, anon, authenticated;

create function private.save_dynamic_form(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_key text,
  requested_name text,
  requested_description text,
  requested_mode text,
  requested_sections jsonb,
  requested_form_definition_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid := coalesce(requested_form_definition_id, gen_random_uuid());
begin
  if (select auth.uid()) is null
    or not private.can_business_permission(requested_organization_id, 'form.manage', null)
  then raise exception 'Permission denied.' using errcode = '42501'; end if;
  if requested_key !~ '^[a-z][a-z0-9_]{0,63}$'
    or char_length(btrim(requested_name)) not between 1 and 120
    or char_length(coalesce(requested_description, '')) > 500
    or requested_mode not in ('create', 'edit')
  then raise exception 'Invalid form definition.' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.object_definitions definition where definition.id = requested_object_definition_id
      and definition.organization_id = requested_organization_id and definition.status = 'active'
  ) then raise exception 'Object definition not found.' using errcode = '22023'; end if;
  if requested_form_definition_id is not null and not exists (
    select 1 from public.form_definitions definition where definition.id = requested_form_definition_id
      and definition.organization_id = requested_organization_id
      and definition.object_definition_id = requested_object_definition_id
      and definition.key = requested_key and definition.status = 'active'
  ) then raise exception 'Form definition not found.' using errcode = '22023'; end if;
  if not private.form_layout_is_valid(requested_organization_id, requested_object_definition_id, requested_mode, requested_sections)
  then raise exception 'Invalid form layout.' using errcode = '22023'; end if;

  insert into public.form_definitions (
    id, organization_id, object_definition_id, key, name, description, mode, created_by, updated_by
  ) values (
    target_id, requested_organization_id, requested_object_definition_id, requested_key,
    btrim(requested_name), nullif(btrim(requested_description), ''), requested_mode, (select auth.uid()), (select auth.uid())
  ) on conflict (id) do update set
    name = excluded.name, description = excluded.description, mode = excluded.mode,
    updated_by = (select auth.uid());

  insert into public.form_layouts (organization_id, form_definition_id, sections)
  values (requested_organization_id, target_id, requested_sections)
  on conflict (organization_id, form_definition_id) do update set
    sections = excluded.sections, version = public.form_layouts.version + 1;
  return target_id;
end;
$$;

revoke all on function private.save_dynamic_form(uuid, uuid, text, text, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function private.save_dynamic_form(uuid, uuid, text, text, text, text, jsonb, uuid)
  to authenticated;

create function public.save_dynamic_form(
  requested_organization_id uuid,
  requested_object_definition_id uuid,
  requested_key text,
  requested_name text,
  requested_description text,
  requested_mode text,
  requested_sections jsonb,
  requested_form_definition_id uuid default null
)
returns uuid language sql security invoker set search_path = '' as $$
  select private.save_dynamic_form(
    requested_organization_id, requested_object_definition_id, requested_key, requested_name,
    requested_description, requested_mode, requested_sections, requested_form_definition_id
  );
$$;

revoke all on function public.save_dynamic_form(uuid, uuid, text, text, text, text, jsonb, uuid)
  from public, anon;
grant execute on function public.save_dynamic_form(uuid, uuid, text, text, text, text, jsonb, uuid)
  to authenticated;
