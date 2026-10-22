-- Module 4: capability-based RBAC with Business and Branch context.

insert into public.permissions (key, domain, action, description) values
  ('sales.read', 'sales', 'read', 'View sales transactions'),
  ('sales.create', 'sales', 'create', 'Create sales transactions'),
  ('sales.refund', 'sales', 'refund', 'Refund sales transactions'),
  ('inventory.read', 'inventory', 'read', 'View inventory'),
  ('inventory.adjust', 'inventory', 'adjust', 'Adjust inventory quantities'),
  ('expenses.read', 'expenses', 'read', 'View expenses'),
  ('expenses.create', 'expenses', 'create', 'Create expenses'),
  ('reports.read', 'reports', 'read', 'View operational reports'),
  ('users.manage', 'users', 'manage', 'Manage members, roles, and Branch access'),
  ('settings.manage', 'settings', 'manage', 'Manage Business settings')
on conflict (key) do update set
  domain = excluded.domain,
  action = excluded.action,
  description = excluded.description;

alter table public.organization_memberships
  add column branch_access_mode text not null default 'selected'
    check (branch_access_mode in ('all', 'selected'));

create table public.membership_branch_access (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null,
  branch_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, branch_id),
  foreign key (membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  foreign key (branch_id, organization_id)
    references public.branches(id, organization_id) on delete cascade
);

create index membership_branch_access_branch_idx
  on public.membership_branch_access (branch_id, membership_id);

create trigger prevent_tenant_reassignment
  before update on public.membership_branch_access
  for each row execute function private.prevent_tenant_reassignment();

create function private.can_business_permission(
  requested_organization_id uuid,
  requested_permission text,
  requested_branch_id uuid default null
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
    join public.membership_roles membership_role
      on membership_role.membership_id = membership.id
    join public.roles role
      on role.id = membership_role.role_id
      and role.organization_id = membership.organization_id
    join public.role_permissions role_permission
      on role_permission.role_id = role.id
    join public.permissions permission
      on permission.id = role_permission.permission_id
    where membership.organization_id = requested_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and permission.key = requested_permission
      and (
        requested_branch_id is null
        or (
          exists (
            select 1 from public.branches branch
            where branch.id = requested_branch_id
              and branch.organization_id = requested_organization_id
          )
          and (
            membership.branch_access_mode = 'all'
            or exists (
              select 1 from public.membership_branch_access branch_access
              where branch_access.membership_id = membership.id
                and branch_access.organization_id = requested_organization_id
                and branch_access.branch_id = requested_branch_id
            )
          )
        )
      )
  );
$$;

