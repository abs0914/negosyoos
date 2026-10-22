begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'module-owner-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'module-owner-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '43000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'module-manager@example.test', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.create_business(
  'modules-a', 'Modules A Legal', 'Modules A', 'corporation', 'retail',
  '{"line1":"1 Registry Street","city":"Manila","province":"Metro Manila"}'::jsonb
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '42000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.create_business(
  'modules-b', 'Modules B Legal', 'Modules B', 'corporation', 'services',
  '{"line1":"2 Registry Street","city":"Cebu City","province":"Cebu"}'::jsonb
);

reset role;
select set_config('test.modules_a', (select id::text from public.organizations where slug = 'modules-a'), true);
select set_config('test.modules_b', (select id::text from public.organizations where slug = 'modules-b'), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$select key from public.module_definitions where status = 'published' order by key$$,
  $$values ('accounting'::text), ('appointments'), ('attendance'), ('compliance'),
    ('crm'), ('delivery'), ('employees'), ('expenses'), ('inventory'), ('invoicing'),
    ('job_orders'), ('loyalty'), ('payroll'), ('pos'), ('product_catalog'),
    ('purchasing'), ('quotations'), ('sales')$$,
  'the registry exposes the published modules installed by the migration chain'
);

select results_eq(
  $$select key, category, minimum_plan, version from public.module_definitions where key = 'job_orders'$$,
  $$values ('job_orders'::text, 'operations'::text, 'growth'::text, 1)$$,
  'ModuleDefinition stores underscore key, category, plan, and version'
);

select results_eq(
  $$select dependency_module_key from public.module_dependencies where module_key = 'pos' order by dependency_module_key$$,
  $$values ('inventory'::text), ('sales'::text)$$,
  'module dependencies are normalized and queryable'
);

reset role;
select throws_ok(
  $$insert into public.module_dependencies (module_key, dependency_module_key) values ('sales', 'pos')$$,
  '23514',
  'Module dependencies cannot contain a cycle.',
  'the registry rejects dependency cycles'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.organization_modules (organization_id, module_id, enabled_by)
    values (
      current_setting('test.modules_a')::uuid,
      (select id from public.module_definitions where key = 'sales'),
      '41000000-0000-0000-0000-000000000001'
    )$$,
  '42501',
  'permission denied for table organization_modules',
  'direct BusinessModule writes are denied'
);

select lives_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'product_catalog', true, '{"default_unit":"piece","default_tax_rate":12}'::jsonb)$$,
  'Owner can activate Product Catalog'
);

select lives_ok(
  $$select public.set_business_module_state(
    current_setting('test.modules_a')::uuid, 'inventory', true,
    '{"allow_negative_stock":false,"low_stock_threshold":8}'::jsonb
  )$$,
  'Owner can activate Inventory with valid configuration'
);

select lives_ok(
  $$select public.set_business_module_state(
    current_setting('test.modules_a')::uuid, 'sales', true,
    '{"default_tax_rate":12}'::jsonb
  )$$,
  'Owner can activate Sales'
);

select lives_ok(
  $$select public.set_business_module_state(
    current_setting('test.modules_a')::uuid, 'pos', true,
    '{"receipt_footer":"Salamat po!"}'::jsonb
  )$$,
  'POS activates after its dependencies are enabled'
);

select results_eq(
  $$select organization.id, definition.key, module.is_enabled, module.config ->> 'receipt_footer', module.enabled_at is not null
    from public.organization_modules module
    join public.organizations organization on organization.id = module.organization_id
    join public.module_definitions definition on definition.id = module.module_id
    where module.organization_id = current_setting('test.modules_a')::uuid and definition.key = 'pos'$$,
  $$values (current_setting('test.modules_a')::uuid, 'pos'::text, true, 'Salamat po!'::text, true)$$,
  'BusinessModule tracks tenant, key, state, configuration, and activation time'
);

select throws_ok(
  $$select public.set_business_module_state(
    current_setting('test.modules_a')::uuid, 'inventory', true,
    '{"low_stock_threshold":"eight"}'::jsonb
  )$$,
  '22023',
  'Invalid module configuration.',
  'database boundary rejects incorrectly typed module configuration'
);

select throws_ok(
  $$select public.set_business_module_state(
    current_setting('test.modules_a')::uuid, 'inventory', true,
    '{"low_stock_threshold":8,"arbitrary_code":"no"}'::jsonb
  )$$,
  '22023',
  'Invalid module configuration.',
  'database boundary rejects unknown configuration properties'
);

select throws_ok(
  $$select public.set_business_module_state(
    current_setting('test.modules_a')::uuid, 'sales', false, '{}'::jsonb
  )$$,
  'P0001',
  'Module is required by enabled modules: pos.',
  'a module cannot be disabled while an enabled module depends on it'
);

select lives_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'pos', false, '{}'::jsonb)$$,
  'dependent module can be disabled first'
);

select lives_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'sales', false, '{}'::jsonb)$$,
  'dependency can be disabled after dependents are disabled'
);

select throws_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'quotations', true, '{"validity_days":30}'::jsonb)$$,
  'P0001',
  'Enable required modules first: crm.',
  'activation fails when a required module is disabled'
);

select throws_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'crm', true, '{}'::jsonb)$$,
  'P0001',
  'Module requires the growth plan.',
  'minimum plan is enforced during activation'
);

reset role;
insert into public.subscriptions (organization_id, provider, plan_key, status)
values (current_setting('test.modules_a')::uuid, 'internal', 'growth', 'trialing');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'crm', true, '{}'::jsonb)$$,
  'growth-plan Business can activate CRM'
);

select throws_ok(
  $$select public.set_business_module_state(current_setting('test.modules_b')::uuid, 'sales', true, '{"default_tax_rate":12}'::jsonb)$$,
  '42501',
  'Permission denied.',
  'an Owner cannot activate a module in another tenant'
);

insert into public.organization_memberships (organization_id, user_id, status, joined_at)
values (current_setting('test.modules_a')::uuid, '43000000-0000-0000-0000-000000000003', 'active', now());
select public.assign_member_access(
  current_setting('test.modules_a')::uuid,
  (select id from public.organization_memberships where organization_id = current_setting('test.modules_a')::uuid and user_id = '43000000-0000-0000-0000-000000000003'),
  array[(select id from public.roles where organization_id = current_setting('test.modules_a')::uuid and key = 'manager')],
  'all', '{}'::uuid[]
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '43000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"43000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select results_eq(
  $$select count(*) from public.organization_modules$$,
  $$values (5::bigint)$$,
  'module.read exposes only the member Business modules'
);

select throws_ok(
  $$select public.set_business_module_state(current_setting('test.modules_a')::uuid, 'sales', true, '{"default_tax_rate":12}'::jsonb)$$,
  '42501',
  'Permission denied.',
  'read-only module permission cannot mutate module state'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '42000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is_empty(
  $$select organization_id from public.organization_modules where organization_id = current_setting('test.modules_a')::uuid$$,
  'RLS hides another Business module assignments'
);

select * from finish();
rollback;
