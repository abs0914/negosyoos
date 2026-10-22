begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'form-owner-a@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '62000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'form-owner-b@example.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '63000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'form-manager@example.test', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.create_business('forms-a', 'Forms A Legal', 'Forms A', 'corporation', 'retail', '{"city":"Manila"}'::jsonb);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.create_business('forms-b', 'Forms B Legal', 'Forms B', 'corporation', 'services', '{"city":"Cebu"}'::jsonb);

reset role;
select set_config('test.forms_a', (select id::text from public.organizations where slug = 'forms-a'), true);
select set_config('test.forms_b', (select id::text from public.organizations where slug = 'forms-b'), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.create_dynamic_object(current_setting('test.forms_b')::uuid, 'customer', 'Customer', 'Customers', '');
select set_config('test.forms_b_object', (select id::text from public.object_definitions where organization_id = current_setting('test.forms_b')::uuid and key = 'customer'), true);
select public.upsert_object_field(current_setting('test.forms_b')::uuid, current_setting('test.forms_b_object')::uuid, 'name', 'Name', 'text', true, false, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb);
select set_config('test.forms_b_field', (select id::text from public.field_definitions where organization_id = current_setting('test.forms_b')::uuid and object_definition_id = current_setting('test.forms_b_object')::uuid and key = 'name'), true);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.create_dynamic_object(current_setting('test.forms_a')::uuid, 'order', 'Order', 'Orders', '');
select set_config('test.forms_a_object', (select id::text from public.object_definitions where organization_id = current_setting('test.forms_a')::uuid and key = 'order'), true);
select public.upsert_object_field(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'name', 'Name', 'text', true, false, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb);
select public.upsert_object_field(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'requires_delivery', 'Requires delivery', 'boolean', false, false, '{"options":[],"validation":{},"visibility":"visible","readOnly":false,"defaultValue":false}'::jsonb);
select public.upsert_object_field(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'delivery_address', 'Delivery address', 'textarea', false, false, '{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb);
select public.upsert_object_field(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'system_code', 'System code', 'text', true, false, '{"options":[],"validation":{},"visibility":"hidden","readOnly":true,"defaultValue":"SYSTEM"}'::jsonb);
select set_config('test.name_field', (select id::text from public.field_definitions where organization_id = current_setting('test.forms_a')::uuid and object_definition_id = current_setting('test.forms_a_object')::uuid and key = 'name'), true);
select set_config('test.delivery_toggle_field', (select id::text from public.field_definitions where organization_id = current_setting('test.forms_a')::uuid and object_definition_id = current_setting('test.forms_a_object')::uuid and key = 'requires_delivery'), true);
select set_config('test.address_field', (select id::text from public.field_definitions where organization_id = current_setting('test.forms_a')::uuid and object_definition_id = current_setting('test.forms_a_object')::uuid and key = 'delivery_address'), true);
select set_config('test.hidden_field', (select id::text from public.field_definitions where organization_id = current_setting('test.forms_a')::uuid and object_definition_id = current_setting('test.forms_a_object')::uuid and key = 'system_code'), true);

select results_eq($$select count(*) from public.permissions where key in ('form.read', 'form.manage')$$, $$values (2::bigint)$$, 'form capabilities are registered');
select is(public.can_business_permission(current_setting('test.forms_a')::uuid, 'form.manage'), true, 'Owner can manage forms');
select results_eq(
  $$select array_agg(permission.key order by permission.key) from public.roles role
    join public.role_permissions assignment on assignment.role_id = role.id
    join public.permissions permission on permission.id = assignment.permission_id
    where role.organization_id = current_setting('test.forms_a')::uuid and role.key = 'viewer' and permission.domain = 'form'$$,
  $$values (array['form.read']::text[])$$,
  'Viewer receives form.read but not form.manage'
);
select throws_ok(
  $$insert into public.form_definitions (organization_id, object_definition_id, key, name, mode, created_by, updated_by)
    values (current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'unsafe', 'Unsafe', 'create', '61000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001')$$,
  '42501', 'permission denied for table form_definitions', 'direct form metadata writes are denied'
);

select set_config('test.valid_layout', jsonb_build_array(jsonb_build_object(
  'key', 'delivery', 'title', 'Delivery', 'description', 'Order delivery details', 'columns', 2,
  'fields', jsonb_build_array(
    jsonb_build_object('fieldId', current_setting('test.name_field'), 'width', 'full', 'required', false, 'readOnly', false),
    jsonb_build_object('fieldId', current_setting('test.delivery_toggle_field'), 'width', 'half', 'required', false, 'readOnly', false, 'defaultValue', false),
    jsonb_build_object('fieldId', current_setting('test.address_field'), 'width', 'full', 'required', true, 'readOnly', false,
      'visibilityRule', jsonb_build_object('logic', 'all', 'conditions', jsonb_build_array(
        jsonb_build_object('sourceFieldId', current_setting('test.delivery_toggle_field'), 'operator', 'equals', 'value', true)
      )))
  )
))::text, true);
select set_config('test.form_id', (
  select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid,
    'delivery_form', 'Delivery form', 'Safe conditional form', 'create', current_setting('test.valid_layout')::jsonb)::text
), true);
select pass('Owner can create a valid declarative form');
select results_eq(
  $$select key, name, mode from public.form_definitions where id = current_setting('test.form_id')::uuid$$,
  $$values ('delivery_form'::text, 'Delivery form'::text, 'create'::text)$$,
  'FormDefinition persists stable identity and mode'
);
select results_eq(
  $$select jsonb_array_length(sections), sections #>> '{0,fields,2,visibilityRule,conditions,0,operator}' from public.form_layouts where form_definition_id = current_setting('test.form_id')::uuid$$,
  $$values (1, 'equals'::text)$$,
  'FormLayout persists sections and controlled conditions'
);
select lives_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid,
    'delivery_form', 'Updated delivery form', '', 'create', current_setting('test.valid_layout')::jsonb, current_setting('test.form_id')::uuid)$$,
  'form metadata can be updated atomically'
);
select results_eq($$select version from public.form_layouts where form_definition_id = current_setting('test.form_id')::uuid$$, $$values (2)$$, 'layout version increments on update');