revoke all on function private.can_business_permission(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function private.can_business_permission(uuid, text, uuid)
  to authenticated;

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
  select private.can_business_permission(
    requested_organization_id,
    requested_permission,
    null
  );
$$;

create function public.can_business_permission(
  requested_organization_id uuid,
  requested_permission text,
  requested_branch_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.can_business_permission(
    requested_organization_id,
    requested_permission,
    requested_branch_id
  );
$$;

revoke all on function public.can_business_permission(uuid, text, uuid)
  from public, anon;
grant execute on function public.can_business_permission(uuid, text, uuid)
  to authenticated;

create function private.install_default_roles(requested_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.roles (
    organization_id, key, name, description, is_system
  ) values
    (requested_organization_id, 'owner', 'Owner', 'Full Business access', true),
    (requested_organization_id, 'administrator', 'Administrator', 'Administrative access except ownership-only billing controls', true),
    (requested_organization_id, 'manager', 'Manager', 'Operational management and reporting access', true),
    (requested_organization_id, 'cashier', 'Cashier', 'Point-of-sale and inventory viewing access', true),
    (requested_organization_id, 'staff', 'Staff', 'Day-to-day sales, inventory, and expense access', true),
    (requested_organization_id, 'viewer', 'Viewer', 'Read-only operational access', true)
  on conflict (organization_id, key) do nothing;

  delete from public.role_permissions role_permission
  using public.roles role
  where role_permission.role_id = role.id
    and role.organization_id = requested_organization_id
    and role.is_system;

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  cross join public.permissions permission
  where role.organization_id = requested_organization_id
    and role.key = 'owner';

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  cross join public.permissions permission
  where role.organization_id = requested_organization_id
    and role.key = 'administrator'
    and permission.key <> 'subscription.manage';

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  join public.permissions permission on permission.key = any (array[
    'organization.read', 'branch.read', 'branch.manage', 'member.read',
    'module.read', 'metadata.read', 'workflow.read', 'report.read',
    'dashboard.read', 'ai.read', 'subscription.read', 'sales.read',
    'sales.create', 'sales.refund', 'inventory.read', 'inventory.adjust',
    'expenses.read', 'expenses.create', 'reports.read'
  ])
  where role.organization_id = requested_organization_id
    and role.key = 'manager';

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  join public.permissions permission on permission.key = any (array[
    'organization.read', 'branch.read', 'sales.read', 'sales.create',
    'inventory.read'
  ])
  where role.organization_id = requested_organization_id
    and role.key = 'cashier';

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  join public.permissions permission on permission.key = any (array[
    'organization.read', 'branch.read', 'sales.read', 'sales.create',
    'inventory.read', 'expenses.read', 'expenses.create'
  ])
  where role.organization_id = requested_organization_id
    and role.key = 'staff';

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  join public.permissions permission on permission.key = any (array[
    'organization.read', 'branch.read', 'sales.read', 'inventory.read',
    'expenses.read', 'reports.read'
  ])
  where role.organization_id = requested_organization_id
    and role.key = 'viewer';

  update public.organization_memberships membership
  set branch_access_mode = 'all'
  where membership.organization_id = requested_organization_id
    and exists (
      select 1
      from public.membership_roles membership_role
      join public.roles role on role.id = membership_role.role_id
      where membership_role.membership_id = membership.id
        and role.organization_id = requested_organization_id
        and role.key = 'owner'
    );
end;
$$;

revoke all on function private.install_default_roles(uuid)
  from public, anon, authenticated;

create function private.handle_main_branch_rbac()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.code = 'main' then
    perform private.install_default_roles(new.organization_id);
  end if;
  return new;
end;
$$;

revoke all on function private.handle_main_branch_rbac()
  from public, anon, authenticated;

create trigger install_default_roles_on_main_branch
  after insert on public.branches
  for each row execute function private.handle_main_branch_rbac();

select private.install_default_roles(organization.id)
from public.organizations organization;

create function private.protect_system_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_system then
    raise exception 'System roles are immutable.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_system_role()
  from public, anon, authenticated;

create trigger protect_system_role
  before update or delete on public.roles
  for each row execute function private.protect_system_role();

drop policy roles_insert_authorized on public.roles;
drop policy roles_update_authorized on public.roles;
drop policy roles_delete_authorized on public.roles;

create policy roles_insert_authorized on public.roles for insert to authenticated
  with check (
    not is_system
    and (
      private.has_organization_permission(organization_id, 'role.manage')
      or private.has_organization_permission(organization_id, 'users.manage')
    )
  );
create policy roles_update_authorized on public.roles for update to authenticated
  using (
    not is_system
    and (
      private.has_organization_permission(organization_id, 'role.manage')
      or private.has_organization_permission(organization_id, 'users.manage')
    )
  )
  with check (
    not is_system
    and (
      private.has_organization_permission(organization_id, 'role.manage')
      or private.has_organization_permission(organization_id, 'users.manage')
    )
  );
create policy roles_delete_authorized on public.roles for delete to authenticated
  using (
    not is_system
    and (
      private.has_organization_permission(organization_id, 'role.manage')
      or private.has_organization_permission(organization_id, 'users.manage')
    )
  );

drop policy role_permissions_insert_authorized on public.role_permissions;
drop policy role_permissions_delete_authorized on public.role_permissions;

create policy role_permissions_insert_authorized on public.role_permissions for insert to authenticated
  with check (exists (
    select 1 from public.roles role
    where role.id = role_permissions.role_id
      and not role.is_system
      and (
        private.has_organization_permission(role.organization_id, 'role.manage')
        or private.has_organization_permission(role.organization_id, 'users.manage')
      )
  ));
create policy role_permissions_delete_authorized on public.role_permissions for delete to authenticated
  using (exists (
    select 1 from public.roles role
    where role.id = role_permissions.role_id
      and not role.is_system
      and (
        private.has_organization_permission(role.organization_id, 'role.manage')
        or private.has_organization_permission(role.organization_id, 'users.manage')
      )
  ));

drop policy roles_select_authorized on public.roles;
create policy roles_select_authorized on public.roles for select to authenticated
  using (
    private.has_organization_permission(organization_id, 'role.read')
    or private.has_organization_permission(organization_id, 'users.manage')
  );

drop policy role_permissions_select_authorized on public.role_permissions;
create policy role_permissions_select_authorized on public.role_permissions for select to authenticated
  using (exists (
    select 1 from public.roles role
    where role.id = role_permissions.role_id
      and (
        private.has_organization_permission(role.organization_id, 'role.read')
        or private.has_organization_permission(role.organization_id, 'users.manage')
      )
  ));

drop policy membership_roles_insert_authorized on public.membership_roles;
drop policy membership_roles_delete_authorized on public.membership_roles;

create policy membership_roles_insert_authorized on public.membership_roles for insert to authenticated
  with check (exists (
    select 1
    from public.organization_memberships membership
    join public.roles role on role.id = membership_roles.role_id
      and role.organization_id = membership.organization_id
    where membership.id = membership_roles.membership_id
      and (
        private.has_organization_permission(membership.organization_id, 'role.manage')
        or private.has_organization_permission(membership.organization_id, 'users.manage')
      )
  ));
create policy membership_roles_delete_authorized on public.membership_roles for delete to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.id = membership_roles.membership_id
      and (
        private.has_organization_permission(membership.organization_id, 'role.manage')
        or private.has_organization_permission(membership.organization_id, 'users.manage')
      )
  ));

drop policy membership_roles_select_authorized on public.membership_roles;
create policy membership_roles_select_authorized on public.membership_roles for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.id = membership_roles.membership_id
      and (
        private.has_organization_permission(membership.organization_id, 'role.read')
        or private.has_organization_permission(membership.organization_id, 'users.manage')
      )
  ));

