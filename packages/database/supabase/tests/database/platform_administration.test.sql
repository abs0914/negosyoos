begin;
create extension if not exists pgtap with schema extensions;
select plan(34);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)values
('00000000-0000-0000-0000-000000000000','93800000-0000-4000-8000-000000000001','authenticated','authenticated','customer@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93800000-0000-4000-8000-000000000002','authenticated','authenticated','platform-one@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93800000-0000-4000-8000-000000000003','authenticated','authenticated','platform-two@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93800000-0000-4000-8000-000000000004','authenticated','authenticated','platform-viewer@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93800000-0000-4000-8000-000000000005','authenticated','authenticated','outsider@example.test','',now(),now(),now());
set local role authenticated;select set_config('request.jwt.claim.sub','93800000-0000-4000-8000-000000000001',true);select set_config('request.jwt.claims','{"sub":"93800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('platform-admin-customer','Customer Business Inc','Customer Business','corporation','retail','{"city":"Cebu"}');
select set_config('test.platform_org',(select id::text from public.organizations where slug='platform-admin-customer'),true);
reset role;
insert into public.platform_administrators(user_id,role,status,granted_by)values
('93800000-0000-4000-8000-000000000002','super_admin','active','93800000-0000-4000-8000-000000000002'),
('93800000-0000-4000-8000-000000000003','platform_admin','active','93800000-0000-4000-8000-000000000002'),
('93800000-0000-4000-8000-000000000004','read_only','active','93800000-0000-4000-8000-000000000002');
set local role authenticated;select set_config('request.jwt.claim.sub','93800000-0000-4000-8000-000000000002',true);select set_config('request.jwt.claims','{"sub":"93800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(private.is_platform_administrator(),true,'Explicit active platform staff is recognized');
select is((select count(*)from public.organization_memberships where organization_id=current_setting('test.platform_org')::uuid),0::bigint,'Platform administrator has no customer membership');
select is((select count(*)from public.organizations where id=current_setting('test.platform_org')::uuid),0::bigint,'Platform administrator cannot directly read customer business rows');
select is((public.platform_admin_dashboard()->'businesses'->0->>'name'),'Customer Business','Dashboard exposes approved account metadata through a narrow RPC');
select ok(jsonb_array_length(public.platform_admin_dashboard()->'modules')>0,'Module registry is available in the console');
select ok(jsonb_array_length(public.platform_admin_dashboard()->'templates')>0,'Business OS templates are available in the console');
select ok(jsonb_array_length(public.platform_admin_dashboard()->'templateVersions')>0,'Template versions are available in the console');
select ok(jsonb_array_length(public.platform_admin_dashboard()->'health')=4,'System health services are available in the console');
select lives_ok($$select public.update_platform_health_check('ai_gateway','healthy','Provider probe succeeded.','{"latencyMs":120}')$$,'Platform manager can update system health');
select is((select status from public.platform_health_checks where service='ai_gateway'),'healthy','Updated health state is available in the console');
select lives_ok($$select set_config('test.platform_version',public.create_platform_template_version((select template_id from public.business_os_template_versions limit 1),(select definition from public.business_os_template_versions limit 1),'Platform admin draft version')::text,true)$$,'Platform manager can create a validated template version');
select is((select item->>'status'from jsonb_array_elements(public.platform_admin_dashboard()->'templateVersions')item where item->>'id'=current_setting('test.platform_version')),'draft','New template versions begin as drafts');
select lives_ok($$select public.publish_platform_template_version(current_setting('test.platform_version')::uuid)$$,'Platform manager can publish a draft template version');
select is((select item->>'status'from jsonb_array_elements(public.platform_admin_dashboard()->'templateVersions')item where item->>'id'=current_setting('test.platform_version')),'published','Published template version state is visible');
select is((public.platform_admin_dashboard()->'aiUsage'->>'trackedRequests')::bigint,0::bigint,'AI usage starts from factual tracked usage only');
select lives_ok($$select public.save_platform_feature_flag('new_reporting','New reporting','Controlled rollout',true,25)$$,'Platform manager can create a feature flag');
select is((public.platform_admin_dashboard()->'featureFlags'->0->>'rolloutPercentage')::integer,25,'Feature flag rollout is visible');
select lives_ok($$select public.set_platform_module_status('sales','draft')$$,'Platform manager can change module registry status');
select is((select action from public.platform_admin_audit_events where entity_type='module'order by occurred_at desc limit 1),'module.status_changed','Module management is audited');
select lives_ok($$select public.set_platform_template_status((select id from public.business_os_templates limit 1),'retired')$$,'Platform manager can manage template registry status');
select lives_ok($$select public.set_platform_business_status(current_setting('test.platform_org')::uuid,'suspended')$$,'Platform manager can suspend a business account without reading its data');
select lives_ok($$select public.set_platform_subscription(current_setting('test.platform_org')::uuid,'pro','active')$$,'Platform manager can manage provider-neutral subscription state');
select is((public.platform_admin_dashboard()->'businesses'->0->>'plan'),'pro','Subscription state is reflected in business account metadata');
select set_config('test.support_request',public.request_platform_support_access(current_setting('test.platform_org')::uuid,'Customer reported a configuration issue requiring investigation.',array['configuration.read'],now()+interval'2 hours')::text,true);
select is((select access_enabled from public.platform_support_access_requests where id=current_setting('test.support_request')::uuid),false,'Support request never enables customer access');
select throws_ok($$select public.review_platform_support_access(current_setting('test.support_request')::uuid,true)$$,'P0001','Support request cannot be reviewed.','Requester cannot self-approve support access');
select set_config('request.jwt.claim.sub','93800000-0000-4000-8000-000000000003',true);select set_config('request.jwt.claims','{"sub":"93800000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.review_platform_support_access(current_setting('test.support_request')::uuid,true)$$,'A second platform manager can complete platform review');
select is((select jsonb_build_array(status,access_enabled,customer_approved_at)from public.platform_support_access_requests where id=current_setting('test.support_request')::uuid),jsonb_build_array('approved_pending_customer',false,null),'Reviewed request still waits for customer approval and remains disconnected');
select is((select count(*)from public.branches where organization_id=current_setting('test.platform_org')::uuid),0::bigint,'Approved support intent still grants no customer branch access');
reset role;
insert into public.platform_ai_usage_events(organization_id,feature,model,request_count,input_tokens,output_tokens,metadata)values(current_setting('test.platform_org')::uuid,'advisor','approved-model',2,100,50,'{"providerRequestId":"safe-1"}');
select throws_ok($$insert into public.platform_ai_usage_events(organization_id,feature,model,metadata)values(current_setting('test.platform_org')::uuid,'advisor','approved-model','{"prompt":"customer secret"}')$$,'23514',null,'AI usage telemetry rejects prompt content');
set local role authenticated;select set_config('request.jwt.claim.sub','93800000-0000-4000-8000-000000000002',true);select set_config('request.jwt.claims','{"sub":"93800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((public.platform_admin_dashboard()->'aiUsage'->>'trackedRequests')::bigint,2::bigint,'Console reports tracked AI request usage');
select throws_ok($$update public.platform_admin_audit_events set action='forged'$$,'42501',null,'Platform administrators cannot directly alter platform audit history');
reset role;select throws_ok($$delete from public.platform_admin_audit_events$$,'P0001','Platform audit events are immutable.','Privileged normal SQL cannot delete platform audit history');
set local role authenticated;select set_config('request.jwt.claim.sub','93800000-0000-4000-8000-000000000004',true);select set_config('request.jwt.claims','{"sub":"93800000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.save_platform_feature_flag('blocked','Blocked','',true,100)$$,'42501','Permission denied.','Read-only platform staff cannot mutate platform configuration');
select set_config('request.jwt.claim.sub','93800000-0000-4000-8000-000000000005',true);select set_config('request.jwt.claims','{"sub":"93800000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.platform_admin_dashboard()$$,'42501','Permission denied.','Ordinary users cannot access the platform console');
select*from finish();rollback;
