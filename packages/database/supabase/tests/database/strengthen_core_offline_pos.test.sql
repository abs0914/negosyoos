begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','94000000-0000-4000-8000-000000000001','authenticated','authenticated','offline-pos@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('offline-core-test','Offline Core Test','Offline Core','sole_proprietorship','retail','{"city":"Manila"}');
select set_config('test.core_org',(select id::text from public.organizations where slug='offline-core-test'),true);
select set_config('test.core_branch',(select id::text from public.branches where organization_id=current_setting('test.core_org')::uuid and code='main'),true);
select public.set_business_module_state(current_setting('test.core_org')::uuid,'product_catalog',true,'{}');
select public.set_business_module_state(current_setting('test.core_org')::uuid,'inventory',true,'{"allow_negative_stock":false}');
select public.set_business_module_state(current_setting('test.core_org')::uuid,'sales',true,'{}');
select public.set_business_module_state(current_setting('test.core_org')::uuid,'pos',true,'{}');
select set_config('test.core_location',(select id::text from public.inventory_locations where organization_id=current_setting('test.core_org')::uuid limit 1),true);
select set_config('test.core_product',public.save_catalog_product(current_setting('test.core_org')::uuid,null,null,'product','Offline Item','',null,null,'piece',100,50,'exempt',0,'active',false,'[{"name":"Default","sku":"OFF-001","barcode":"4800000000001","attributes":{},"status":"active"}]','[]')::text,true);
select set_config('test.core_variant',(select id::text from public.product_variants where product_id=current_setting('test.core_product')::uuid),true);
select set_config('test.core_item',public.configure_inventory_item(current_setting('test.core_org')::uuid,null,current_setting('test.core_variant')::uuid,1,2,true)::text,true);
select public.record_stock_movement(current_setting('test.core_org')::uuid,current_setting('test.core_item')::uuid,current_setting('test.core_location')::uuid,'opening_balance',1,50,'Opening','offline-core-opening');

select set_config('test.register_id','94000000-0000-4000-8000-000000000010',true);
select set_config('test.client_session','94000000-0000-4000-8000-000000000011',true);
select set_config('test.bootstrap',public.bootstrap_pos_register(current_setting('test.core_org')::uuid,current_setting('test.register_id')::uuid,current_setting('test.core_branch')::uuid,current_setting('test.core_location')::uuid,'Test tablet',current_setting('test.client_session')::uuid,500)::text,true);
select is((current_setting('test.bootstrap')::jsonb->>'sessionStatus'),'open','Register bootstrap opens a session');
select ok((current_setting('test.bootstrap')::jsonb->>'leaseExpiresAt')::timestamptz<=now()+interval '24 hours 1 minute','Offline lease is bounded to 24 hours');
select results_eq($$select count(*)from public.pos_registers where organization_id=current_setting('test.core_org')::uuid$$,$$select 1::bigint$$,'Register enrollment is persisted');
select throws_ok($$select count(*)from public.pos_offline_leases where organization_id=current_setting('test.core_org')::uuid$$,'42501','permission denied for table pos_offline_leases','Raw lease material and hashes are not browser-readable');
select is(jsonb_array_length(public.pos_catalog_snapshot(current_setting('test.core_org')::uuid,current_setting('test.core_location')::uuid,null)->'items'),1,'Catalog snapshot projects the register catalog in one call');
select is((public.pos_catalog_snapshot(current_setting('test.core_org')::uuid,current_setting('test.core_location')::uuid,public.pos_catalog_snapshot(current_setting('test.core_org')::uuid,current_setting('test.core_location')::uuid,null)->>'revision')->>'notModified')::boolean,true,'Catalog revision avoids unchanged payloads');

