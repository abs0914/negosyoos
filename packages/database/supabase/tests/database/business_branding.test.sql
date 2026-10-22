begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','99000000-0000-4000-8000-000000000001','authenticated','authenticated','branding-owner@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"99000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('branding-test','Branding Test Legal','Branding Test','sole_proprietorship','retail','{"city":"Manila"}');
select set_config('test.branding_org',(select id::text from public.organizations where slug='branding-test'),true);

select results_eq(
  $$select primary_color,secondary_color,accent_color from public.business_settings where organization_id=current_setting('test.branding_org')::uuid$$,
  $$select '#043f8d'::text,'#df1a2c'::text,'#f9b405'::text$$,
  'New businesses receive the negosyoOS brand palette'
);
select lives_ok(
  $$update public.business_settings set primary_color='#2155aa',secondary_color='#a3212b',accent_color='#f4c242' where organization_id=current_setting('test.branding_org')::uuid$$,
  'An authorized owner can personalize workspace colors'
);
select throws_ok(
  $$update public.business_settings set primary_color='blue' where organization_id=current_setting('test.branding_org')::uuid$$,
  '23514',
  'new row for relation "business_settings" violates check constraint "business_settings_primary_color_hex"',
  'Theme colors require six-digit hex values'
);

set local role postgres;
select results_eq($$select file_size_limit from storage.buckets where id='organization-assets'$$,$$select 5242880::bigint$$,'Business assets are limited to 5 MB');
select results_eq($$select allowed_mime_types from storage.buckets where id='organization-assets'$$,$$select array['image/png','image/jpeg','image/webp']::text[]$$,'Business assets accept supported image formats only');
select ok(exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='organization_assets_insert' and with_check like '%settings.manage%'),'Logo uploads require settings management permission');
select ok(exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='organization_assets_delete' and qual like '%settings.manage%'),'Logo removal requires settings management permission');

select * from finish();
rollback;