drop policy memberships_select_authorized on public.organization_memberships;
drop policy memberships_insert_authorized on public.organization_memberships;
drop policy memberships_update_authorized on public.organization_memberships;
drop policy memberships_delete_authorized on public.organization_memberships;

create policy memberships_select_authorized on public.organization_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_organization_permission(organization_id, 'member.read')
    or private.has_organization_permission(organization_id, 'users.manage')
  );
create policy memberships_insert_authorized on public.organization_memberships for insert to authenticated
  with check (
    private.has_organization_permission(organization_id, 'member.manage')
    or private.has_organization_permission(organization_id, 'users.manage')
  );
create policy memberships_update_authorized on public.organization_memberships for update to authenticated
  using (
    private.has_organization_permission(organization_id, 'member.manage')
    or private.has_organization_permission(organization_id, 'users.manage')
  )
  with check (
    private.has_organization_permission(organization_id, 'member.manage')
    or private.has_organization_permission(organization_id, 'users.manage')
  );
create policy memberships_delete_authorized on public.organization_memberships for delete to authenticated
  using (
    private.has_organization_permission(organization_id, 'member.manage')
    or private.has_organization_permission(organization_id, 'users.manage')
  );

alter table public.membership_branch_access enable row level security;

create policy membership_branch_access_select on public.membership_branch_access
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_memberships membership
      where membership.id = membership_branch_access.membership_id
        and membership.user_id = (select auth.uid())
    )
    or private.has_organization_permission(organization_id, 'users.manage')
    or private.has_organization_permission(organization_id, 'member.read')
  );
