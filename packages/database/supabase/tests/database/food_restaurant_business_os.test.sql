begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','99820000-0000-4000-8000-000000000001','authenticated','authenticated','food-os-owner@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','99820000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99820000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('food-os-test','Food OS Test','Food OS Test','corporation','food-restaurant','{"city":"Quezon City"}');
select set_config('test.food_org',(select id::text from public.organizations where slug='food-os-test'),true);
select set_config('test.food_template',(select id::text from public.business_os_templates where key='food-restaurant-os'),true);
select set_config('test.food_version',(select id::text from public.business_os_template_versions where template_id=current_setting('test.food_template')::uuid and version=1),true);

reset role;
insert into public.subscriptions(organization_id,provider,plan_key,status)
values(current_setting('test.food_org')::uuid,'internal','growth','trialing');

set local role authenticated;
select set_config('request.jwt.claim.sub','99820000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99820000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select results_eq(
  $$select name,industry_code,minimum_plan,status from public.business_os_templates where id=current_setting('test.food_template')::uuid$$,
  $$select 'Food & Restaurant OS'::text,'food-restaurant'::text,'growth'::text,'published'::text$$,
  'Registry publishes the Food & Restaurant OS'
);
select results_eq(
  $$select jsonb_array_length(definition->'modules') from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 8$$,
  'Template selects eight existing modules'
);
select results_eq(
  $$select value->>'key' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(value) where version.id=current_setting('test.food_version')::uuid order by value->>'key'$$,
  $$select key from (values('crm'),('employees'),('expenses'),('inventory'),('pos'),('product_catalog'),('purchasing'),('sales')) expected(key)$$,
  'Module selection covers POS, products, inventory, customers, expenses, purchasing, and employees'
);
select results_eq(
  $$select count(*) from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(value) left join public.module_definitions module on module.key=value->>'key' and module.status='published' where version.id=current_setting('test.food_version')::uuid and module.id is null$$,
  $$select 0::bigint$$,
  'Every selected module resolves to the platform registry'
);
select results_eq(
  $$select definition#>>'{terminology,product}',definition#>>'{terminology,inventory}',definition#>>'{terminology,employee}' from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 'Menu Item'::text,'Ingredient Inventory'::text,'Team Member'::text$$,
  'Restaurant terminology is configured'
);
select results_eq(
  $$select value->>'key' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'objects') entry(value) where version.id=current_setting('test.food_version')::uuid order by value->>'key'$$,
  $$select key from (values('recipe'),('recipe_ingredient')) expected(key)$$,
  'Only recipe-specific configurable entities are added'
);
select results_eq(
  $$select sum(jsonb_array_length(value->'fields'))::bigint from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'objects') entry(value) where version.id=current_setting('test.food_version')::uuid$$,
  $$select 14::bigint$$,
  'Recipe configuration defines recipe and ingredient metadata'
);
select results_eq(
  $$select field->>'key' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'objects') object(value) cross join lateral jsonb_array_elements(object.value->'fields') entry(field) where version.id=current_setting('test.food_version')::uuid and object.value->>'key'='recipe_ingredient' and field->>'key' in ('ingredient_sku','quantity','unit','wastage_allowance','consumption_stage') order by field->>'key'$$,
  $$select key from (values('consumption_stage'),('ingredient_sku'),('quantity'),('unit'),('wastage_allowance')) expected(key)$$,
  'Recipe ingredients prepare consumption quantities and wastage allowance'
);
select results_eq(
  $$select definition#>>'{settings,restaurantOperations,ingredientConsumption,mode}',definition#>>'{settings,restaurantOperations,ingredientConsumption,stockLedger}' from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 'manual'::text,'immutable_movements'::text$$,
  'Ingredient consumption is prepared without bypassing the inventory ledger'
);
select results_eq(
  $$select definition#>>'{settings,restaurantOperations,wastage,movementType}',definition#>>'{settings,restaurantOperations,wastage,source}' from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 'wastage'::text,'inventory'::text$$,
  'Wastage delegates to the existing inventory movement type'
);
select results_eq(
  $$select definition#>>'{settings,restaurantOperations,kitchenDisplay,enabled}',definition#>>'{settings,restaurantOperations,kitchenDisplay,implementationStatus}' from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 'false'::text,'not_implemented'::text$$,
  'Kitchen display is explicitly outside this template version'
);
select results_eq(
  $$select jsonb_array_length(definition->'workflows') from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 0$$,
  'Template invents no duplicate operational workflows'
);
select results_eq(
  $$select jsonb_array_length(definition->'reports'),jsonb_array_length(definition#>'{dashboards,0,layoutConfig,widgets}') from public.business_os_template_versions where id=current_setting('test.food_version')::uuid$$,
  $$select 7,7$$,
  'Dashboard includes all seven requested measures'
);
select ok(
  (select bool_and(report->'queryConfig'->>'provider'='core_report') from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'reports') entry(report) where version.id=current_setting('test.food_version')::uuid),
  'Dashboard reports use core report providers'
);
select results_eq(
  $$select report#>>'{queryConfig,movementTypes,0}' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'reports') entry(report) where version.id=current_setting('test.food_version')::uuid and report->>'key'='restaurant_wastage'$$,
  $$select 'wastage'::text$$,
  'Wastage widget reads immutable wastage movements'
);

