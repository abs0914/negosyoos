-- NegosyoOS platform foundation. Industry business modules intentionally live in later migrations.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  locale text not null default 'en-PH',
  timezone text not null default 'Asia/Manila',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  legal_name text not null check (length(trim(legal_name)) > 0),
  display_name text not null check (length(trim(display_name)) > 0),
  industry_code text,
  timezone text not null default 'Asia/Manila',
  currency_code char(3) not null default 'PHP',
  country_code char(2) not null default 'PH',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  timezone text not null default 'Asia/Manila',
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  joined_at timestamptz,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, user_id),
  check ((status = 'active' and joined_at is not null) or status <> 'active')
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, key)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$'),
  domain text not null,
  action text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain, action)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.membership_roles (
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create table public.module_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9-]*$'),
  name text not null,
  description text not null,
  version integer not null default 1 check (version > 0),
  manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_os_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  description text not null,
  industry_code text not null,
  version integer not null default 1 check (version > 0),
  manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version)
);

create table public.business_os_template_modules (
  template_id uuid not null references public.business_os_templates(id) on delete cascade,
  module_id uuid not null references public.module_definitions(id) on delete restrict,
  sort_order integer not null default 0,
  default_config jsonb not null default '{}'::jsonb check (jsonb_typeof(default_config) = 'object'),
  created_at timestamptz not null default now(),
  primary key (template_id, module_id)
);

create table public.organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.module_definitions(id) on delete restrict,
  source_template_id uuid references public.business_os_templates(id) on delete set null,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  enabled_at timestamptz not null default now(),
  enabled_by uuid not null references auth.users(id),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, module_id)
);

create table public.object_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid references public.module_definitions(id) on delete set null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  singular_label text not null,
  plural_label text not null,
  description text,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, key)
);

create table public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  object_definition_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  data_type text not null check (data_type in ('text', 'long_text', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'select', 'multi_select', 'reference', 'json')),
  is_required boolean not null default false,
  is_unique boolean not null default false,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, object_definition_id, key),
  foreign key (object_definition_id, organization_id)
    references public.object_definitions(id, organization_id) on delete cascade
);

create table public.relationship_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  source_object_id uuid not null,
  target_object_id uuid not null,
  cardinality text not null check (cardinality in ('one_to_one', 'one_to_many', 'many_to_many')),
  source_label text not null,
  target_label text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, key),
  foreign key (source_object_id, organization_id)
    references public.object_definitions(id, organization_id) on delete cascade,
  foreign key (target_object_id, organization_id)
    references public.object_definitions(id, organization_id) on delete cascade
);

create table public.view_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  object_definition_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  field_keys text[] not null check (cardinality(field_keys) > 0),
  filters jsonb not null default '[]'::jsonb check (jsonb_typeof(filters) = 'array'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, object_definition_id, key),
  foreign key (object_definition_id, organization_id)
    references public.object_definitions(id, organization_id) on delete cascade
);

create table public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  object_definition_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, object_definition_id, key),
  foreign key (object_definition_id, organization_id)
    references public.object_definitions(id, organization_id) on delete cascade
);

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  trigger_config jsonb not null default '{}'::jsonb check (jsonb_typeof(trigger_config) = 'object'),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, key, version)
);

create table public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  query_config jsonb not null default '{}'::jsonb check (jsonb_typeof(query_config) = 'object'),
  visualization_config jsonb not null default '{}'::jsonb check (jsonb_typeof(visualization_config) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, key)
);

create table public.dashboard_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  layout_config jsonb not null default '{}'::jsonb check (jsonb_typeof(layout_config) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, key)
);

create table public.ai_configurations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  model text not null,
  policy_config jsonb not null default '{}'::jsonb check (jsonb_typeof(policy_config) = 'object'),
  feature_config jsonb not null default '{}'::jsonb check (jsonb_typeof(feature_config) = 'object'),
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  external_customer_id text,
  external_subscription_id text,
  plan_key text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  entitlements jsonb not null default '{}'::jsonb check (jsonb_typeof(entitlements) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id),
  unique (provider, external_subscription_id)
);

