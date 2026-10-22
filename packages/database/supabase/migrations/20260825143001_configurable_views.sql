-- Module 8: metadata-defined table, card, and kanban views.
-- Configuration remains a bounded JSON document and never contains SQL or executable expressions.

alter table public.view_definitions rename column label to name;
alter table public.view_definitions rename column field_keys to selected_columns;

alter table public.view_definitions
  add column description text,
  add column view_type text not null default 'table'
    check (view_type in ('table', 'cards', 'kanban')),
  add column configuration jsonb not null default '{
    "sorting": [],
    "savedFilters": [],
    "search": {"enabled": true, "fieldKeys": ["record"], "placeholder": "Search records…"},
    "pagination": {"pageSize": 25},
    "branchFiltering": {"enabled": false, "required": false}
  }'::jsonb check (jsonb_typeof(configuration) = 'object'),
  add column owner_user_id uuid references auth.users(id) on delete cascade,
  add column scope text not null default 'shared' check (scope in ('personal', 'shared'));

update public.view_definitions view
set owner_user_id = organization.created_by
from public.organizations organization
where organization.id = view.organization_id and view.owner_user_id is null;

update public.view_definitions
set filters = jsonb_build_object('logic', 'all', 'filters', filters)
where jsonb_typeof(filters) = 'array';

alter table public.view_definitions
  alter column owner_user_id set not null,
  alter column filters set default '{"logic":"all","filters":[]}'::jsonb,
  drop constraint view_definitions_field_keys_check;

alter table public.view_definitions
  add constraint view_definitions_selected_columns_check
    check (cardinality(selected_columns) between 1 and 50),
  add constraint view_definitions_name_length_check check (char_length(name) between 1 and 120),
  add constraint view_definitions_description_length_check check (char_length(description) <= 500),
  add constraint view_definitions_key_length_check check (char_length(key) <= 64),
  add constraint view_definitions_filters_shape_check
    check (
      jsonb_typeof(filters) = 'object'
      and filters ? 'logic'
      and filters ? 'filters'
      and jsonb_typeof(filters -> 'filters') = 'array'
      and jsonb_array_length(filters -> 'filters') <= 25
    ),
  add constraint view_definitions_configuration_shape_check
    check (
      configuration ?& array['sorting', 'savedFilters', 'search', 'pagination', 'branchFiltering']
      and jsonb_typeof(configuration -> 'sorting') = 'array'
      and jsonb_typeof(configuration -> 'savedFilters') = 'array'
      and jsonb_typeof(configuration -> 'search') = 'object'
      and jsonb_typeof(configuration -> 'pagination') = 'object'
      and jsonb_typeof(configuration -> 'branchFiltering') = 'object'
    );

create index view_definitions_object_scope_idx
  on public.view_definitions (organization_id, object_definition_id, scope, owner_user_id, name)
  where status = 'active';

drop policy if exists view_definitions_select_authorized on public.view_definitions;
drop policy if exists view_definitions_insert_authorized on public.view_definitions;
drop policy if exists view_definitions_update_authorized on public.view_definitions;
drop policy if exists view_definitions_delete_authorized on public.view_definitions;

create policy view_definitions_select_authorized on public.view_definitions
for select to authenticated using (
  (scope = 'shared' and (
    private.has_organization_permission(organization_id, 'record.read')
    or private.has_organization_permission(organization_id, 'metadata.read')
    or private.has_organization_permission(organization_id, 'metadata.manage')
  ))
  or (scope = 'personal' and owner_user_id = (select auth.uid())
    and private.has_organization_permission(organization_id, 'record.read'))
);

create policy view_definitions_insert_authorized on public.view_definitions
for insert to authenticated with check (
  owner_user_id = (select auth.uid()) and (
    (scope = 'personal' and private.has_organization_permission(organization_id, 'record.read'))
    or (scope = 'shared' and private.has_organization_permission(organization_id, 'metadata.manage'))
  )
);

