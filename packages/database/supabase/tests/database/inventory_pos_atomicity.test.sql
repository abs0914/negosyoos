begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','93000000-0000-4000-8000-000000000001','authenticated','authenticated','pos-owner@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('pos-ledger-test','POS Ledger Test','POS Ledger Test','sole_proprietorship','retail','{"city":"Quezon City"}'::jsonb);
select set_config('test.pos_org',(select id::text from public.organizations where slug='pos-ledger-test'),true);
select set_config('test.pos_branch',(select id::text from public.branches where organization_id=current_setting('test.pos_org')::uuid and code='main'),true);
select public.set_business_module_state(current_setting('test.pos_org')::uuid,'product_catalog',true,'{}');
select public.set_business_module_state(current_setting('test.pos_org')::uuid,'inventory',true,'{"allow_negative_stock":false,"low_stock_threshold":5}');
select set_config('test.pos_location',(select id::text from public.inventory_locations where organization_id=current_setting('test.pos_org')::uuid and branch_id=current_setting('test.pos_branch')::uuid),true);
select public.set_business_module_state(current_setting('test.pos_org')::uuid,'sales',true,'{}');
select public.set_business_module_state(current_setting('test.pos_org')::uuid,'pos',true,'{}');
select set_config('test.pos_product',public.save_catalog_product(current_setting('test.pos_org')::uuid,null,null,'product','Sari-sari Pack','',null,null,'pack',120,70,'inclusive',12,'active',false,'[{"name":"Default","sku":"PACK-001","barcode":"4801234567890","attributes":{},"status":"active"}]','[]')::text,true);
select set_config('test.pos_variant',(select id::text from public.product_variants where product_id=current_setting('test.pos_product')::uuid),true);
select set_config('test.pos_item',public.configure_inventory_item(current_setting('test.pos_org')::uuid,null,current_setting('test.pos_variant')::uuid,5,10,true)::text,true);

select lives_ok($$select public.record_stock_movement(current_setting('test.pos_org')::uuid,current_setting('test.pos_item')::uuid,current_setting('test.pos_location')::uuid,'opening_balance',20,70,'Opening','opening-test-001')$$,'Opening stock posts through the ledger');
select results_eq($$select quantity,average_unit_cost from public.stock_balances where inventory_item_id=current_setting('test.pos_item')::uuid and location_id=current_setting('test.pos_location')::uuid$$,$$select 20::numeric,70::numeric$$,'Balance projection is derived from the opening movement');
select throws_ok($$update public.stock_balances set quantity=999 where inventory_item_id=current_setting('test.pos_item')::uuid$$,'42501','permission denied for table stock_balances','Clients cannot overwrite stock balances');
select throws_ok($$update public.stock_movements set quantity_delta=999 where inventory_item_id=current_setting('test.pos_item')::uuid$$,'42501','permission denied for table stock_movements','Stock movement history is immutable to clients');
select lives_ok($$select public.record_stock_movement(current_setting('test.pos_org')::uuid,current_setting('test.pos_item')::uuid,current_setting('test.pos_location')::uuid,'purchase',5,80,'Restock','purchase-test-001')$$,'A purchase safely materializes the balance');
select results_eq($$select quantity,average_unit_cost from public.stock_balances where inventory_item_id=current_setting('test.pos_item')::uuid$$,$$select 25::numeric,72::numeric$$,'Weighted average valuation is maintained transactionally');
select lives_ok($$select public.record_stock_movement(current_setting('test.pos_org')::uuid,current_setting('test.pos_item')::uuid,current_setting('test.pos_location')::uuid,'purchase',5,80,'Replay','purchase-test-001')$$,'Movement idempotency accepts a replay');
select results_eq($$select count(*) from public.stock_movements where idempotency_key='purchase-test-001'$$,$$select 1::bigint$$,'Movement replay cannot duplicate stock');