create table public.organization_configuration_revisions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.configuration_change_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  base_revision bigint not null check (base_revision >= 0),
  target_revision bigint not null check (target_revision = base_revision + 1),
  source text not null check (source in ('user', 'ai', 'module', 'template')),
  title text not null,
  summary text not null,
  operations jsonb not null check (jsonb_typeof(operations) = 'array' and jsonb_array_length(operations) > 0),
  status text not null default 'proposed' check (status in ('proposed', 'validated', 'approved', 'applied', 'rejected', 'failed')),
  proposed_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (status not in ('approved', 'applied') or approved_by is not null),
  check (status <> 'applied' or applied_at is not null)
);

create index branches_organization_id_idx on public.branches (organization_id);
create index memberships_user_id_idx on public.organization_memberships (user_id) include (organization_id, status);
create index roles_organization_id_idx on public.roles (organization_id);
create index membership_roles_role_id_idx on public.membership_roles (role_id);
create index role_permissions_permission_id_idx on public.role_permissions (permission_id);
create index organization_modules_organization_id_idx on public.organization_modules (organization_id);
create index object_definitions_organization_id_idx on public.object_definitions (organization_id);
create index field_definitions_organization_id_idx on public.field_definitions (organization_id);
create index relationship_definitions_organization_id_idx on public.relationship_definitions (organization_id);
create index view_definitions_organization_id_idx on public.view_definitions (organization_id);
create index form_definitions_organization_id_idx on public.form_definitions (organization_id);
create index workflow_definitions_organization_id_idx on public.workflow_definitions (organization_id);
create index report_definitions_organization_id_idx on public.report_definitions (organization_id);
create index dashboard_definitions_organization_id_idx on public.dashboard_definitions (organization_id);
create index configuration_change_sets_status_idx on public.configuration_change_sets (organization_id, status, created_at desc);
create unique index configuration_applied_revision_idx
  on public.configuration_change_sets (organization_id, target_revision)
  where status = 'applied';

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'organizations', 'branches', 'organization_memberships', 'roles',
    'permissions', 'module_definitions', 'business_os_templates', 'organization_modules',
    'object_definitions', 'field_definitions', 'relationship_definitions', 'view_definitions',
    'form_definitions', 'workflow_definitions', 'report_definitions', 'dashboard_definitions',
    'ai_configurations', 'subscriptions', 'organization_configuration_revisions',
    'configuration_change_sets'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create function private.is_organization_member(requested_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = requested_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create function private.has_organization_permission(
  requested_organization_id uuid,
  requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.organizations organization
      where organization.id = requested_organization_id
        and organization.created_by = (select auth.uid())
    )
    or exists (
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

revoke all on function private.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function private.has_organization_permission(uuid, text) from public, anon, authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.has_organization_permission(uuid, text) to authenticated;

create function public.has_org_permission(
  requested_organization_id uuid,
  requested_permission text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_organization_permission(requested_organization_id, requested_permission);
$$;

revoke all on function public.has_org_permission(uuid, text) from public, anon;
grant execute on function public.has_org_permission(uuid, text) to authenticated;

insert into public.permissions (key, domain, action, description) values
  ('organization.read', 'organization', 'read', 'View organization settings'),
  ('organization.update', 'organization', 'update', 'Update organization settings'),
  ('branch.read', 'branch', 'read', 'View branches'),
  ('branch.manage', 'branch', 'manage', 'Create and manage branches'),
  ('member.read', 'member', 'read', 'View organization members'),
  ('member.manage', 'member', 'manage', 'Invite and manage organization members'),
  ('role.read', 'role', 'read', 'View roles and permission assignments'),
  ('role.manage', 'role', 'manage', 'Manage roles and permission assignments'),
  ('module.read', 'module', 'read', 'View enabled modules'),
  ('module.manage', 'module', 'manage', 'Enable and configure modules'),
  ('template.apply', 'template', 'apply', 'Apply a Business OS template'),
  ('metadata.read', 'metadata', 'read', 'View object and field definitions'),
  ('metadata.manage', 'metadata', 'manage', 'Manage object and field definitions'),
  ('workflow.read', 'workflow', 'read', 'View workflow definitions'),
  ('workflow.manage', 'workflow', 'manage', 'Manage workflow definitions'),
  ('report.read', 'report', 'read', 'View reports'),
  ('report.manage', 'report', 'manage', 'Manage reports'),
  ('dashboard.read', 'dashboard', 'read', 'View dashboards'),
  ('dashboard.manage', 'dashboard', 'manage', 'Manage dashboards'),
  ('ai.read', 'ai', 'read', 'View AI configuration'),
  ('ai.manage', 'ai', 'manage', 'Manage AI configuration'),
  ('subscription.read', 'subscription', 'read', 'View subscription state'),
  ('subscription.manage', 'subscription', 'manage', 'Manage the subscription')
on conflict (key) do nothing;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.module_definitions enable row level security;
alter table public.business_os_templates enable row level security;
alter table public.business_os_template_modules enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'branches', 'organization_modules', 'object_definitions', 'field_definitions',
    'relationship_definitions', 'view_definitions', 'form_definitions', 'workflow_definitions',
    'report_definitions', 'dashboard_definitions', 'ai_configurations', 'subscriptions',
    'organization_configuration_revisions', 'configuration_change_sets'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy organizations_select_member on public.organizations for select to authenticated
  using (created_by = (select auth.uid()) or private.is_organization_member(id));
create policy organizations_insert_creator on public.organizations for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy organizations_update_authorized on public.organizations for update to authenticated
  using (private.has_organization_permission(id, 'organization.update'))
  with check (private.has_organization_permission(id, 'organization.update'));

create policy memberships_select_authorized on public.organization_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.has_organization_permission(organization_id, 'member.read'));
create policy memberships_insert_authorized on public.organization_memberships for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and exists (
      select 1 from public.organizations organization
      where organization.id = organization_memberships.organization_id
        and organization.created_by = (select auth.uid())
    )) or private.has_organization_permission(organization_id, 'member.manage')
  );
