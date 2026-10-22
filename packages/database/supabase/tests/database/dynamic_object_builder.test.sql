begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'object-owner-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'object-owner-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '53000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'object-manager@example.test', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.create_business('objects-a', 'Objects A Legal', 'Objects A', 'corporation', 'retail', '{"city":"Manila","province":"Metro Manila"}'::jsonb);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.create_business('objects-b', 'Objects B Legal', 'Objects B', 'corporation', 'services', '{"city":"Cebu City","province":"Cebu"}'::jsonb);

reset role;
select set_config('test.objects_a', (select id::text from public.organizations where slug = 'objects-a'), true);
select set_config('test.objects_b', (select id::text from public.organizations where slug = 'objects-b'), true);
select set_config('test.objects_a_branch', (select id::text from public.branches where organization_id = current_setting('test.objects_a')::uuid and code = 'main'), true);
select set_config('test.objects_b_branch', (select id::text from public.branches where organization_id = current_setting('test.objects_b')::uuid and code = 'main'), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$select count(*) from public.permissions where key in ('record.read', 'record.create', 'record.update')$$,
  $$values (3::bigint)$$,
  'record capabilities are registered'
);
select is(public.can_business_permission(current_setting('test.objects_a')::uuid, 'record.create'), true, 'Owner can create object records');
select results_eq(
  $$select array_agg(permission.key order by permission.key)
    from public.roles role join public.role_permissions assignment on assignment.role_id = role.id
    join public.permissions permission on permission.id = assignment.permission_id
    where role.organization_id = current_setting('test.objects_a')::uuid and role.key = 'viewer'
      and permission.domain = 'record'$$,
  $$values (array['record.read']::text[])$$,
  'Viewer receives record.read only'
);

select throws_ok(
  $$insert into public.object_definitions (organization_id, key, singular_label, plural_label)
    values (current_setting('test.objects_a')::uuid, 'unsafe', 'Unsafe', 'Unsafe')$$,
  '42501', 'permission denied for table object_definitions',
  'direct metadata writes are denied'
);

select lives_ok(
  $$select public.create_dynamic_object(current_setting('test.objects_a')::uuid, 'customer', 'Customer', 'Customers', 'Customer directory')$$,
  'Owner can create a Customer object'
);
select lives_ok(
  $$select public.create_dynamic_object(current_setting('test.objects_a')::uuid, 'contractor', 'Contractor', 'Contractors', '')$$,
  'Owner can create a related Contractor object'
);

select set_config('test.customer_object', (select id::text from public.object_definitions where organization_id = current_setting('test.objects_a')::uuid and key = 'customer'), true);
select set_config('test.contractor_object', (select id::text from public.object_definitions where organization_id = current_setting('test.objects_a')::uuid and key = 'contractor'), true);

select throws_ok(
  $$select public.upsert_object_field(
    current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid,
    'bad_select', 'Bad select', 'select', false, false,
    '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb
  )$$,
  '22023', 'Field options are required.',
  'select fields require options at the database boundary'
);
select throws_ok(
  $$select public.upsert_object_field(
    current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid,
    'unsafe_config', 'Unsafe', 'text', false, false,
    '{"options":[],"validation":{},"visibility":"visible","readOnly":false,"sql":"no"}'::jsonb
  )$$,
  '22023', 'Unknown field configuration property.',
  'unknown field configuration properties are rejected'
);
select throws_ok(
  $$select public.create_dynamic_object(current_setting('test.objects_b')::uuid, 'attack', 'Attack', 'Attacks', '')$$,
  '42501', 'Permission denied.',
  'an Owner cannot create metadata in another tenant'
);

select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'name', 'Name', 'text', true, true, '{"options":[],"validation":{"minLength":2,"maxLength":100},"visibility":"visible","readOnly":false}'::jsonb)$$,
  'required unique text field can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'email', 'Email', 'email', true, true, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb)$$,
  'unique email field can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'customer_status', 'Status', 'status', true, false, '{"options":[{"value":"new","label":"New"},{"value":"active","label":"Active"}],"validation":{},"visibility":"visible","readOnly":false,"defaultValue":"new"}'::jsonb)$$,
  'status field with options and a default can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'discount', 'Discount', 'percentage', false, false, '{"options":[],"validation":{"minimum":0,"maximum":30},"visibility":"visible","readOnly":false,"defaultValue":0}'::jsonb)$$,
  'percentage field can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'home_branch', 'Home Branch', 'branch', false, false, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb)$$,
  'Branch field can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'account_owner', 'Account Owner', 'user', false, false, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb)$$,
  'User field can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'system_code', 'System code', 'text', true, false, '{"options":[],"validation":{},"visibility":"hidden","readOnly":true,"defaultValue":"SYSTEM"}'::jsonb)$$,
  'hidden read-only field with a protected default can be added'
);
select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, 'contractor', 'Contractor', 'relation', false, false, jsonb_build_object('options', '[]'::jsonb, 'validation', '{}'::jsonb, 'visibility', 'visible', 'readOnly', false, 'relationObjectId', current_setting('test.contractor_object')))$$,
  'relation field can target another object in the same tenant'
);

select lives_ok(
  $$select public.upsert_object_field(current_setting('test.objects_a')::uuid, current_setting('test.contractor_object')::uuid, 'name', 'Name', 'text', true, true, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb)$$,
  'Contractor receives a title field'
);
select set_config('test.contractor_record', (
  select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.contractor_object')::uuid, null, '{"name":"Juan Builder"}'::jsonb)::text
), true);
select pass('Contractor record can be created');

