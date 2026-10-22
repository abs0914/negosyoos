-- Module 3: Business (tenant) management.
-- `organizations` remains the canonical persistence name; application models expose it as Business.

alter table public.organizations
  add column business_type text not null default 'sole_proprietorship'
    check (business_type in ('sole_proprietorship', 'partnership', 'corporation', 'cooperative', 'other')),
  add column address jsonb not null default '{}'::jsonb
    check (jsonb_typeof(address) = 'object'),
  add column phone text,
  add column email text,
  add column logo_path text,
  add column tax_identifiers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(tax_identifiers) = 'object'),
  add column status text not null default 'active'
    check (status in ('active', 'suspended', 'archived'));

update public.organizations
set industry_code = 'general'
where industry_code is null;

alter table public.organizations
  alter column industry_code set not null,
  add constraint organizations_slug_length check (length(slug) <= 64),
  add constraint organizations_legal_name_length check (length(legal_name) <= 200),
  add constraint organizations_trade_name_length check (length(display_name) <= 200),
  add constraint organizations_industry_format
    check (industry_code ~ '^[a-z][a-z0-9-]*$' and length(industry_code) <= 80),
  add constraint organizations_address_size check (pg_column_size(address) <= 16384),
  add constraint organizations_tax_identifiers_size check (pg_column_size(tax_identifiers) <= 4096),
  add constraint organizations_phone_format
    check (phone is null or (length(phone) <= 16 and phone ~ '^\+[1-9][0-9]{7,14}$')),
  add constraint organizations_email_format
    check (email is null or (length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add constraint organizations_logo_path_format
    check (logo_path is null or logo_path ~ ('^' || id::text || '/')),
  add constraint organizations_tax_identifier_keys
    check (tax_identifiers - array['tin', 'registration_number'] = '{}'::jsonb);

alter table public.branches
  add constraint branches_code_format
    check (code ~ '^[a-z][a-z0-9-]*$' and length(code) <= 40),
  add constraint branches_name_length check (length(trim(name)) between 2 and 160),
  add constraint branches_address_size check (pg_column_size(address) <= 16384);

create table public.business_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  locale text not null default 'en-PH' check (locale in ('en-PH', 'fil-PH')),
  date_format text not null default 'MM/dd/yyyy'
    check (date_format in ('MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd')),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  fiscal_year_start_month smallint not null default 1
    check (fiscal_year_start_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.business_settings
  for each row execute function private.set_updated_at();

create function private.prevent_tenant_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id then
    raise exception 'organization_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_tenant_reassignment() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'branches', 'organization_memberships', 'roles', 'organization_modules',
    'object_definitions', 'field_definitions', 'relationship_definitions',
    'view_definitions', 'form_definitions', 'workflow_definitions',
    'report_definitions', 'dashboard_definitions', 'ai_configurations',
    'subscriptions', 'organization_configuration_revisions',
    'configuration_change_sets', 'business_settings'
  ] loop
    execute format(
      'create trigger prevent_tenant_reassignment before update on public.%I for each row execute function private.prevent_tenant_reassignment()',
      table_name
    );
  end loop;
end;
$$;

create function private.prevent_business_owner_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_business_owner_reassignment() from public, anon, authenticated;

create trigger prevent_business_owner_reassignment
  before update on public.organizations
  for each row execute function private.prevent_business_owner_reassignment();

drop policy organizations_select_member on public.organizations;
drop policy organizations_insert_creator on public.organizations;

create policy organizations_select_active_member on public.organizations
  for select to authenticated
  using (private.is_organization_member(id));

create policy business_settings_select_authorized on public.business_settings
  for select to authenticated
  using (private.has_organization_permission(organization_id, 'organization.read'));

create policy business_settings_update_authorized on public.business_settings
  for update to authenticated
  using (private.has_organization_permission(organization_id, 'organization.update'))
  with check (private.has_organization_permission(organization_id, 'organization.update'));

alter table public.business_settings enable row level security;

create or replace function private.has_organization_permission(
  requested_organization_id uuid,
  requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    join public.membership_roles membership_role on membership_role.membership_id = membership.id
    join public.roles role on role.id = membership_role.role_id
      and role.organization_id = membership.organization_id
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where membership.organization_id = requested_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and permission.key = requested_permission
  );
$$;

create function public.create_business(
  requested_slug text,
  requested_legal_name text,
  requested_trade_name text,
  requested_business_type text,
  requested_industry text,
  requested_address jsonb,
  requested_phone text default null,
  requested_email text default null,
  requested_tax_identifiers jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  business_id uuid;
  owner_role_id uuid;
  membership_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  insert into public.organizations (
    slug, legal_name, display_name, business_type, industry_code,
    country_code, currency_code, timezone, address, phone, email,
    tax_identifiers, status, created_by
  ) values (
    requested_slug, trim(requested_legal_name), trim(requested_trade_name),
    requested_business_type, requested_industry, 'PH', 'PHP', 'Asia/Manila',
    coalesce(requested_address, '{}'::jsonb), nullif(trim(requested_phone), ''),
    nullif(lower(trim(requested_email)), ''), coalesce(requested_tax_identifiers, '{}'::jsonb),
    'active', caller_id
  ) returning id into business_id;

  insert into public.business_settings (organization_id) values (business_id);

  insert into public.organization_memberships (
    organization_id, user_id, status, joined_at
  ) values (
    business_id, caller_id, 'active', now()
  ) returning id into membership_id;

  insert into public.roles (
    organization_id, key, name, description, is_system
  ) values (
    business_id, 'owner', 'Owner', 'Full business access', true
  ) returning id into owner_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select owner_role_id, permission.id from public.permissions permission;

  insert into public.membership_roles (membership_id, role_id)
  values (membership_id, owner_role_id);

  insert into public.branches (
    organization_id, code, name, timezone, address, is_active
  ) values (
    business_id, 'main', 'Main Branch', 'Asia/Manila',
    coalesce(requested_address, '{}'::jsonb), true
  );

  return business_id;
end;
$$;

revoke all on function public.create_business(text, text, text, text, text, jsonb, text, text, jsonb)
  from public, anon;
grant execute on function public.create_business(text, text, text, text, text, jsonb, text, text, jsonb)
  to authenticated;

revoke all on public.business_settings from anon;
grant select, update on public.business_settings to authenticated;

revoke insert on public.organizations from authenticated;

create index organizations_active_trade_name_idx
  on public.organizations (display_name)
  where status = 'active';
create index memberships_active_user_business_idx
  on public.organization_memberships (user_id, organization_id)
  where status = 'active';
create index branches_active_business_name_idx
  on public.branches (organization_id, name)
  where is_active;

comment on table public.organizations is
  'Canonical Business tenant records. Application code uses Business naming while persistence retains organization_id as the hard tenant key.';
comment on table public.business_settings is
  'One-to-one operational defaults for a Business tenant.';
comment on function public.create_business(text, text, text, text, text, jsonb, text, text, jsonb) is
  'Atomically creates a Business, owner membership and role, settings, and main branch for the authenticated caller.';