create policy view_definitions_update_authorized on public.view_definitions
for update to authenticated using (
  (scope = 'personal' and owner_user_id = (select auth.uid())
    and private.has_organization_permission(organization_id, 'record.read'))
  or private.has_organization_permission(organization_id, 'metadata.manage')
) with check (
  (scope = 'personal' and owner_user_id = (select auth.uid())
    and private.has_organization_permission(organization_id, 'record.read'))
  or (scope = 'shared' and private.has_organization_permission(organization_id, 'metadata.manage'))
);

create policy view_definitions_delete_authorized on public.view_definitions
for delete to authenticated using (
  (scope = 'personal' and owner_user_id = (select auth.uid())
    and private.has_organization_permission(organization_id, 'record.read'))
  or private.has_organization_permission(organization_id, 'metadata.manage')
);

create function private.view_field_key_is_valid(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_key text
) returns boolean language sql stable security definer set search_path = '' as $$
  select requested_key in ('record', 'branch', 'created_at', 'updated_at') or exists (
    select 1 from public.field_definitions field
    where field.organization_id = requested_organization_id
      and field.object_definition_id = requested_object_definition_id
      and field.key = requested_key and field.status = 'active'
  );
$$;

create function private.view_filter_group_is_valid(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_group jsonb
) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare filter_item jsonb; operator_name text;
begin
  if jsonb_typeof(requested_group) is distinct from 'object'
    or requested_group - array['logic', 'filters']::text[] <> '{}'::jsonb
    or requested_group ->> 'logic' not in ('all', 'any')
    or jsonb_typeof(requested_group -> 'filters') is distinct from 'array'
    or jsonb_array_length(requested_group -> 'filters') > 25 then return false; end if;
  for filter_item in select value from jsonb_array_elements(requested_group -> 'filters') loop
    operator_name := filter_item ->> 'operator';
    if jsonb_typeof(filter_item) is distinct from 'object'
      or filter_item - array['fieldKey', 'operator', 'value']::text[] <> '{}'::jsonb
      or not private.view_field_key_is_valid(requested_organization_id, requested_object_definition_id, filter_item ->> 'fieldKey')
      or operator_name not in ('equals','not_equals','contains','not_contains','greater_than','greater_than_or_equal','less_than','less_than_or_equal','is_empty','is_not_empty','is_any_of','is_today')
      or ((operator_name in ('is_empty','is_not_empty','is_today')) = (filter_item ? 'value'))
      or (operator_name = 'is_any_of' and jsonb_typeof(filter_item -> 'value') is distinct from 'array')
    then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create function private.view_configuration_is_valid(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_type text,
  requested_columns text[], requested_filters jsonb, requested_configuration jsonb
) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare item jsonb; item_key text; saved_keys text[] := array[]::text[];
begin
  if requested_type not in ('table','cards','kanban')
    or cardinality(requested_columns) not between 1 and 50
    or cardinality(requested_columns) <> cardinality(array(select distinct value from unnest(requested_columns) value))
    or exists (select 1 from unnest(requested_columns) key where not private.view_field_key_is_valid(requested_organization_id, requested_object_definition_id, key))
    or not private.view_filter_group_is_valid(requested_organization_id, requested_object_definition_id, requested_filters)
    or jsonb_typeof(requested_configuration) is distinct from 'object'
    or requested_configuration - array['sorting','grouping','savedFilters','search','pagination','branchFiltering']::text[] <> '{}'::jsonb
    or not (requested_configuration ?& array['sorting','savedFilters','search','pagination','branchFiltering'])
    or jsonb_typeof(requested_configuration -> 'sorting') is distinct from 'array'
    or jsonb_array_length(requested_configuration -> 'sorting') > 5
  then return false; end if;
  for item in select value from jsonb_array_elements(requested_configuration -> 'sorting') loop
    if item - array['fieldKey','direction']::text[] <> '{}'::jsonb or item ->> 'direction' not in ('asc','desc')
      or not private.view_field_key_is_valid(requested_organization_id, requested_object_definition_id, item ->> 'fieldKey') then return false; end if;
  end loop;
  if requested_configuration ? 'grouping' then
    item := requested_configuration -> 'grouping';
    if jsonb_typeof(item) is distinct from 'object' or item - array['fieldKey','direction','showEmptyGroups']::text[] <> '{}'::jsonb
      or item ->> 'direction' not in ('asc','desc') or jsonb_typeof(item -> 'showEmptyGroups') is distinct from 'boolean'
      or not private.view_field_key_is_valid(requested_organization_id, requested_object_definition_id, item ->> 'fieldKey') then return false; end if;
  elsif requested_type = 'kanban' then return false; end if;
  if jsonb_typeof(requested_configuration -> 'savedFilters') is distinct from 'array'
    or jsonb_array_length(requested_configuration -> 'savedFilters') > 20 then return false; end if;
  for item in select value from jsonb_array_elements(requested_configuration -> 'savedFilters') loop
    item_key := item ->> 'key';
    if item - array['key','name','group']::text[] <> '{}'::jsonb or item_key !~ '^[a-z][a-z0-9_]{0,63}$'
      or item_key = any(saved_keys) or char_length(btrim(item ->> 'name')) not between 1 and 80
      or not private.view_filter_group_is_valid(requested_organization_id, requested_object_definition_id, item -> 'group') then return false; end if;
    saved_keys := array_append(saved_keys, item_key);
  end loop;
  item := requested_configuration -> 'search';
  if jsonb_typeof(item) is distinct from 'object' or item - array['enabled','fieldKeys','placeholder']::text[] <> '{}'::jsonb
    or jsonb_typeof(item -> 'enabled') is distinct from 'boolean' or jsonb_typeof(item -> 'fieldKeys') is distinct from 'array'
    or jsonb_array_length(item -> 'fieldKeys') > 25 or char_length(item ->> 'placeholder') > 120
    or exists (select 1 from jsonb_array_elements_text(item -> 'fieldKeys') key where not private.view_field_key_is_valid(requested_organization_id, requested_object_definition_id, key)) then return false; end if;
  item := requested_configuration -> 'pagination';
  if item - array['pageSize']::text[] <> '{}'::jsonb or jsonb_typeof(item -> 'pageSize') is distinct from 'number'
    or (item ->> 'pageSize')::integer not between 5 and 100 then return false; end if;
  item := requested_configuration -> 'branchFiltering';
  if item - array['enabled','required','defaultBranchId']::text[] <> '{}'::jsonb
    or jsonb_typeof(item -> 'enabled') is distinct from 'boolean' or jsonb_typeof(item -> 'required') is distinct from 'boolean'
    or (not (item ->> 'enabled')::boolean and ((item ->> 'required')::boolean or item ? 'defaultBranchId'))
    or (item ? 'defaultBranchId' and not exists (select 1 from public.branches branch where branch.id = (item ->> 'defaultBranchId')::uuid and branch.organization_id = requested_organization_id))
  then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create function private.save_dynamic_view(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_key text,
  requested_name text, requested_description text, requested_type text, requested_columns text[],
  requested_filters jsonb, requested_configuration jsonb, requested_scope text,
  requested_view_definition_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare target_id uuid := coalesce(requested_view_definition_id, gen_random_uuid()); existing_owner uuid;
begin
  if (select auth.uid()) is null or requested_scope not in ('personal','shared') then raise exception 'Permission denied.' using errcode = '42501'; end if;
  if (requested_scope = 'shared' and not private.can_business_permission(requested_organization_id, 'metadata.manage', null))
    or (requested_scope = 'personal' and not private.can_business_permission(requested_organization_id, 'record.read', null))
  then raise exception 'Permission denied.' using errcode = '42501'; end if;
  if requested_key !~ '^[a-z][a-z0-9_]{0,63}$' or char_length(btrim(requested_name)) not between 1 and 120
    or char_length(coalesce(requested_description,'')) > 500
    or not private.view_configuration_is_valid(requested_organization_id, requested_object_definition_id, requested_type, requested_columns, requested_filters, requested_configuration)
  then raise exception 'Invalid view definition.' using errcode = '22023'; end if;
  if not exists (select 1 from public.object_definitions object where object.id = requested_object_definition_id and object.organization_id = requested_organization_id and object.status = 'active')
  then raise exception 'Object definition not found.' using errcode = '22023'; end if;
  if requested_view_definition_id is not null then
    select owner_user_id into existing_owner from public.view_definitions view where view.id = requested_view_definition_id
      and view.organization_id = requested_organization_id and view.object_definition_id = requested_object_definition_id
      and view.key = requested_key and view.status = 'active';
    if not found or (existing_owner <> (select auth.uid()) and not private.can_business_permission(requested_organization_id, 'metadata.manage', null))
    then raise exception 'View definition not found.' using errcode = '22023'; end if;
  end if;
  insert into public.view_definitions (id, organization_id, object_definition_id, key, name, description, view_type, selected_columns, filters, configuration, owner_user_id, scope)
  values (target_id, requested_organization_id, requested_object_definition_id, requested_key, btrim(requested_name), nullif(btrim(requested_description),''), requested_type, requested_columns, requested_filters, requested_configuration, (select auth.uid()), requested_scope)
  on conflict (id) do update set name = excluded.name, description = excluded.description, view_type = excluded.view_type,
    selected_columns = excluded.selected_columns, filters = excluded.filters, configuration = excluded.configuration, scope = excluded.scope;
  return target_id;
end;
$$;

create function public.save_dynamic_view(
  requested_organization_id uuid, requested_object_definition_id uuid, requested_key text,
  requested_name text, requested_description text, requested_type text, requested_columns text[],
  requested_filters jsonb, requested_configuration jsonb, requested_scope text,
  requested_view_definition_id uuid default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.save_dynamic_view(requested_organization_id, requested_object_definition_id, requested_key, requested_name,
    requested_description, requested_type, requested_columns, requested_filters, requested_configuration, requested_scope, requested_view_definition_id);
$$;

create function private.archive_dynamic_view(requested_organization_id uuid, requested_view_definition_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_owner uuid; target_scope text;
begin
  select owner_user_id, scope into target_owner, target_scope from public.view_definitions view
  where view.id = requested_view_definition_id and view.organization_id = requested_organization_id and view.status = 'active';
  if not found or (target_scope = 'shared' and not private.can_business_permission(requested_organization_id, 'metadata.manage', null))
    or (target_scope = 'personal' and target_owner <> (select auth.uid()) and not private.can_business_permission(requested_organization_id, 'metadata.manage', null))
  then raise exception 'Permission denied.' using errcode = '42501'; end if;
  update public.view_definitions set status = 'archived' where id = requested_view_definition_id and organization_id = requested_organization_id;
end;
$$;

create function public.archive_dynamic_view(requested_organization_id uuid, requested_view_definition_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.archive_dynamic_view(requested_organization_id, requested_view_definition_id);
$$;

revoke all on function private.view_field_key_is_valid(uuid,uuid,text), private.view_filter_group_is_valid(uuid,uuid,jsonb),
  private.view_configuration_is_valid(uuid,uuid,text,text[],jsonb,jsonb),
  private.save_dynamic_view(uuid,uuid,text,text,text,text,text[],jsonb,jsonb,text,uuid),
  private.archive_dynamic_view(uuid,uuid) from public, anon, authenticated;
revoke insert, update, delete on public.view_definitions from authenticated;
grant select on public.view_definitions to authenticated;
revoke all on function public.save_dynamic_view(uuid,uuid,text,text,text,text,text[],jsonb,jsonb,text,uuid) from public, anon;
grant execute on function public.save_dynamic_view(uuid,uuid,text,text,text,text,text[],jsonb,jsonb,text,uuid) to authenticated;
revoke all on function public.archive_dynamic_view(uuid,uuid) from public, anon;
grant execute on function public.archive_dynamic_view(uuid,uuid) to authenticated;

comment on table public.view_definitions is
  'Validated metadata for reusable table, cards, and kanban record views, including personal and shared visibility.';