create policy membership_branch_access_insert on public.membership_branch_access
  for insert to authenticated
  with check (private.has_organization_permission(organization_id, 'users.manage'));
create policy membership_branch_access_delete on public.membership_branch_access
  for delete to authenticated
  using (private.has_organization_permission(organization_id, 'users.manage'));

drop policy branches_select_authorized on public.branches;
drop policy branches_insert_authorized on public.branches;
drop policy branches_update_authorized on public.branches;
drop policy branches_delete_authorized on public.branches;

create policy branches_select_authorized on public.branches for select to authenticated
  using (private.can_business_permission(organization_id, 'branch.read', id));
create policy branches_insert_authorized on public.branches for insert to authenticated
  with check (private.has_organization_permission(organization_id, 'branch.manage'));
create policy branches_update_authorized on public.branches for update to authenticated
  using (private.can_business_permission(organization_id, 'branch.manage', id))
  with check (private.can_business_permission(organization_id, 'branch.manage', id));
create policy branches_delete_authorized on public.branches for delete to authenticated
  using (private.can_business_permission(organization_id, 'branch.manage', id));

drop policy organizations_update_authorized on public.organizations;
create policy organizations_update_authorized on public.organizations for update to authenticated
  using (private.has_organization_permission(id, 'settings.manage'))
  with check (private.has_organization_permission(id, 'settings.manage'));

drop policy business_settings_update_authorized on public.business_settings;
create policy business_settings_update_authorized on public.business_settings for update to authenticated
  using (private.has_organization_permission(organization_id, 'settings.manage'))
  with check (private.has_organization_permission(organization_id, 'settings.manage'));