create policy memberships_update_authorized on public.organization_memberships for update to authenticated
  using (private.has_organization_permission(organization_id, 'member.manage'))
  with check (private.has_organization_permission(organization_id, 'member.manage'));
create policy memberships_delete_authorized on public.organization_memberships for delete to authenticated
  using (private.has_organization_permission(organization_id, 'member.manage'));

create policy roles_select_authorized on public.roles for select to authenticated
  using (private.has_organization_permission(organization_id, 'role.read'));
create policy roles_insert_authorized on public.roles for insert to authenticated
  with check (private.has_organization_permission(organization_id, 'role.manage'));
create policy roles_update_authorized on public.roles for update to authenticated
  using (private.has_organization_permission(organization_id, 'role.manage'))
  with check (private.has_organization_permission(organization_id, 'role.manage'));
create policy roles_delete_authorized on public.roles for delete to authenticated
  using (private.has_organization_permission(organization_id, 'role.manage'));

create policy permissions_select_authenticated on public.permissions for select to authenticated using (true);
create policy modules_select_authenticated on public.module_definitions for select to authenticated using (true);
create policy templates_select_authenticated on public.business_os_templates for select to authenticated using (true);
create policy template_modules_select_authenticated on public.business_os_template_modules for select to authenticated using (true);

create policy role_permissions_select_authorized on public.role_permissions for select to authenticated
  using (exists (
    select 1 from public.roles role
    where role.id = role_permissions.role_id
      and private.has_organization_permission(role.organization_id, 'role.read')
  ));
create policy role_permissions_insert_authorized on public.role_permissions for insert to authenticated
  with check (exists (
    select 1 from public.roles role
    where role.id = role_permissions.role_id
      and private.has_organization_permission(role.organization_id, 'role.manage')
  ));
create policy role_permissions_delete_authorized on public.role_permissions for delete to authenticated
  using (exists (
    select 1 from public.roles role
    where role.id = role_permissions.role_id
      and private.has_organization_permission(role.organization_id, 'role.manage')
  ));

