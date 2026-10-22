begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','99830000-0000-4000-8000-000000000001','authenticated','authenticated','salon-os-owner@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','99830000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99830000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('salon-os-test','Salon OS Test','Salon OS Test','sole_proprietorship','salon-service','{"city":"Makati"}');
select set_config('test.salon_org',(select id::text from public.organizations where slug='salon-os-test'),true);
select set_config('test.salon_template',(select id::text from public.business_os_templates where key='service-business-os'),true);
select set_config('test.salon_version',(select id::text from public.business_os_template_versions where template_id=current_setting('test.salon_template')::uuid and version=2),true);

reset role;
insert into public.subscriptions(organization_id,provider,plan_key,status)
values(current_setting('test.salon_org')::uuid,'internal','pro','trialing');

set local role authenticated;
select set_config('request.jwt.claim.sub','99830000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99830000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select results_eq(
  $$select name,industry_code,minimum_plan,status from public.business_os_templates where id=current_setting('test.salon_template')::uuid$$,
  $$select 'Salon & Service OS'::text,'salon-service'::text,'pro'::text,'published'::text$$,
  'Registry publishes the Salon & Service OS on the plan required by Loyalty'
);
select results_eq(
  $$select version,status from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 2,'published'::text$$,
  'Salon configuration is a new immutable service-template version'
);
select results_eq(
  $$select jsonb_array_length(definition->'modules') from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 9$$,
  'Template selects eight requested modules plus the Job Orders inventory dependency'
);
select results_eq(
  $$select value->>'key' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(value) where version.id=current_setting('test.salon_version')::uuid order by value->>'key'$$,
  $$select key from (values('appointments'),('crm'),('employees'),('expenses'),('inventory'),('job_orders'),('loyalty'),('product_catalog'),('sales')) expected(key)$$,
  'Module selection includes CRM, bookings, service tickets, sales, catalog, staff, loyalty, expenses, and the required dependency'
);
select results_eq(
  $$select count(*) from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(value) left join public.module_definitions module on module.key=value->>'key' and module.status='published' where version.id=current_setting('test.salon_version')::uuid and module.id is null$$,
  $$select 0::bigint$$,
  'Every capability resolves to an existing platform module'
);
select results_eq(
  $$select definition#>>'{settings,salonServiceOperations,inventorySupport,enabledAsJobOrderDependency}',definition#>>'{settings,salonServiceOperations,inventorySupport,automaticConsumption}' from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 'true'::text,'false'::text$$,
  'Supporting inventory is documented and automatic consumption remains off'
);
select results_eq(
  $$select definition#>>'{terminology,customer}',definition#>>'{terminology,appointment}',definition#>>'{terminology,job_order}' from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 'Client'::text,'Booking'::text,'Service Ticket'::text$$,
  'Client-facing entities use salon terminology'
);
select results_eq(
  $$select definition#>>'{terminology,product}',definition#>>'{terminology,employee}',definition#>>'{terminology,loyalty_points}' from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 'Service & Retail Item'::text,'Staff Member'::text,'Reward Points'::text$$,
  'Catalog, staff, and loyalty terminology is renamed'
);
select results_eq(
  $$select module->'config' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(module) where version.id=current_setting('test.salon_version')::uuid and module->>'key'='appointments'$$,
  $$select '{"slot_minutes":30,"prevent_staff_conflicts":true,"prevent_customer_conflicts":false}'::jsonb$$,
  'Bookings use 30-minute slots and prevent staff conflicts'
);
select results_eq(
  $$select module->'config' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(module) where version.id=current_setting('test.salon_version')::uuid and module->>'key'='job_orders'$$,
  $$select '{"singular_label":"Service Ticket","plural_label":"Service Tickets","consume_inventory":false,"consumption_trigger":"manual"}'::jsonb$$,
  'Job Orders are configured as Service Tickets without material consumption'
);
select results_eq(
  $$select module->'config' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(module) where version.id=current_setting('test.salon_version')::uuid and module->>'key'='loyalty'$$,
  $$select '{"points_label":"Reward Points","automatic_sale_awards":true}'::jsonb$$,
  'Existing Loyalty awards completed sales using renamed points'
);
select results_eq(
  $$select jsonb_array_length(definition->'objects'),jsonb_array_length(definition->'workflows') from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 0,0$$,
  'Template creates no duplicate entities or workflows'
);
select results_eq(
  $$select jsonb_array_length(definition->'reports'),jsonb_array_length(definition#>'{dashboards,0,layoutConfig,widgets}') from public.business_os_template_versions where id=current_setting('test.salon_version')::uuid$$,
  $$select 7,7$$,
  'Dashboard configures all seven requested measures'
);
select results_eq(
  $$select report->>'key' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'reports') entry(report) where version.id=current_setting('test.salon_version')::uuid order by report->>'key'$$,
  $$select key from (values('completed_services'),('customer_retention'),('expected_revenue'),('repeat_customers'),('salon_sales'),('staff_utilization'),('today_appointments')) expected(key)$$,
  'Dashboard reports cover bookings, revenue, services, utilization, repeat clients, retention, and sales'
);
select ok(
  (select bool_and(report->'queryConfig'->>'provider'='core_report') from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'reports') entry(report) where version.id=current_setting('test.salon_version')::uuid),
  'Dashboard delegates computation to core report providers'
);