create function public.create_custom_role(
  requested_organization_id uuid,
  requested_key text,
  requested_name text,
  requested_description text,
  requested_permissions text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_role_id uuid;
  distinct_permission_count integer;
begin
  if not private.can_business_permission(requested_organization_id, 'users.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  if requested_key !~ '^[a-z][a-z0-9_]*$' or length(requested_key) > 50 then
    raise exception 'Invalid role key.' using errcode = '22023';
  end if;
  if length(trim(requested_name)) not between 2 and 100 then
    raise exception 'Invalid role name.' using errcode = '22023';
  end if;
  if coalesce(cardinality(requested_permissions), 0) < 1
    or cardinality(requested_permissions) > 100 then
    raise exception 'Select at least one valid permission.' using errcode = '22023';
  end if;

  select count(distinct permission.key) into distinct_permission_count
  from public.permissions permission
  where permission.key = any(requested_permissions);
  if distinct_permission_count <> (
    select count(distinct permission_key) from unnest(requested_permissions) permission_key
  ) then
    raise exception 'Unknown permission.' using errcode = '22023';
  end if;

  insert into public.roles (organization_id, key, name, description, is_system)
  values (
    requested_organization_id, requested_key, trim(requested_name),
    nullif(trim(requested_description), ''), false
  ) returning id into created_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select created_role_id, permission.id
  from public.permissions permission
  where permission.key = any(requested_permissions);

  return created_role_id;
end;
$$;

create function public.set_custom_role_permissions(
  requested_organization_id uuid,
  requested_role_id uuid,
  requested_permissions text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  distinct_permission_count integer;
begin
  if not private.can_business_permission(requested_organization_id, 'users.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.roles role
    where role.id = requested_role_id
      and role.organization_id = requested_organization_id
      and not role.is_system
  ) then
    raise exception 'Custom role not found.' using errcode = '22023';
  end if;
  if coalesce(cardinality(requested_permissions), 0) < 1
    or cardinality(requested_permissions) > 100 then
    raise exception 'Select at least one valid permission.' using errcode = '22023';
  end if;

  select count(distinct permission.key) into distinct_permission_count
  from public.permissions permission
  where permission.key = any(requested_permissions);
  if distinct_permission_count <> (
    select count(distinct permission_key) from unnest(requested_permissions) permission_key
  ) then
    raise exception 'Unknown permission.' using errcode = '22023';
  end if;

  delete from public.role_permissions where role_id = requested_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select requested_role_id, permission.id
  from public.permissions permission
  where permission.key = any(requested_permissions);
end;
$$;

create function public.assign_member_access(
  requested_organization_id uuid,
  requested_membership_id uuid,
  requested_role_ids uuid[],
  requested_branch_access_mode text,
  requested_branch_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.can_business_permission(requested_organization_id, 'users.manage', null) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;
  if requested_branch_access_mode not in ('all', 'selected') then
    raise exception 'Invalid Branch access mode.' using errcode = '22023';
  end if;
  if coalesce(cardinality(requested_role_ids), 0) < 1 then
    raise exception 'Select at least one role.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.organization_memberships membership
    where membership.id = requested_membership_id
      and membership.organization_id = requested_organization_id
  ) then
    raise exception 'Membership not found.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.membership_roles membership_role
    join public.roles role on role.id = membership_role.role_id
    where membership_role.membership_id = requested_membership_id
      and role.key = 'owner'
  ) then
    raise exception 'Owner access cannot be reassigned.' using errcode = '42501';
  end if;
  if (
    select count(distinct role.id) from public.roles role
    where role.id = any(requested_role_ids)
      and role.organization_id = requested_organization_id
  ) <> (
    select count(distinct role_id) from unnest(requested_role_ids) role_id
  ) then
    raise exception 'Role belongs to another Business.' using errcode = '42501';
  end if;
  if requested_branch_access_mode = 'selected' and (
    select count(distinct branch.id) from public.branches branch
    where branch.id = any(requested_branch_ids)
      and branch.organization_id = requested_organization_id
  ) <> (
    select count(distinct branch_id) from unnest(requested_branch_ids) branch_id
  ) then
    raise exception 'Branch belongs to another Business.' using errcode = '42501';
  end if;

  delete from public.membership_roles where membership_id = requested_membership_id;
  insert into public.membership_roles (membership_id, role_id)
  select requested_membership_id, role_id
  from unnest(requested_role_ids) role_id;

  update public.organization_memberships
  set branch_access_mode = requested_branch_access_mode
  where id = requested_membership_id
    and organization_id = requested_organization_id;

  delete from public.membership_branch_access
  where membership_id = requested_membership_id;
  if requested_branch_access_mode = 'selected' then
    insert into public.membership_branch_access (
      organization_id, membership_id, branch_id
    )
    select requested_organization_id, requested_membership_id, branch_id
    from unnest(requested_branch_ids) branch_id;
  end if;
end;
$$;

revoke all on function public.create_custom_role(uuid, text, text, text, text[])
  from public, anon;
revoke all on function public.set_custom_role_permissions(uuid, uuid, text[])
  from public, anon;
revoke all on function public.assign_member_access(uuid, uuid, uuid[], text, uuid[])
  from public, anon;
grant execute on function public.create_custom_role(uuid, text, text, text, text[])
  to authenticated;
grant execute on function public.set_custom_role_permissions(uuid, uuid, text[])
  to authenticated;
grant execute on function public.assign_member_access(uuid, uuid, uuid[], text, uuid[])
  to authenticated;

revoke all on public.membership_branch_access from anon;
grant select, insert, delete on public.membership_branch_access to authenticated;

comment on function public.can_business_permission(uuid, text, uuid) is
  'Evaluates the authenticated caller capability in a Business and optional Branch context.';
comment on table public.membership_branch_access is
  'Explicit Branch grants for memberships whose branch_access_mode is selected.';