create policy membership_roles_select_authorized on public.membership_roles for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.id = membership_roles.membership_id
      and private.has_organization_permission(membership.organization_id, 'role.read')
  ));
create policy membership_roles_insert_authorized on public.membership_roles for insert to authenticated
  with check (exists (
    select 1
    from public.organization_memberships membership
    join public.roles role on role.id = membership_roles.role_id
      and role.organization_id = membership.organization_id
    where membership.id = membership_roles.membership_id
      and private.has_organization_permission(membership.organization_id, 'role.manage')
  ));
create policy membership_roles_delete_authorized on public.membership_roles for delete to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.id = membership_roles.membership_id
      and private.has_organization_permission(membership.organization_id, 'role.manage')
  ));

do $$
declare
  item record;
begin
  for item in select * from (values
    ('branches', 'branch.read', 'branch.manage'),
    ('organization_modules', 'module.read', 'module.manage'),
    ('object_definitions', 'metadata.read', 'metadata.manage'),
    ('field_definitions', 'metadata.read', 'metadata.manage'),
    ('relationship_definitions', 'metadata.read', 'metadata.manage'),
    ('view_definitions', 'metadata.read', 'metadata.manage'),
    ('form_definitions', 'metadata.read', 'metadata.manage'),
    ('workflow_definitions', 'workflow.read', 'workflow.manage'),
    ('report_definitions', 'report.read', 'report.manage'),
    ('dashboard_definitions', 'dashboard.read', 'dashboard.manage'),
    ('ai_configurations', 'ai.read', 'ai.manage'),
    ('subscriptions', 'subscription.read', 'subscription.manage'),
    ('organization_configuration_revisions', 'metadata.read', 'metadata.manage'),
    ('configuration_change_sets', 'metadata.read', 'metadata.manage')
  ) as policies(table_name, read_permission, write_permission)
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.has_organization_permission(organization_id, %L))',
      item.table_name || '_select_authorized', item.table_name, item.read_permission
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.has_organization_permission(organization_id, %L))',
      item.table_name || '_insert_authorized', item.table_name, item.write_permission
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.has_organization_permission(organization_id, %L)) with check (private.has_organization_permission(organization_id, %L))',
      item.table_name || '_update_authorized', item.table_name, item.write_permission, item.write_permission
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.has_organization_permission(organization_id, %L))',
      item.table_name || '_delete_authorized', item.table_name, item.write_permission
    );
  end loop;
end;
$$;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update, delete on public.branches, public.organization_memberships,
  public.roles, public.role_permissions, public.membership_roles, public.organization_modules,
  public.object_definitions, public.field_definitions, public.relationship_definitions,
  public.view_definitions, public.form_definitions, public.workflow_definitions,
  public.report_definitions, public.dashboard_definitions, public.ai_configurations,
  public.subscriptions, public.organization_configuration_revisions,
  public.configuration_change_sets to authenticated;
grant select on public.permissions, public.module_definitions, public.business_os_templates,
  public.business_os_template_modules to authenticated;

create function private.storage_organization_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function private.storage_organization_id(text) from public, anon, authenticated;
grant execute on function private.storage_organization_id(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('organization-assets', 'organization-assets', false, 10485760)
on conflict (id) do nothing;

create policy organization_assets_select on storage.objects for select to authenticated
  using (
    bucket_id = 'organization-assets'
    and private.is_organization_member(private.storage_organization_id(name))
  );
create policy organization_assets_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'organization.update')
  );
create policy organization_assets_update on storage.objects for update to authenticated
  using (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'organization.update')
  )
  with check (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'organization.update')
  );
create policy organization_assets_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'organization-assets'
    and private.has_organization_permission(private.storage_organization_id(name), 'organization.update')
  );

comment on schema private is 'Non-Data-API authorization and trigger implementation details.';
comment on table public.module_definitions is 'Platform module contracts only; business module tables belong to later migrations.';
comment on table public.object_definitions is 'Organization-scoped metadata definitions. Runtime record storage is intentionally deferred.';
