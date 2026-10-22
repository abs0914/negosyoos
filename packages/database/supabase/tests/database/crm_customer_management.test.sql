begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','95000000-0000-4000-8000-000000000001','authenticated','authenticated','crm-owner@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('crm-test','CRM Test Legal','CRM Test','sole_proprietorship','retail','{"city":"Manila"}'::jsonb);
select set_config('test.crm_org',(select id::text from public.organizations where slug='crm-test'),true);
select set_config('test.crm_branch',(select id::text from public.branches where organization_id=current_setting('test.crm_org')::uuid and code='main'),true);

select is(public.can_business_permission(current_setting('test.crm_org')::uuid,'crm.manage'),true,'Owner receives CRM management permission');
select throws_ok($$select public.save_crm_customer(current_setting('test.crm_org')::uuid,null,current_setting('test.crm_branch')::uuid,'Maria Santos','0917 123 4567','maria@example.test','{}',null,null,'retail','{}',null)$$,'42501','Permission denied.','CRM writes require the enabled module');
reset role;
insert into public.subscriptions(organization_id,provider,plan_key,status)values(current_setting('test.crm_org')::uuid,'internal','growth','trialing');
set local role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.set_business_module_state(current_setting('test.crm_org')::uuid,'crm',true,'{}')$$,'CRM module can be enabled');
select set_config('test.crm_customer',public.save_crm_customer(current_setting('test.crm_org')::uuid,null,current_setting('test.crm_branch')::uuid,'Maria Santos','0917 123 4567','MARIA@EXAMPLE.TEST','{"street":"123 Mabini","barangay":"San Antonio","cityMunicipality":"Makati","province":"Metro Manila","postalCode":"1203"}',date'1990-05-12','Santos Trading','wholesale',array['Suki','Wholesale','suki'],'Prefers Viber')::text,true);
select results_eq($$select phone,email,customer_type,tags from public.sales_customers where id=current_setting('test.crm_customer')::uuid$$,$$select '+639171234567'::text,'maria@example.test'::text,'wholesale'::text,array['suki','wholesale']::text[]$$,'Customer normalizes Philippine mobile, email, type, and tags');
select results_eq($$select address->>'barangay',company,birthdate,branch_id from public.sales_customers where id=current_setting('test.crm_customer')::uuid$$,$$select 'San Antonio'::text,'Santos Trading'::text,date'1990-05-12',current_setting('test.crm_branch')::uuid$$,'Customer profile stores Philippine address and business details');
select throws_ok($$select public.save_crm_customer(current_setting('test.crm_org')::uuid,null,current_setting('test.crm_branch')::uuid,'Duplicate','+63 917 123 4567','','{}',null,null,'retail','{}',null)$$,'23505','A customer with this mobile number already exists.','Mobile is unique within the Business');
select throws_ok($$select public.save_crm_customer(current_setting('test.crm_org')::uuid,null,current_setting('test.crm_branch')::uuid,'Bad Mobile','555-1234','','{}',null,null,'retail','{}',null)$$,'22023','Enter a valid Philippine mobile number such as 0917 123 4567.','Non-Philippine mobile formats are rejected');
select results_eq($$select count(*) from public.customer_segments where organization_id=current_setting('test.crm_org')::uuid$$,$$select 3::bigint$$,'First customer installs useful default segments');
select lives_ok($$select public.save_customer_segment(current_setting('test.crm_org')::uuid,null,'loyal_suki','Loyal Suki','Frequent visitors','[{"metric":"visit_count","operator":"greater_than","value":5}]',true)$$,'Declarative customer segment can be saved');
select throws_ok($$select public.save_customer_segment(current_setting('test.crm_org')::uuid,null,'unsafe','Unsafe','Executable rule','[{"metric":"sql","operator":"execute","value":"drop table"}]',true)$$,'22023','Invalid customer segment.','Segments reject executable or unknown rules');
select lives_ok($$select public.add_customer_note(current_setting('test.crm_org')::uuid,current_setting('test.crm_customer')::uuid,'Asked about wholesale delivery terms.')$$,'Customer interaction note can be added');
select results_eq($$select note from public.customer_notes where customer_id=current_setting('test.crm_customer')::uuid$$,$$select 'Asked about wholesale delivery terms.'::text$$,'Customer notes are available on the profile');
select lives_ok($$select public.record_customer_loyalty(current_setting('test.crm_org')::uuid,current_setting('test.crm_customer')::uuid,'earn',25,'August purchase','manual',null)$$,'Loyalty earning is recorded');
select lives_ok($$select public.record_customer_loyalty(current_setting('test.crm_org')::uuid,current_setting('test.crm_customer')::uuid,'redeem',-10,'Reward redemption','manual',null)$$,'Loyalty redemption uses a negative movement');
select results_eq($$select sum(points_delta) from public.customer_loyalty_activity where customer_id=current_setting('test.crm_customer')::uuid$$,$$select 15::bigint$$,'Loyalty balance derives from immutable activities');
select throws_ok($$insert into public.customer_notes(organization_id,customer_id,note,created_by)values(current_setting('test.crm_org')::uuid,current_setting('test.crm_customer')::uuid,'Bypass',auth.uid())$$,'42501','permission denied for table customer_notes','Clients cannot bypass CRM note functions');