select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'javascript', 'JavaScript', '', 'create',
    jsonb_set(current_setting('test.valid_layout')::jsonb, '{0,fields,0,javascript}', '"alert(1)"'::jsonb))$$,
  '22023', 'Invalid form layout.', 'executable or unknown field properties are rejected'
);
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'forward_rule', 'Forward rule', '', 'create',
    jsonb_build_array(jsonb_build_object('key','details','title','Details','description','','columns',1,'fields',jsonb_build_array(
      jsonb_build_object('fieldId',current_setting('test.address_field'),'width','full','required',false,'readOnly',false,'visibilityRule',jsonb_build_object('logic','all','conditions',jsonb_build_array(jsonb_build_object('sourceFieldId',current_setting('test.delivery_toggle_field'),'operator','equals','value',true)))),
      jsonb_build_object('fieldId',current_setting('test.delivery_toggle_field'),'width','full','required',false,'readOnly',false),
      jsonb_build_object('fieldId',current_setting('test.name_field'),'width','full','required',false,'readOnly',false)
    ))))$$,
  '22023', 'Invalid form layout.', 'rules cannot reference later fields or create condition cycles'
);
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'missing_required', 'Missing required', '', 'create',
    jsonb_build_array(jsonb_build_object('key','details','title','Details','description','','columns',1,'fields',jsonb_build_array(jsonb_build_object('fieldId',current_setting('test.delivery_toggle_field'),'width','full','required',false,'readOnly',false)))))$$,
  '22023', 'Invalid form layout.', 'create forms must contain object-required fields without defaults'
);
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'hidden_field', 'Hidden field', '', 'create',
    jsonb_build_array(jsonb_build_object('key','details','title','Details','description','','columns',1,'fields',jsonb_build_array(jsonb_build_object('fieldId',current_setting('test.hidden_field'),'width','full','required',false,'readOnly',false),jsonb_build_object('fieldId',current_setting('test.name_field'),'width','full','required',false,'readOnly',false)))))$$,
  '22023', 'Invalid form layout.', 'object-hidden fields cannot be placed on forms'
);
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'bad_comparison', 'Bad comparison', '', 'create',
    jsonb_set(current_setting('test.valid_layout')::jsonb, '{0,fields,2,visibilityRule,conditions,0,value}', '"yes"'::jsonb))$$,
  '22023', 'Invalid form layout.', 'condition comparison values must match their source field type'
);
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'foreign_field', 'Foreign field', '', 'edit',
    jsonb_build_array(jsonb_build_object('key','details','title','Details','description','','columns',1,'fields',jsonb_build_array(jsonb_build_object('fieldId',current_setting('test.forms_b_field'),'width','full','required',false,'readOnly',false)))))$$,
  '22023', 'Invalid form layout.', 'forms cannot include another tenant field'
);
select throws_ok(
  $$update public.form_layouts set sections = '[]'::jsonb where form_definition_id = current_setting('test.form_id')::uuid$$,
  '42501', 'permission denied for table form_layouts', 'direct layout updates are denied'
);

insert into public.organization_memberships (organization_id, user_id, status, joined_at)
values (current_setting('test.forms_a')::uuid, '63000000-0000-4000-8000-000000000003', 'active', now());
select public.assign_member_access(current_setting('test.forms_a')::uuid,
  (select id from public.organization_memberships where organization_id = current_setting('test.forms_a')::uuid and user_id = '63000000-0000-4000-8000-000000000003'),
  array[(select id from public.roles where organization_id = current_setting('test.forms_a')::uuid and key = 'manager')], 'all', '{}'::uuid[]);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '63000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"63000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select results_eq($$select count(*) from public.form_definitions where organization_id = current_setting('test.forms_a')::uuid$$, $$values (1::bigint)$$, 'Manager can read Business forms');
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'manager_attack', 'Attack', '', 'create', current_setting('test.valid_layout')::jsonb)$$,
  '42501', 'Permission denied.', 'form.read does not grant form management'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"62000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is_empty($$select id from public.form_definitions where organization_id = current_setting('test.forms_a')::uuid$$, 'RLS hides another tenant FormDefinition');
select is_empty($$select id from public.form_layouts where organization_id = current_setting('test.forms_a')::uuid$$, 'RLS hides another tenant FormLayout');
select throws_ok(
  $$select public.save_dynamic_form(current_setting('test.forms_a')::uuid, current_setting('test.forms_a_object')::uuid, 'tenant_attack', 'Attack', '', 'create', current_setting('test.valid_layout')::jsonb)$$,
  '42501', 'Permission denied.', 'another tenant cannot mutate forms through the RPC'
);

reset role;
select ok(exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'form_definitions_active_object_idx' and indexdef like '%WHERE (status = ''active''::text)%'), 'active object form lookup has a partial composite index');
select ok(exists(select 1 from pg_constraint where conname = 'form_layouts_organization_id_form_definition_id_fkey'), 'FormLayout has a tenant-composite foreign key');

select * from finish();
rollback;
