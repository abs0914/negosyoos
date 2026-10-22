begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select results_eq(
  $$select key from public.plans order by tier_rank$$,
  $$values ('free_assessment'::text),('starter'::text),('pro'::text),('growth'::text),('multi_branch'::text)$$,
  'The public plan registry contains the five commercial plans in tier order'
);
select results_eq(
  $$select count(*) from public.usage_limits$$,
  $$select 15::bigint$$,
  'Every plan defines all three initial usage limits'
);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
 ('00000000-0000-0000-0000-000000000000','99900000-0000-4000-8000-000000000035','authenticated','authenticated','billing-owner@example.test','',now(),now(),now()),
 ('00000000-0000-0000-0000-000000000000','99900000-0000-4000-8000-000000000036','authenticated','authenticated','billing-outsider@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','99900000-0000-4000-8000-000000000035',true);
select set_config('request.jwt.claims','{"sub":"99900000-0000-4000-8000-000000000035","role":"authenticated"}',true);
select public.create_business('subscription-billing','Subscription Billing Inc','Subscription Billing','sole_proprietorship','retail','{"city":"Quezon City"}');
select set_config('test.billing_org',(select id::text from public.organizations where slug='subscription-billing'),true);

select is(
  public.get_subscription_dashboard(current_setting('test.billing_org')::uuid)->>'planKey',
  'free_assessment',
  'The first billing read lazily provisions a Free Assessment subscription'
);
select results_eq(
  $$select event_type from public.billing_events where organization_id=current_setting('test.billing_org')::uuid$$,
  $$select 'free_started'::text$$,
  'Free subscription provisioning produces a billing audit event'
);
select lives_ok(
  $$select public.assert_subscription_feature(current_setting('test.billing_org')::uuid,'assessment')$$,
  'Free Assessment includes the assessment entitlement'
);
select throws_ok(
  $$select public.assert_subscription_feature(current_setting('test.billing_org')::uuid,'ai_advisor')$$,
  '42501',
  'Subscription feature is unavailable.',
  'Unavailable product features are rejected by the server-side guard'
);
select throws_ok(
  $$select public.set_business_module_state(current_setting('test.billing_org')::uuid,'product_catalog',true,'{}')$$,
  'P0001',
  'Module requires the starter plan.',
  'A Free Assessment subscription cannot activate a paid operational module'
);
select is(
  (public.check_subscription_limit(current_setting('test.billing_org')::uuid,'max_branches',1)->>'allowed')::boolean,
  false,
  'The Free Assessment branch limit includes the business default branch'
);
select is(
  (public.check_subscription_limit(current_setting('test.billing_org')::uuid,'monthly_transactions',0)->>'limit')::bigint,
  0::bigint,
  'Free Assessment blocks operational transactions through a zero monthly limit'
);
select throws_ok(
  $$select public.check_subscription_limit(current_setting('test.billing_org')::uuid,'unknown_limit',0)$$,
  '22023',
  'Unknown usage limit.',
  'Unknown usage counters fail closed'
);

select lives_ok(
  $$select public.request_subscription_change(current_setting('test.billing_org')::uuid,'upgrade','pro','upgrade-request-0001')$$,
  'An owner can request an upgrade without activating it directly'
);
select results_eq(
  $$select plan_key,pending_plan_key,status from public.subscriptions where organization_id=current_setting('test.billing_org')::uuid$$,
  $$select 'free_assessment'::text,'pro'::text,'active'::text$$,
  'An upgrade remains pending until a verified provider event arrives'
);
select lives_ok(
  $$select public.request_subscription_change(current_setting('test.billing_org')::uuid,'upgrade','pro','upgrade-request-0001')$$,
  'Repeating a change request with the same idempotency key is safe'
);
select results_eq(
  $$select count(*) from public.billing_events where organization_id=current_setting('test.billing_org')::uuid and idempotency_key='upgrade-request-0001'$$,
  $$select 1::bigint$$,
  'A repeated change request produces one billing event'
);
select throws_ok(
  $$select public.request_subscription_change(current_setting('test.billing_org')::uuid,'downgrade','starter','invalid-change-0001')$$,
  '22023',
  'Invalid plan change.',
  'A downgrade is validated against the active plan, not a pending plan'
);
select ok(
  not has_function_privilege('authenticated','public.apply_subscription_billing_event(uuid,text,text,text,text,timestamptz,timestamptz,jsonb)','execute'),
  'Authenticated clients cannot apply payment-provider events'
);
select throws_ok(
  $$update public.subscriptions set plan_key='multi_branch' where organization_id=current_setting('test.billing_org')::uuid$$,
  '42501',
  'permission denied for table subscriptions',
  'Clients cannot bypass the lifecycle RPC by updating subscriptions directly'
);