select set_config('test.command','94000000-0000-4000-8000-000000000020',true);
select set_config('test.payload',jsonb_build_object('type','sale.complete','branchId',current_setting('test.core_branch'),'inventoryLocationId',current_setting('test.core_location'),'customerId',null,'provisionalReceiptNumber','OFF-MAIN-R-94000000-000001','lines',jsonb_build_array(jsonb_build_object('productVariantId',current_setting('test.core_variant'),'quantity',2,'discountAmount',0)),'payments',jsonb_build_array(jsonb_build_object('method','digital','amount',200,'reference','GCASH-TEST-1')))::text,true);
select is((public.process_pos_command(current_setting('test.core_org')::uuid,current_setting('test.command')::uuid,1,current_setting('test.register_id')::uuid,(current_setting('test.bootstrap')::jsonb->>'sessionId')::uuid,now(),'offline',current_setting('test.bootstrap')::jsonb->>'leaseToken',current_setting('test.payload')::jsonb)->>'status'),'applied','Offline command is applied atomically');
select ok((select receipt_number like 'POS-MAIN-%' from public.sales_transactions where command_id=current_setting('test.command')::uuid),'Canonical Branch receipt is assigned');
select is((select provisional_receipt_number from public.sales_transactions where command_id=current_setting('test.command')::uuid),'OFF-MAIN-R-94000000-000001','Provisional receipt remains traceable');
select is((select payment.status from public.sales_payments payment join public.sales_transactions sale on sale.id=payment.sale_id where sale.command_id=current_setting('test.command')::uuid),'pending_verification','Offline digital payment requires verification');
select results_eq($$select quantity from public.stock_balances where inventory_item_id=current_setting('test.core_item')::uuid$$,$$select -1::numeric$$,'Concluded offline sale may produce authoritative negative stock');
select results_eq($$select count(*)from public.pos_reconciliation_cases where command_id=current_setting('test.command')::uuid and status='open'$$,$$select 2::bigint$$,'Payment and stock exceptions are visible');
select is((public.process_pos_command(current_setting('test.core_org')::uuid,current_setting('test.command')::uuid,1,current_setting('test.register_id')::uuid,(current_setting('test.bootstrap')::jsonb->>'sessionId')::uuid,now(),'offline',current_setting('test.bootstrap')::jsonb->>'leaseToken',current_setting('test.payload')::jsonb)->>'status'),'duplicate','Exact replay returns the stored result');
select results_eq($$select count(*)from public.sales_transactions where command_id=current_setting('test.command')::uuid$$,$$select 1::bigint$$,'Replay cannot duplicate a sale');
select throws_ok($$select public.process_pos_command(current_setting('test.core_org')::uuid,current_setting('test.command')::uuid,1,current_setting('test.register_id')::uuid,(current_setting('test.bootstrap')::jsonb->>'sessionId')::uuid,now(),'offline',current_setting('test.bootstrap')::jsonb->>'leaseToken',(current_setting('test.payload')::jsonb||'{"customerId":"94000000-0000-4000-8000-000000000099"}'::jsonb))$$,'P0001','Command identifier was reused with a different payload.','Altered replay is rejected');

select set_config('test.payment_case',(select id::text from public.pos_reconciliation_cases where command_id=current_setting('test.command')::uuid and case_type='payment_verification'),true);
select lives_ok($$select public.resolve_pos_reconciliation_case(current_setting('test.core_org')::uuid,current_setting('test.payment_case')::uuid,'Provider reference confirmed','verified')$$,'Manager can verify a pending payment');
select is((select payment.status from public.sales_payments payment join public.sales_transactions sale on sale.id=payment.sale_id where sale.command_id=current_setting('test.command')::uuid),'verified','Payment verification changes state');
select results_eq($$select count(*)from public.payment_verification_history$$,$$select 1::bigint$$,'Payment transition is recorded immutably');
reset role;
select throws_ok($$update public.payment_verification_history set reason='changed'$$,'P0001','Payment verification history is immutable.','Verification history cannot be rewritten');
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select set_config('test.close_command','94000000-0000-4000-8000-000000000030',true);
select set_config('test.close_payload',jsonb_build_object('type','register.close','branchId',current_setting('test.core_branch'),'inventoryLocationId',current_setting('test.core_location'),'actualCash',450)::text,true);
select is((public.process_pos_command(current_setting('test.core_org')::uuid,current_setting('test.close_command')::uuid,1,current_setting('test.register_id')::uuid,(current_setting('test.bootstrap')::jsonb->>'sessionId')::uuid,now(),'offline',current_setting('test.bootstrap')::jsonb->>'leaseToken',current_setting('test.close_payload')::jsonb)->>'status'),'applied','Register close is a durable command');
select is((select status from public.pos_register_sessions where id=(current_setting('test.bootstrap')::jsonb->>'sessionId')::uuid),'closed','Register session closes');
select results_eq($$select count(*)from public.pos_reconciliation_cases where register_session_id=(current_setting('test.bootstrap')::jsonb->>'sessionId')::uuid and case_type='register_variance'$$,$$select 1::bigint$$,'Cash variance opens a reconciliation case');
select is((public.pos_operations_dashboard(current_setting('test.core_org')::uuid)->>'criticalCases')::integer,1,'Operations dashboard reports critical exceptions');

select * from finish();
rollback;