select set_config('test.customer_record', (
  select public.save_object_record(
    current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid,
    current_setting('test.objects_a_branch')::uuid,
    jsonb_build_object('name', 'Maria Santos', 'email', 'Maria@Example.test', 'home_branch', current_setting('test.objects_a_branch'), 'contractor', current_setting('test.contractor_record'))
  )::text
), true);
select pass('Customer record can be created with relation and Branch values');

select results_eq(
  $$select display_value, attributes ->> 'customer_status', attributes ->> 'discount', attributes ->> 'system_code'
    from public.object_records where id = current_setting('test.customer_record')::uuid$$,
  $$values ('Maria Santos'::text, 'new'::text, '0'::text, 'SYSTEM'::text)$$,
  'record stores indexed display value and materialized defaults'
);

select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, '{"name":"Other Maria","email":"maria@example.test"}'::jsonb)$$,
  '23505',
  'duplicate key value violates unique constraint "object_record_unique_values_pkey"',
  'dynamic unique email is enforced case-insensitively'
);
select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, '{"name":"High Discount","email":"discount@example.test","discount":50}'::jsonb)$$,
  '22023', 'Invalid object record attributes.',
  'invalid percentage range is rejected'
);
select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, '{"name":"Unknown","email":"unknown@example.test","sql":"no"}'::jsonb)$$,
  '22023', 'Invalid object record attributes.',
  'unknown JSONB attributes are rejected'
);
select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, current_setting('test.objects_b_branch')::uuid, '{"name":"Wrong Branch","email":"branch@example.test"}'::jsonb)$$,
  '42501', 'Permission denied.',
  'record cannot reference another tenant Branch'
);
select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, jsonb_build_object('name','Wrong Relation','email','relation@example.test','contractor',current_setting('test.customer_record')))$$,
  '22023', 'Invalid object record attributes.',
  'relation values must target the configured object'
);
select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, '{"name":"Wrong User","email":"user@example.test","account_owner":"52000000-0000-0000-0000-000000000002"}'::jsonb)$$,
  '22023', 'Invalid object record attributes.',
  'User values must reference an active member of the same Business'
);

select lives_ok(
  $$select public.reorder_object_fields(
    current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid,
    array(
      select id from public.field_definitions where organization_id = current_setting('test.objects_a')::uuid
        and object_definition_id = current_setting('test.customer_object')::uuid and status = 'active' order by sort_order desc
    )
  )$$,
  'fields can be reordered atomically'
);
select results_eq(
  $$select sort_order from public.field_definitions where organization_id = current_setting('test.objects_a')::uuid
    and object_definition_id = current_setting('test.customer_object')::uuid and status = 'active' order by sort_order$$,
  $$values (0), (1), (2), (3), (4), (5), (6), (7)$$,
  'reordered fields receive contiguous positions'
);

select lives_ok(
  $$select public.archive_object_field(
    current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid,
    (select id from public.field_definitions where organization_id = current_setting('test.objects_a')::uuid and object_definition_id = current_setting('test.customer_object')::uuid and key = 'email')
  )$$,
  'field can be archived without deleting record data'
);
select lives_ok(
  $$select public.save_object_record(
    current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid,
    current_setting('test.objects_a_branch')::uuid,
    jsonb_build_object('name','Maria Updated','customer_status','active','discount',10,'home_branch',current_setting('test.objects_a_branch'),'contractor',current_setting('test.contractor_record')),
    current_setting('test.customer_record')::uuid
  )$$,
  'record can be edited after a field is archived'
);
select results_eq(
  $$select attributes ->> 'email', attributes ->> 'name' from public.object_records where id = current_setting('test.customer_record')::uuid$$,
  $$values ('Maria@Example.test'::text, 'Maria Updated'::text)$$,
  'editing preserves archived values while updating active attributes'
);

insert into public.organization_memberships (organization_id, user_id, status, joined_at)
values (current_setting('test.objects_a')::uuid, '53000000-0000-0000-0000-000000000003', 'active', now());
select public.assign_member_access(
  current_setting('test.objects_a')::uuid,
  (select id from public.organization_memberships where organization_id = current_setting('test.objects_a')::uuid and user_id = '53000000-0000-0000-0000-000000000003'),
  array[(select id from public.roles where organization_id = current_setting('test.objects_a')::uuid and key = 'manager')], 'all', '{}'::uuid[]
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"53000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_dynamic_object(current_setting('test.objects_a')::uuid, 'manager_attack', 'Attack', 'Attacks', '')$$,
  '42501', 'Permission denied.',
  'record Manager cannot mutate object metadata'
);
select results_eq(
  $$select count(*) from public.object_records where organization_id = current_setting('test.objects_a')::uuid$$,
  $$values (2::bigint)$$,
  'record Manager can read tenant records'
);
select results_eq(
  $$select count(*) from public.list_object_records_page(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, null, 50)$$,
  $$values (1::bigint)$$,
  'keyset record page returns the requested object records'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '52000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty(
  $$select id from public.object_records where organization_id = current_setting('test.objects_a')::uuid$$,
  'RLS hides another tenant object records'
);
select throws_ok(
  $$select public.save_object_record(current_setting('test.objects_a')::uuid, current_setting('test.customer_object')::uuid, null, '{"name":"Attack"}'::jsonb, current_setting('test.customer_record')::uuid)$$,
  '42501', 'Permission denied.',
  'another tenant cannot update a record through the RPC'
);

reset role;
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'object_records_attributes_gin_idx' and indexdef like '%jsonb_path_ops%'),
  'JSONB containment queries have a GIN path-ops index'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'object_records_active_list_idx' and indexdef like '%WHERE (status = ''active''::text)%'),
  'active record listing has a partial composite index'
);

select * from finish();
rollback;
