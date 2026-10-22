begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','99810000-0000-4000-8000-000000000001','authenticated','authenticated','retail-hardware-owner@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','99810000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99810000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('retail-hardware-test','Retail Hardware Test','Retail Hardware Test','sole_proprietorship','retail-hardware','{"city":"Manila"}');
select set_config('test.retail_hardware_org',(select id::text from public.organizations where slug='retail-hardware-test'),true);
select set_config('test.retail_hardware_template',(select id::text from public.business_os_templates where key='retail-store-os'),true);
select set_config('test.retail_hardware_version',(select id::text from public.business_os_template_versions where template_id=current_setting('test.retail_hardware_template')::uuid and version=2),true);

reset role;
insert into public.subscriptions(organization_id,provider,plan_key,status)
values(current_setting('test.retail_hardware_org')::uuid,'internal','growth','trialing');

set local role authenticated;
select set_config('request.jwt.claim.sub','99810000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99810000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select results_eq(
  $$select name,industry_code,minimum_plan from public.business_os_templates where id=current_setting('test.retail_hardware_template')::uuid$$,
  $$select 'Retail & Hardware OS'::text,'retail-hardware'::text,'growth'::text$$,
  'Registry identifies the Retail & Hardware OS'
);
select results_eq(
  $$select version,status from public.business_os_template_versions where id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 2,'published'::text$$,
  'Retail & Hardware configuration is an immutable published version'
);
select results_eq(
  $$select jsonb_array_length(definition->'modules') from public.business_os_template_versions where id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 10$$,
  'Template selects ten existing platform modules'
);
select results_eq(
  $$select value->>'key' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') module(value) where version.id=current_setting('test.retail_hardware_version')::uuid order by value->>'key'$$,
  $$select key from (values('crm'),('delivery'),('expenses'),('inventory'),('invoicing'),('pos'),('product_catalog'),('purchasing'),('quotations'),('sales')) expected(key)$$,
  'Module selections cover POS, sales, catalog, inventory, CRM, suppliers and purchasing, quotations, receivables, expenses, and delivery'
);
select results_eq(
  $$select count(*) from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') module(value) left join public.module_definitions definition on definition.key=value->>'key' and definition.status='published' where version.id=current_setting('test.retail_hardware_version')::uuid and definition.id is null$$,
  $$select 0::bigint$$,
  'Every selected capability resolves to an existing published module'
);
select results_eq(
  $$select jsonb_array_length(definition->'objects') from public.business_os_template_versions where id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 0$$,
  'Template creates no duplicate business objects'
);
select results_eq(
  $$select jsonb_array_length(definition->'reports') from public.business_os_template_versions where id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 8$$,
  'Eight dashboard report definitions are configured'
);
select results_eq(
  $$select jsonb_array_length(definition#>'{dashboards,0,layoutConfig,widgets}') from public.business_os_template_versions where id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 8$$,
  'Operating dashboard contains all eight requested widgets'
);
select results_eq(
  $$select definition#>>'{terminology,contractors}',definition#>>'{terminology,credit_customers}',definition#>>'{terminology,quotations}',definition#>>'{terminology,deliveries}' from public.business_os_template_versions where id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 'Contractors'::text,'Credit Customers'::text,'Sales Quotations'::text,'Delivery Orders'::text$$,
  'Retail and hardware terminology is configured'
);
select results_eq(
  $$select module->'config' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'modules') entry(module) where version.id=current_setting('test.retail_hardware_version')::uuid and module->>'key'='quotations'$$,
  $$select '{"validity_days":30,"discount_approval_percentage":10,"discount_approver_role":"manager"}'::jsonb$$,
  'Quotation module owns the executable discount approval threshold'
);
select results_eq(
  $$select workflow#>>'{policyBinding,executionOwner}',workflow#>>'{policyBinding,moduleKey}',workflow->>'status' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'workflows') entry(workflow) where version.id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 'quotation_module'::text,'quotations'::text,'disabled'::text$$,
  'Visual workflow is bound to the existing quotation policy and cannot execute a duplicate approval path'
);
select results_eq(
  $$select workflow#>>'{conditions,conditions,0,fieldKey}',workflow#>>'{conditions,conditions,0,operator}',workflow#>>'{conditions,conditions,0,value}',workflow#>>'{actions,0,type}',workflow#>>'{actions,0,approverRoleKey}' from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'workflows') entry(workflow) where version.id=current_setting('test.retail_hardware_version')::uuid$$,
  $$select 'discount_percentage'::text,'greater_than'::text,'10'::text,'request_approval'::text,'manager'::text$$,
  'Workflow metadata declares the greater-than-ten manager approval policy'
);
select ok(
  (select bool_and(report->'queryConfig'->>'provider'='core_report') from public.business_os_template_versions version cross join lateral jsonb_array_elements(version.definition->'reports') entry(report) where version.id=current_setting('test.retail_hardware_version')::uuid),
  'Dashboard queries delegate to existing core report providers'
);