reset role;
set local role service_role;
select lives_ok(
  $$select public.apply_subscription_billing_event(current_setting('test.billing_org')::uuid,'paymongo','paymongo-event-activated-0001','subscription_activated','pro',now(),now()+interval'1 month','{"verified":true}')$$,
  'A verified provider boundary can activate the requested plan'
);
reset role;
select set_config('test.activated_version',(select version::text from public.subscriptions where organization_id=current_setting('test.billing_org')::uuid),true);
set local role service_role;
select lives_ok(
  $$select public.apply_subscription_billing_event(current_setting('test.billing_org')::uuid,'paymongo','paymongo-event-activated-0001','subscription_activated','multi_branch',now(),now()+interval'1 year','{"verified":true}')$$,
  'Replaying a provider event is idempotent'
);
reset role;
select results_eq(
  $$select plan_key,status,pending_plan_key is null,version from public.subscriptions where organization_id=current_setting('test.billing_org')::uuid$$,
  $$select 'pro'::text,'active'::text,true,current_setting('test.activated_version')::bigint$$,
  'A duplicate provider event cannot change the plan or increment its version'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','99900000-0000-4000-8000-000000000035',true);
select set_config('request.jwt.claims','{"sub":"99900000-0000-4000-8000-000000000035","role":"authenticated"}',true);
select lives_ok(
  $$select public.request_subscription_change(current_setting('test.billing_org')::uuid,'downgrade','starter','downgrade-request-0001')$$,
  'An active Pro subscription can request a Starter downgrade'
);
select lives_ok(
  $$select public.request_subscription_change(current_setting('test.billing_org')::uuid,'cancel','pro','cancel-request-0001')$$,
  'Cancellation can be scheduled at period end'
);
select is(
  (select cancel_at_period_end from public.subscriptions where organization_id=current_setting('test.billing_org')::uuid),
  true,
  'Cancellation requests preserve service through the current paid period'
);
select lives_ok(
  $$select public.request_subscription_change(current_setting('test.billing_org')::uuid,'renew','pro','renew-request-0001')$$,
  'A renewal request can reverse a scheduled cancellation'
);
select is(
  (select cancel_at_period_end from public.subscriptions where organization_id=current_setting('test.billing_org')::uuid),
  false,
  'Renewal clears the period-end cancellation flag'
);

reset role;
set local role service_role;
select lives_ok(
  $$select public.apply_subscription_billing_event(current_setting('test.billing_org')::uuid,'paymongo','paymongo-event-failed-0001','payment_failed','pro',now(),now()+interval'1 month','{"verified":true}')$$,
  'A verified payment failure starts the plan grace period'
);

reset role;
update public.subscriptions
set current_period_start=now()-interval'1 month',current_period_end=now()-interval'2 days',grace_period_end=now()-interval'1 day'
where organization_id=current_setting('test.billing_org')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','99900000-0000-4000-8000-000000000035',true);
select set_config('request.jwt.claims','{"sub":"99900000-0000-4000-8000-000000000035","role":"authenticated"}',true);
select is(
  public.get_subscription_dashboard(current_setting('test.billing_org')::uuid)->>'status',
  'expired',
  'Reading an elapsed grace period transitions the subscription to expired'
);
select throws_ok(
  $$select public.assert_subscription_feature(current_setting('test.billing_org')::uuid,'ai_advisor')$$,
  '42501',
  'Subscription feature is unavailable.',
  'Expired subscriptions fail the feature entitlement check'
);
select results_eq(
  $$select count(*) from public.billing_events where organization_id=current_setting('test.billing_org')::uuid and event_type='expired'$$,
  $$select 1::bigint$$,
  'Grace-period expiration is written to immutable billing history'
);

select set_config('request.jwt.claim.sub','99900000-0000-4000-8000-000000000036',true);
select set_config('request.jwt.claims','{"sub":"99900000-0000-4000-8000-000000000036","role":"authenticated"}',true);
select throws_ok(
  $$select public.get_subscription_dashboard(current_setting('test.billing_org')::uuid)$$,
  '42501',
  'Permission denied.',
  'A user outside the tenant cannot read the subscription dashboard'
);
select results_eq(
  $$select count(*) from public.billing_events where organization_id=current_setting('test.billing_org')::uuid$$,
  $$select 0::bigint$$,
  'Billing-event RLS hides another tenant history'
);

select * from finish();
rollback;