select public.set_business_module_state(current_setting('test.crm_org')::uuid,'product_catalog',true,'{}');
select public.set_business_module_state(current_setting('test.crm_org')::uuid,'inventory',true,'{"allow_negative_stock":false}');
select set_config('test.crm_location',(select id::text from public.inventory_locations where organization_id=current_setting('test.crm_org')::uuid and branch_id=current_setting('test.crm_branch')::uuid),true);
select public.set_business_module_state(current_setting('test.crm_org')::uuid,'sales',true,'{}');
select public.set_business_module_state(current_setting('test.crm_org')::uuid,'pos',true,'{}');
select set_config('test.crm_product',public.save_catalog_product(current_setting('test.crm_org')::uuid,null,null,'product','CRM Test Item','',null,null,'piece',100,60,'inclusive',12,'active',false,'[{"name":"Default","sku":"CRM-001","barcode":"4800000000001","attributes":{},"status":"active"}]','[]')::text,true);
select set_config('test.crm_variant',(select id::text from public.product_variants where product_id=current_setting('test.crm_product')::uuid),true);
select set_config('test.crm_item',public.configure_inventory_item(current_setting('test.crm_org')::uuid,null,current_setting('test.crm_variant')::uuid,5,10,true)::text,true);
select public.record_stock_movement(current_setting('test.crm_org')::uuid,current_setting('test.crm_item')::uuid,current_setting('test.crm_location')::uuid,'opening_balance',10,60,'Opening','crm-opening-001');
select public.save_pos_transaction(current_setting('test.crm_org')::uuid,null,current_setting('test.crm_branch')::uuid,current_setting('test.crm_location')::uuid,current_setting('test.crm_customer')::uuid,'completed','95000000-0000-4000-8000-000000000101',now(),('[{"productVariantId":"'||current_setting('test.crm_variant')||'","quantity":2,"discountAmount":0}]')::jsonb,'[{"method":"cash","amount":200,"reference":""}]');
select results_eq($$select transaction_count,total_spend,visit_count,last_transaction_at is not null from public.sales_customers where id=current_setting('test.crm_customer')::uuid$$,$$select 1,200::numeric,1,true$$,'Completed POS sale updates lifetime sales, transaction, visit, and last purchase metrics');
select results_eq($$select count(*) from public.sales_transactions where customer_id=current_setting('test.crm_customer')::uuid and status='completed'$$,$$select 1::bigint$$,'CRM purchase history is backed by completed POS transactions');

select * from finish();
rollback;