select lives_ok(
  $$select public.install_business_os_template(current_setting('test.retail_hardware_org')::uuid,current_setting('test.retail_hardware_version')::uuid)$$,
  'Retail & Hardware OS installs atomically'
);
select results_eq(
  $$select count(*) from public.organization_modules where organization_id=current_setting('test.retail_hardware_org')::uuid and is_enabled$$,
  $$select 10::bigint$$,
  'Installation enables the selected modules'
);
select results_eq(
  $$select assignment.config from public.organization_modules assignment join public.module_definitions definition on definition.id=assignment.module_id where assignment.organization_id=current_setting('test.retail_hardware_org')::uuid and definition.key='inventory'$$,
  $$select '{"allow_negative_stock":false,"low_stock_threshold":5}'::jsonb$$,
  'Inventory safety and low-stock configuration are installed'
);
select results_eq(
  $$select assignment.config from public.organization_modules assignment join public.module_definitions definition on definition.id=assignment.module_id where assignment.organization_id=current_setting('test.retail_hardware_org')::uuid and definition.key='quotations'$$,
  $$select '{"validity_days":30,"discount_approval_percentage":10,"discount_approver_role":"manager"}'::jsonb$$,
  'Executable quotation approval settings are installed once'
);
select results_eq(
  $$select status,trigger_config->>'type',conditions#>>'{conditions,0,operator}',steps#>>'{0,type}' from public.workflow_definitions where organization_id=current_setting('test.retail_hardware_org')::uuid and key='quotation_discount_manager_approval'$$,
  $$select 'disabled'::text,'manual'::text,'greater_than'::text,'request_approval'::text$$,
  'Visual workflow installs in non-executing policy-documentation mode'
);
select results_eq(
  $$select count(*) from public.report_definitions where organization_id=current_setting('test.retail_hardware_org')::uuid$$,
  $$select 8::bigint$$,
  'All core-backed dashboard reports install as tenant configuration'
);
select results_eq(
  $$select jsonb_array_length(layout_config->'widgets') from public.dashboard_definitions where organization_id=current_setting('test.retail_hardware_org')::uuid and key='retail_hardware_overview'$$,
  $$select 8$$,
  'Retail & Hardware dashboard layout installs intact'
);
select results_eq(
  $$select terminology->>'contractors',terminology->>'credit_customers',terminology->>'quotations',terminology->>'deliveries' from public.business_os_installations where organization_id=current_setting('test.retail_hardware_org')::uuid$$,
  $$select 'Contractors'::text,'Credit Customers'::text,'Sales Quotations'::text,'Delivery Orders'::text$$,
  'Terminology is copied to the tenant overlay'
);
select results_eq(
  $$select count(*) from public.business_os_installation_resources where organization_id=current_setting('test.retail_hardware_org')::uuid and resource_type in ('object','field','form','view')$$,
  $$select 0::bigint$$,
  'Installation introduces no replacement domain models or pages'
);
select results_eq(
  $$select config from public.organization_modules assignment join public.module_definitions definition on definition.id=assignment.module_id where assignment.organization_id=current_setting('test.retail_hardware_org')::uuid and definition.key='delivery'$$,
  $$select '{"require_proof_of_delivery":true,"default_courier_provider":"internal"}'::jsonb$$,
  'Delivery orders use the existing delivery module with proof configured'
);
select results_eq(
  $$select count(*) from public.business_os_installation_events where organization_id=current_setting('test.retail_hardware_org')::uuid and event='installed'$$,
  $$select 1::bigint$$,
  'Template installation is audited once'
);

select * from finish();
rollback;
