begin;
create extension if not exists pgtap with schema extensions;
select plan(20);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','91000000-0000-4000-8000-000000000001','authenticated','authenticated','catalog-owner@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('catalog-test','Catalog Test Legal','Catalog Test','corporation','retail','{"city":"Manila"}'::jsonb);
select set_config('test.catalog_org',(select id::text from public.organizations where slug='catalog-test'),true);
select set_config('test.catalog_branch',(select id::text from public.branches where organization_id=current_setting('test.catalog_org')::uuid and code='main'),true);

select results_eq($$select name,minimum_plan,status from public.module_definitions where key='product_catalog'$$,$$select 'Product Catalog'::text,'starter'::text,'published'::text$$,'Product Catalog is a published starter module');
select results_eq($$select count(*) from public.roles role join public.role_permissions rp on rp.role_id=role.id join public.permissions permission on permission.id=rp.permission_id where role.organization_id=current_setting('test.catalog_org')::uuid and role.key='owner' and permission.key like 'catalog.%'$$,$$select 4::bigint$$,'Owner receives every catalog permission');
select throws_ok($$select public.save_product_category(current_setting('test.catalog_org')::uuid,null,'Apparel','','active')$$,'42501','Permission denied.','Catalog mutations require the enabled module');
select lives_ok($$select public.set_business_module_state(current_setting('test.catalog_org')::uuid,'product_catalog',true,'{"default_unit":"piece","default_tax_rate":12}'::jsonb)$$,'Product Catalog can be enabled');
select set_config('test.category',public.save_product_category(current_setting('test.catalog_org')::uuid,null,'Apparel','Wearable products','active')::text,true);
select results_eq($$select name,status from public.product_categories where id=current_setting('test.category')::uuid$$,$$select 'Apparel'::text,'active'::text$$,'Category metadata is saved');
select set_config('test.brand',public.save_product_brand(current_setting('test.catalog_org')::uuid,null,'Negosyo Basics','','active')::text,true);
select results_eq($$select name from public.product_brands where id=current_setting('test.brand')::uuid$$,$$select 'Negosyo Basics'::text$$,'Brand metadata is saved');

select set_config('test.product',public.save_catalog_product(current_setting('test.catalog_org')::uuid,null,current_setting('test.catalog_branch')::uuid,'product','Cotton Shirt','Branch shirt',current_setting('test.category')::uuid,current_setting('test.brand')::uuid,'piece',599,250,'inclusive',12,'active',true,
 '[{"name":"Small / Blue","sku":"SHIRT-S-BLU","barcode":"480000000001","attributes":{"size":"S","color":"Blue"},"unit":"piece","sellingPrice":599,"costPrice":250,"status":"active"},{"name":"Large / Red","sku":"SHIRT-L-RED","barcode":"480000000002","attributes":{"size":"L","color":"Red"},"status":"active"}]'::jsonb,
 '[{"url":"https://example.test/shirt.jpg","altText":"Cotton Shirt","isPrimary":true}]'::jsonb)::text,true);
select results_eq($$select name,product_type,branch_id,has_variants,tax_type,tax_rate from public.products where id=current_setting('test.product')::uuid$$,$$select 'Cotton Shirt'::text,'product'::text,current_setting('test.catalog_branch')::uuid,true,'inclusive'::text,12::numeric$$,'Product stores Branch, pricing model, tax, and variant state');
select results_eq($$select sku,barcode,attributes->>'size' from public.product_variants where product_id=current_setting('test.product')::uuid order by sort_order$$,$$select 'SHIRT-S-BLU'::text,'480000000001'::text,'S'::text union all select 'SHIRT-L-RED'::text,'480000000002'::text,'L'::text$$,'Variants store ordered SKUs, barcodes, and attributes');
select results_eq($$select url,is_primary from public.product_images where product_id=current_setting('test.product')::uuid$$,$$select 'https://example.test/shirt.jpg'::text,true$$,'Product image metadata is stored');
select throws_ok($$insert into public.products(organization_id,product_type,name,default_unit,selling_price,cost_price,tax_type,tax_rate,created_by,updated_by) values(current_setting('test.catalog_org')::uuid,'product','Bypass','piece',1,1,'inclusive',12,'91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001')$$,'42501','permission denied for table products','Direct product writes are denied');
select throws_ok($$select public.save_catalog_product(current_setting('test.catalog_org')::uuid,null,null,'product','Duplicate','',null,null,'piece',10,5,'inclusive',12,'active',false,'[{"name":"Default","sku":"SHIRT-S-BLU","barcode":"","attributes":{},"status":"active"}]'::jsonb,'[]'::jsonb)$$,'23505','SKU, barcode, category, or brand already exists.','SKU uniqueness is enforced per Business');
select lives_ok($$select public.save_catalog_product(current_setting('test.catalog_org')::uuid,current_setting('test.product')::uuid,current_setting('test.catalog_branch')::uuid,'product','Cotton Shirt','Updated',current_setting('test.category')::uuid,current_setting('test.brand')::uuid,'piece',649,250,'inclusive',12,'active',false,'[{"name":"Default","sku":"SHIRT-DEFAULT","barcode":"480000000003","attributes":{},"status":"active"}]'::jsonb,'[]'::jsonb)$$,'Product editor can replace the variant set');
select results_eq($$select count(*) from public.product_variants where product_id=current_setting('test.product')::uuid$$,$$select 1::bigint$$,'Removed variants are deleted atomically');
select set_config('test.service',public.save_catalog_product(current_setting('test.catalog_org')::uuid,null,null,'service','Consultation','One hour',null,null,'piece',1000,0,'exempt',0,'active',false,'[{"name":"Default","sku":"SERVICE-CONSULT","barcode":"","attributes":{},"status":"active"}]'::jsonb,'[]'::jsonb)::text,true);
select results_eq($$select product_type,branch_id,tax_type from public.products where id=current_setting('test.service')::uuid$$,$$select 'service'::text,null::uuid,'exempt'::text$$,'Services and Business-wide availability are supported');
select throws_ok($$select public.save_catalog_product(current_setting('test.catalog_org')::uuid,null,null,'product','Bad Tax','',null,null,'piece',10,5,'exempt',12,'active',false,'[{"name":"Default","sku":"BAD-TAX","barcode":"","attributes":{},"status":"active"}]'::jsonb,'[]'::jsonb)$$,'22023','Invalid product.','Exempt products cannot carry a tax rate');
select results_eq($$select count(*) from public.products where organization_id is null$$,$$select 0::bigint$$,'Every product belongs to a Business');
select ok(exists(select 1 from pg_policies where tablename='products' and policyname='products_read'),'Products are protected by tenant and Branch-aware RLS');
select ok(exists(select 1 from pg_indexes where indexname='product_variants_barcode_unique'),'Barcode lookup has a Business-unique index');
select throws_ok($$select public.save_product_category(current_setting('test.catalog_org')::uuid,null,'apparel','','active')$$,'23505',null,'Category names are case-insensitively unique per Business');
select results_eq($$select product_id from public.product_variants where organization_id=current_setting('test.catalog_org')::uuid and barcode='480000000003'$$,$$select current_setting('test.product')::uuid$$,'Exact barcode search resolves the sellable product');

select * from finish();
rollback;