select lives_ok(
  $$select public.install_business_os_template(current_setting('test.salon_org')::uuid,current_setting('test.salon_version')::uuid)$$,
  'Salon & Service OS installs atomically'
);
select results_eq(
  $$select count(*) from public.organization_modules where organization_id=current_setting('test.salon_org')::uuid and is_enabled$$,
  $$select 9::bigint$$,
  'Installation enables requested modules and their declared dependency'
);
select results_eq(
  $$select config from public.organization_modules assignment join public.module_definitions module on module.id=assignment.module_id where assignment.organization_id=current_setting('test.salon_org')::uuid and module.key='appointments'$$,
  $$select '{"slot_minutes":30,"prevent_staff_conflicts":true,"prevent_customer_conflicts":false}'::jsonb$$,
  'Booking conflict configuration installs intact'
);
select results_eq(
  $$select config from public.organization_modules assignment join public.module_definitions module on module.id=assignment.module_id where assignment.organization_id=current_setting('test.salon_org')::uuid and module.key='job_orders'$$,
  $$select '{"singular_label":"Service Ticket","plural_label":"Service Tickets","consume_inventory":false,"consumption_trigger":"manual"}'::jsonb$$,
  'Service Ticket module terminology installs intact'
);
select results_eq(
  $$select config from public.organization_modules assignment join public.module_definitions module on module.id=assignment.module_id where assignment.organization_id=current_setting('test.salon_org')::uuid and module.key='loyalty'$$,
  $$select '{"points_label":"Reward Points","automatic_sale_awards":true}'::jsonb$$,
  'Reward Points configuration installs intact'
);
select results_eq(
  $$select terminology->>'customer',terminology->>'appointment',terminology->>'job_order',terminology->>'employee' from public.business_os_installations where organization_id=current_setting('test.salon_org')::uuid$$,
  $$select 'Client'::text,'Booking'::text,'Service Ticket'::text,'Staff Member'::text$$,
  'Renamed entities are copied to the tenant terminology overlay'
);
select results_eq(
  $$select count(*) from public.report_definitions where organization_id=current_setting('test.salon_org')::uuid$$,
  $$select 7::bigint$$,
  'Seven tenant report definitions install'
);
select results_eq(
  $$select jsonb_array_length(layout_config->'widgets') from public.dashboard_definitions where organization_id=current_setting('test.salon_org')::uuid and key='salon_service_overview'$$,
  $$select 7$$,
  'Salon dashboard layout installs intact'
);
select results_eq(
  $$select count(*) from public.business_os_installation_resources where organization_id=current_setting('test.salon_org')::uuid and resource_type in ('object','field','form','view','workflow')$$,
  $$select 0::bigint$$,
  'Installation introduces no replacement business logic or metadata objects'
);
select results_eq(
  $$select count(*) from public.business_os_installation_events where organization_id=current_setting('test.salon_org')::uuid and event='installed'$$,
  $$select 1::bigint$$,
  'Salon & Service installation is audited'
);

select * from finish();
rollback;
