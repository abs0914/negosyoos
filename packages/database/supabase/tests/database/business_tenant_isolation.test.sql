begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'tenant-a@example.test', '', now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'tenant-b@example.test', '', now(), now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.create_business(
    'tenant-a', 'Tenant A Legal', 'Tenant A', 'sole_proprietorship', 'retail',
    '{"city":"Manila","province":"Metro Manila"}'::jsonb,
    '+639171111111', 'owner-a@example.test', '{"tin":"123-456-789"}'::jsonb
  )$$,
  'user A can atomically create a business'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.create_business(
    'tenant-b', 'Tenant B Legal', 'Tenant B', 'corporation', 'services',
    '{"city":"Cebu City","province":"Cebu"}'::jsonb,
    '+639172222222', 'owner-b@example.test', '{}'::jsonb
  )$$,
  'user B can atomically create a business'
);

reset role;
select set_config(
  'test.business_a',
  (select id::text from public.organizations where slug = 'tenant-a'),
  true
);
select set_config(
  'test.business_b',
  (select id::text from public.organizations where slug = 'tenant-b'),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select results_eq(
  $$select count(*) from public.organizations$$,
  $$values (1::bigint)$$,
  'user A sees only one business'
);

select is_empty(
  $$select id from public.organizations where id = current_setting('test.business_b')::uuid$$,
  'user A cannot read business B'
);

select is_empty(
  $$select id from public.branches where organization_id = current_setting('test.business_b')::uuid$$,
  'user A cannot read business B branches'
);

select is_empty(
  $$select organization_id from public.business_settings where organization_id = current_setting('test.business_b')::uuid$$,
  'user A cannot read business B settings'
);

select is_empty(
  $$update public.organizations set display_name = 'Compromised' where id = current_setting('test.business_b')::uuid returning id$$,
  'user A cannot update business B'
);

select is_empty(
  $$update public.branches set name = 'Compromised' where organization_id = current_setting('test.business_b')::uuid returning id$$,
  'user A cannot update business B branches'
);

select is_empty(
  $$update public.business_settings set locale = 'fil-PH' where organization_id = current_setting('test.business_b')::uuid returning organization_id$$,
  'user A cannot update business B settings'
);

select throws_ok(
  $$insert into public.branches (organization_id, code, name)
    values (current_setting('test.business_b')::uuid, 'attack', 'Unauthorized Branch')$$,
  '42501'
);

select throws_ok(
  $$update public.branches
    set organization_id = current_setting('test.business_b')::uuid
    where organization_id = current_setting('test.business_a')::uuid$$,
  '42501'
);

select is(
  public.has_org_permission(current_setting('test.business_b')::uuid, 'branch.read'),
  false,
  'user A has no permission in business B'
);

select results_eq(
  $$select country_code::text, currency_code::text, timezone
    from public.organizations
    where id = current_setting('test.business_a')::uuid$$,
  $$values ('PH'::text, 'PHP'::text, 'Asia/Manila'::text)$$,
  'new businesses receive Philippine defaults'
);

select results_eq(
  $$select count(*) from public.business_settings
    where organization_id = current_setting('test.business_a')::uuid$$,
  $$values (1::bigint)$$,
  'business creation includes one settings row'
);

select results_eq(
  $$select count(*) from public.branches
    where organization_id = current_setting('test.business_a')::uuid$$,
  $$values (1::bigint)$$,
  'business creation includes a main branch'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select results_eq(
  $$select slug from public.organizations order by slug$$,
  $$values ('tenant-b'::text)$$,
  'user B sees only business B'
);

select * from finish();
rollback;
