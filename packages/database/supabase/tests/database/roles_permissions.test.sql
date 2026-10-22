begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '31000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rbac-owner-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '32000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rbac-owner-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'rbac-cashier@example.test', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.create_business(
  'rbac-a', 'RBAC A Legal', 'RBAC A', 'corporation', 'retail',
  '{"line1":"1 Main Street","city":"Manila","province":"Metro Manila"}'::jsonb
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '32000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"32000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.create_business(
  'rbac-b', 'RBAC B Legal', 'RBAC B', 'corporation', 'services',
  '{"line1":"2 Main Street","city":"Cebu City","province":"Cebu"}'::jsonb
);

reset role;
select set_config('test.rbac_a', (select id::text from public.organizations where slug = 'rbac-a'), true);
select set_config('test.rbac_b', (select id::text from public.organizations where slug = 'rbac-b'), true);
select set_config('test.rbac_b_branch', (
  select id::text from public.branches
  where organization_id = current_setting('test.rbac_b')::uuid and code = 'main'
), true);
select set_config('test.rbac_b_cashier', (
  select id::text from public.roles
  where organization_id = current_setting('test.rbac_b')::uuid and key = 'cashier'
), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$select count(*) from public.roles
    where organization_id = current_setting('test.rbac_a')::uuid and is_system$$,
  $$values (6::bigint)$$,
  'every Business receives six system roles'
);

select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'users.manage'), true, 'Owner can manage users');

select results_eq(
  $$select count(*)
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.organization_id = current_setting('test.rbac_a')::uuid
      and role.key = 'administrator' and permission.key = 'users.manage'$$,
  $$values (1::bigint)$$,
  'Administrator receives users.manage'
);

select results_eq(
  $$select count(*)
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.organization_id = current_setting('test.rbac_a')::uuid
      and role.key = 'manager' and permission.key = 'reports.read'$$,
  $$values (1::bigint)$$,
  'Manager can read reports'
);

select results_eq(
  $$select count(*)
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.organization_id = current_setting('test.rbac_a')::uuid
      and role.key = 'manager' and permission.key = 'users.manage'$$,
  $$values (0::bigint)$$,
  'Manager cannot manage users'
);

select results_eq(
  $$select count(*)
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.organization_id = current_setting('test.rbac_a')::uuid
      and role.key = 'cashier' and permission.key = 'sales.refund'$$,
  $$values (0::bigint)$$,
  'Cashier cannot refund sales by default'
);

select lives_ok(
  $$select public.create_custom_role(
    current_setting('test.rbac_a')::uuid, 'auditor', 'Auditor', 'Read-only finance access',
    array['expenses.read', 'reports.read']
  )$$,
  'Owner can create a custom role'
);

select results_eq(
  $$select count(*)
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    where role.organization_id = current_setting('test.rbac_a')::uuid and role.key = 'auditor'$$,
  $$values (2::bigint)$$,
  'custom role contains its selected permissions'
);

select throws_ok(
  $$select public.set_custom_role_permissions(
    current_setting('test.rbac_a')::uuid,
    (select id from public.roles where organization_id = current_setting('test.rbac_a')::uuid and key = 'owner'),
    array['sales.read']
  )$$,
  '22023'
);

select is_empty(
  $$delete from public.role_permissions
    where role_id = (select id from public.roles where organization_id = current_setting('test.rbac_a')::uuid and key = 'owner')
    returning role_id$$,
  'system role permissions cannot be removed directly'
);

insert into public.branches (organization_id, code, name, address)
values (
  current_setting('test.rbac_a')::uuid, 'north', 'North Branch',
  '{"line1":"9 North Street","city":"Manila","province":"Metro Manila"}'::jsonb
);
insert into public.organization_memberships (
  organization_id, user_id, status, joined_at, branch_access_mode
) values (
  current_setting('test.rbac_a')::uuid,
  '33000000-0000-0000-0000-000000000003', 'active', now(), 'selected'
);

select set_config('test.rbac_a_main', (
  select id::text from public.branches
  where organization_id = current_setting('test.rbac_a')::uuid and code = 'main'
), true);
select set_config('test.rbac_a_north', (
  select id::text from public.branches
  where organization_id = current_setting('test.rbac_a')::uuid and code = 'north'
), true);
select set_config('test.rbac_cashier_membership', (
  select id::text from public.organization_memberships
  where organization_id = current_setting('test.rbac_a')::uuid
    and user_id = '33000000-0000-0000-0000-000000000003'
), true);

select lives_ok(
  $$select public.assign_member_access(
    current_setting('test.rbac_a')::uuid,
    current_setting('test.rbac_cashier_membership')::uuid,
    array[(select id from public.roles where organization_id = current_setting('test.rbac_a')::uuid and key = 'cashier')],
    'selected', array[current_setting('test.rbac_a_main')::uuid]
  )$$,
  'Owner can assign a role and selected Branch access'
);

select results_eq(
  $$select branch_access_mode from public.organization_memberships
    where id = current_setting('test.rbac_cashier_membership')::uuid$$,
  $$values ('selected'::text)$$,
  'member uses selected Branch access mode'
);

select results_eq(
  $$select branch_id from public.membership_branch_access
    where membership_id = current_setting('test.rbac_cashier_membership')::uuid$$,
  $$values (current_setting('test.rbac_a_main')::uuid)$$,
  'member receives only the selected Branch'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"33000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'sales.create', current_setting('test.rbac_a_main')::uuid), true, 'Cashier can create sales in an assigned Branch');
select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'sales.refund', current_setting('test.rbac_a_main')::uuid), false, 'Cashier cannot refund sales');
select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'sales.create', current_setting('test.rbac_a_north')::uuid), false, 'Cashier cannot operate in an unassigned Branch');
select results_eq($$select count(*) from public.branches where organization_id = current_setting('test.rbac_a')::uuid$$, $$values (1::bigint)$$, 'Branch RLS exposes only assigned Branches');
select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'users.manage'), false, 'Cashier cannot manage users');
select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'sales.create'), true, 'Business-level capability remains available for navigation checks');
select is(public.can_business_permission(current_setting('test.rbac_a')::uuid, 'unknown.permission'), false, 'unknown permissions always deny');

select throws_ok(
  $$select public.create_custom_role(
    current_setting('test.rbac_a')::uuid, 'elevated', 'Elevated', '', array['users.manage']
  )$$,
  '42501'
);
select throws_ok(
  $$select public.assign_member_access(
    current_setting('test.rbac_a')::uuid,
    current_setting('test.rbac_cashier_membership')::uuid,
    array[(select id from public.roles where organization_id = current_setting('test.rbac_a')::uuid and key = 'owner')],
    'all', '{}'::uuid[]
  )$$,
  '42501'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"31000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$select public.assign_member_access(
    current_setting('test.rbac_a')::uuid,
    current_setting('test.rbac_cashier_membership')::uuid,
    array[current_setting('test.rbac_b_cashier')::uuid],
    'all', '{}'::uuid[]
  )$$,
  '42501'
);
select throws_ok(
  $$select public.assign_member_access(
    current_setting('test.rbac_a')::uuid,
    current_setting('test.rbac_cashier_membership')::uuid,
    array[(select id from public.roles where organization_id = current_setting('test.rbac_a')::uuid and key = 'cashier')],
    'selected', array[current_setting('test.rbac_b_branch')::uuid]
  )$$,
  '42501'
);

select * from finish();
rollback;