select set_config('test.pos_customer',public.save_sales_customer(current_setting('test.pos_org')::uuid,null,'Maria Santos','09171234567','maria@example.test')::text,true);
select set_config('test.pos_sale',public.save_pos_transaction(current_setting('test.pos_org')::uuid,null,current_setting('test.pos_branch')::uuid,current_setting('test.pos_location')::uuid,current_setting('test.pos_customer')::uuid,'completed','93000000-0000-4000-8000-000000000101',now(),('[{"productVariantId":"'||current_setting('test.pos_variant')||'","quantity":2,"discountAmount":10}]')::jsonb,'[{"method":"cash","amount":250,"reference":""}]')::text,true);
select results_eq($$select status,subtotal,discount_total,total,amount_paid,change_amount,currency from public.sales_transactions where id=current_setting('test.pos_sale')::uuid$$,$$select 'completed'::text,240::numeric,10::numeric,230::numeric,250::numeric,20::numeric,'PHP'::text$$,'Completed sale records authoritative totals and cash payment');
select results_eq($$select quantity from public.stock_balances where inventory_item_id=current_setting('test.pos_item')::uuid$$,$$select 23::numeric$$,'Sale atomically reduces stock via an immutable movement');
select results_eq($$select count(*) from public.sales_payments where sale_id=current_setting('test.pos_sale')::uuid$$,$$select 1::bigint$$,'Sale payment commits with the sale');
select results_eq($$select transaction_count,total_spend from public.sales_customers where id=current_setting('test.pos_customer')::uuid$$,$$select 1,230::numeric$$,'Customer activity commits with the sale');
select results_eq($$select event from public.sales_audit_events where sale_id=current_setting('test.pos_sale')::uuid$$,$$select 'completed'::text$$,'Completed sale emits an audit event');
select results_eq($$select public.save_pos_transaction(current_setting('test.pos_org')::uuid,null,current_setting('test.pos_branch')::uuid,current_setting('test.pos_location')::uuid,current_setting('test.pos_customer')::uuid,'completed','93000000-0000-4000-8000-000000000101',now(),('[{"productVariantId":"'||current_setting('test.pos_variant')||'","quantity":2,"discountAmount":10}]')::jsonb,'[{"method":"cash","amount":250,"reference":""}]')$$,$$select current_setting('test.pos_sale')::uuid$$,'Offline client transaction ID makes replay idempotent');
select results_eq($$select quantity from public.stock_balances where inventory_item_id=current_setting('test.pos_item')::uuid$$,$$select 23::numeric$$,'Sale replay does not duplicate stock movement');

select throws_ok($$select public.save_pos_transaction(current_setting('test.pos_org')::uuid,null,current_setting('test.pos_branch')::uuid,current_setting('test.pos_location')::uuid,null,'completed','93000000-0000-4000-8000-000000000102',now(),('[{"productVariantId":"'||current_setting('test.pos_variant')||'","quantity":1,"discountAmount":0}]')::jsonb,'[{"method":"cash","amount":1,"reference":""}]')$$,'P0001','Payment is insufficient.','Insufficient payment aborts the atomic operation');
select results_eq($$select count(*) from public.sales_transactions where client_transaction_id='93000000-0000-4000-8000-000000000102'$$,$$select 0::bigint$$,'Failed sale leaves no partial transaction');
select results_eq($$select quantity from public.stock_balances where inventory_item_id=current_setting('test.pos_item')::uuid$$,$$select 23::numeric$$,'Failed sale leaves stock unchanged');

select set_config('test.pos_return',public.return_sale(current_setting('test.pos_org')::uuid,current_setting('test.pos_sale')::uuid,'Customer changed mind',('[{"saleLineId":"'||(select id from public.sales_lines where sale_id=current_setting('test.pos_sale')::uuid)||'","quantity":1}]')::jsonb,'[{"method":"cash","amount":115,"reference":""}]','93000000-0000-4000-8000-000000000201')::text,true);
select results_eq($$select quantity from public.stock_balances where inventory_item_id=current_setting('test.pos_item')::uuid$$,$$select 24::numeric$$,'Return atomically restores stock');
select results_eq($$select status from public.sales_transactions where id=current_setting('test.pos_sale')::uuid$$,$$select 'partially_returned'::text$$,'Partial return updates sale lifecycle state');

select * from finish();
rollback;