select lives_ok(
  $$select public.install_business_os_template(current_setting('test.food_org')::uuid,current_setting('test.food_version')::uuid)$$,
  'Food & Restaurant OS installs atomically'
);
select results_eq(
  $$select count(*) from public.organization_modules where organization_id=current_setting('test.food_org')::uuid and is_enabled$$,
  $$select 8::bigint$$,
  'Installation enables the selected modules'
);
select results_eq(
  $$select config from public.organization_modules assignment join public.module_definitions module on module.id=assignment.module_id where assignment.organization_id=current_setting('test.food_org')::uuid and module.key='inventory'$$,
  $$select '{"allow_negative_stock":false,"low_stock_threshold":5}'::jsonb$$,
  'Ingredient inventory prevents negative stock and configures warnings'
);
select results_eq(
  $$select config from public.organization_modules assignment join public.module_definitions module on module.id=assignment.module_id where assignment.organization_id=current_setting('test.food_org')::uuid and module.key='employees'$$,
  $$select '{"employee_number_prefix":"TEAM"}'::jsonb$$,
  'Employee configuration uses restaurant team numbering'
);
select results_eq(
  $$select key from public.object_definitions where organization_id=current_setting('test.food_org')::uuid order by key$$,
  $$select key from (values('recipe'),('recipe_ingredient')) expected(key)$$,
  'Recipe entities install as tenant-owned metadata'
);
select results_eq(
  $$select count(*) from public.field_definitions where organization_id=current_setting('test.food_org')::uuid$$,
  $$select 14::bigint$$,
  'Recipe fields install without schema-specific restaurant tables'
);
select results_eq(
  $$select count(*) from public.form_definitions where organization_id=current_setting('test.food_org')::uuid$$,
  $$select 2::bigint$$,
  'Recipe forms install through the metadata form engine'
);
select results_eq(
  $$select count(*) from public.view_definitions where organization_id=current_setting('test.food_org')::uuid and scope='shared'$$,
  $$select 2::bigint$$,
  'Recipe views install through the reusable ViewRenderer metadata'
);
select results_eq(
  $$select count(*) from public.report_definitions where organization_id=current_setting('test.food_org')::uuid$$,
  $$select 7::bigint$$,
  'Seven tenant report configurations install'
);
select results_eq(
  $$select jsonb_array_length(layout_config->'widgets') from public.dashboard_definitions where organization_id=current_setting('test.food_org')::uuid and key='food_restaurant_overview'$$,
  $$select 7$$,
  'Restaurant dashboard layout installs intact'
);
select results_eq(
  $$select count(*) from public.business_os_installation_events where organization_id=current_setting('test.food_org')::uuid and event='installed'$$,
  $$select 1::bigint$$,
  'Food & Restaurant installation is audited'
);

select * from finish();
rollback;
