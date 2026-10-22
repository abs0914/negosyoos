begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','ca000000-0000-4000-8000-000000000001','authenticated','authenticated','coach-owner@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('coach-shop','Coach Shop','Coach Shop','sole_proprietorship','retail','{}'::jsonb);
select set_config('test.coach_org',(select id::text from public.organizations where slug='coach-shop'),true);

select lives_ok(
  $$select public.save_negosyo_coach_progress(current_setting('test.coach_org')::uuid,'retail_activation','add_product',false,false)$$,
  'A Business member can save personal coach progress'
);
select is(
  (select last_task_key from public.negosyo_coach_progress where organization_id=current_setting('test.coach_org')::uuid),
  'add_product'::text,
  'Progress is stored for the signed-in user'
);
select lives_ok(
  $$select public.save_negosyo_coach_progress(current_setting('test.coach_org')::uuid,'retail_activation','add_product',true,false)$$,
  'The coach can be dismissed without deleting progress'
);
select ok(
  (select dismissed_at is not null from public.negosyo_coach_progress where organization_id=current_setting('test.coach_org')::uuid),
  'Dismissal is persisted'
);
select throws_ok(
  $$insert into public.negosyo_coach_progress(organization_id,user_id,playbook_key)values(current_setting('test.coach_org')::uuid,auth.uid(),'bypass')$$,
  '42501','permission denied for table negosyo_coach_progress','Clients cannot bypass the progress RPC'
);

select * from finish();
rollback;
