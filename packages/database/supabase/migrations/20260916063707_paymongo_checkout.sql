-- Server-created, immutable payment quotes. Browser roles can only read their business's rows.
create table public.payment_checkouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_key text not null references public.plans(key) check (plan_key <> 'free_assessment'),
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  branch_limit integer not null check (branch_limit between 1 and 100),
  amount_centavos integer not null check (amount_centavos >= 2000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  livemode boolean not null,
  status text not null default 'creating' check (status in ('creating','open','paid','void')),
  provider_session_id text unique,
  provider_payment_id text unique,
  checkout_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz
);
create unique index payment_checkouts_one_pending on public.payment_checkouts(organization_id)
  where status in ('creating','open');
create index payment_checkouts_business_history on public.payment_checkouts(organization_id,created_at desc);
alter table public.payment_checkouts enable row level security;
revoke all on public.payment_checkouts from public,anon,authenticated;
grant select on public.payment_checkouts to authenticated;
grant select,insert,update on public.payment_checkouts to service_role;
create policy payment_checkouts_read on public.payment_checkouts for select to authenticated
  using (private.can_business_permission(organization_id,'subscription.read',null));

update public.usage_limits set limit_value=3 where plan_key='multi_branch' and usage_key='max_branches';

-- No auth.uid() here: this is a service-role-only webhook boundary, never a browser RPC.
create function public.settle_paymongo_checkout(
  requested_checkout_id uuid, requested_session_id text, requested_payment_id text,
  requested_amount integer, requested_currency text, requested_livemode boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  checkout public.payment_checkouts%rowtype;
  subscription public.subscriptions%rowtype;
  event_id uuid;
  paid_period_start timestamptz;
  paid_period_end timestamptz;
begin
  select * into checkout from public.payment_checkouts where id=requested_checkout_id for update;
  if not found then raise exception 'Unknown checkout.' using errcode='22023'; end if;
  if requested_amount is distinct from checkout.amount_centavos
    or requested_currency is distinct from checkout.currency
    or requested_livemode is distinct from checkout.livemode
    or requested_session_id is null or requested_session_id !~ '^cs_[A-Za-z0-9]+$'
    or requested_payment_id is null or requested_payment_id !~ '^pay_[A-Za-z0-9]+$'
    or (checkout.provider_session_id is not null and checkout.provider_session_id<>requested_session_id)
  then raise exception 'Payment does not match checkout.' using errcode='22023'; end if;
  if checkout.status='paid' then
    if checkout.provider_payment_id is distinct from requested_payment_id then
      raise exception 'Checkout already paid by another payment.' using errcode='22023';
    end if;
    return checkout.id;
  end if;
  if checkout.status='void' then raise exception 'Checkout is void.' using errcode='22023'; end if;
  select * into subscription from public.subscriptions where organization_id=checkout.organization_id for update;
  if not found then raise exception 'Subscription not found.' using errcode='22023'; end if;
  -- Same-plan, same-capacity renewals retain all prepaid time. Changes begin immediately.
  paid_period_start := clock_timestamp();
  if subscription.provider='paymongo' and subscription.status='active'
    and subscription.plan_key=checkout.plan_key
    and coalesce((subscription.entitlements->>'paymongoBranchLimit')::integer,checkout.branch_limit)=checkout.branch_limit
    and subscription.current_period_end>paid_period_start then
    paid_period_start := subscription.current_period_end;
  end if;
  paid_period_end := paid_period_start + case checkout.billing_interval when 'annual' then interval '1 year' else interval '1 month' end;
  event_id := public.apply_subscription_billing_event(
    checkout.organization_id,'paymongo',requested_payment_id,
    case when subscription.plan_key=checkout.plan_key then 'renewed' else 'plan_changed' end,
    checkout.plan_key,paid_period_start,paid_period_end,
    jsonb_build_object('checkoutId',checkout.id,'sessionId',requested_session_id,
      'amountCentavos',checkout.amount_centavos,'currency',checkout.currency,
      'billingInterval',checkout.billing_interval,'branchLimit',checkout.branch_limit,'livemode',checkout.livemode)
  );
  update public.subscriptions set
    entitlements=(entitlements-'trial'-'fullMvpAccess') || jsonb_build_object(
      'paymongoBranchLimit',checkout.branch_limit,'billingInterval',checkout.billing_interval),
    canceled_at=null
    where id=subscription.id;
  update public.payment_checkouts set status='paid',provider_session_id=requested_session_id,
    provider_payment_id=requested_payment_id,paid_at=clock_timestamp(),
    period_start=paid_period_start,period_end=paid_period_end
    where id=checkout.id;
  return checkout.id;
end $$;
revoke all on function public.settle_paymongo_checkout(uuid,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.settle_paymongo_checkout(uuid,text,text,integer,text,boolean) to service_role;

-- Serialize branch creation against settlement and enforce purchased capacity even for direct API writes.
create function private.enforce_paid_branch_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare subscription public.subscriptions%rowtype; branch_count integer; capacity integer; pending_capacity integer;
begin
  if TG_OP='UPDATE' and new.organization_id=old.organization_id then return new; end if;
  select * into subscription from public.subscriptions where organization_id=new.organization_id for update;
  select branch_limit into pending_capacity from public.payment_checkouts
    where organization_id=new.organization_id and status in ('creating','open');
  select count(*) into branch_count from public.branches where organization_id=new.organization_id;
  if pending_capacity is not null and branch_count>=pending_capacity then
    raise exception 'Complete or void the pending checkout before adding more branches.' using errcode='22023';
  end if;
  if subscription.provider='paymongo' then
    if subscription.status<>'active' or subscription.current_period_end<=clock_timestamp() then
      raise exception 'Renew your subscription before adding a branch.' using errcode='22023';
    end if;
    capacity := (subscription.entitlements->>'paymongoBranchLimit')::integer;
    select count(*) into branch_count from public.branches where organization_id=new.organization_id;
    if capacity is null or branch_count>=capacity then
      raise exception 'Your subscription branch capacity has been reached.' using errcode='22023';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.enforce_paid_branch_capacity() from public,anon,authenticated;
create trigger enforce_paid_branch_capacity before insert or update of organization_id on public.branches
  for each row execute function private.enforce_paid_branch_capacity();

create function private.validate_payment_checkout() returns trigger
language plpgsql security definer set search_path='' as $$
declare branch_count integer;
begin
  perform 1 from public.subscriptions where organization_id=new.organization_id for update;
  if not found then raise exception 'Subscription not found.' using errcode='22023'; end if;
  select count(*) into branch_count from public.branches where organization_id=new.organization_id;
  if branch_count>new.branch_limit then
    raise exception 'The selected plan does not cover the current branches.' using errcode='22023';
  end if;
  return new;
end $$;
revoke all on function private.validate_payment_checkout() from public,anon,authenticated;
create trigger validate_payment_checkout before insert on public.payment_checkouts
  for each row execute function private.validate_payment_checkout();

-- Preserve existing providers' lifecycle rules; prepaid PayMongo access expires at period end.
create or replace function private.refresh_subscription_state(requested_organization_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare subscription public.subscriptions%rowtype;
begin
  select * into subscription from public.subscriptions where organization_id=requested_organization_id for update;
  if not found then return; end if;
  if (subscription.provider='paymongo' and subscription.status='active' and subscription.current_period_end<=clock_timestamp())
    or (subscription.status='grace_period' and subscription.grace_period_end<=clock_timestamp()) then
    update public.subscriptions set status=case when cancel_at_period_end then 'canceled' else 'expired' end,
      expired_at=clock_timestamp(),version=version+1 where id=subscription.id;
    insert into public.billing_events(organization_id,subscription_id,event_type,idempotency_key,from_plan_key,to_plan_key,details)
    values(requested_organization_id,subscription.id,'expired','expired:'||subscription.id||':'||subscription.version,
      subscription.plan_key,subscription.plan_key,jsonb_build_object('periodEnd',subscription.current_period_end));
  end if;
end $$;

create or replace function private.subscription_feature_allowed(requested_organization_id uuid,requested_feature_key text)returns boolean language plpgsql volatile security definer set search_path='' as $$declare subscription public.subscriptions%rowtype;begin perform private.refresh_subscription_state(requested_organization_id);if auth.uid()is null or not private.can_business_permission(requested_organization_id,'organization.read',null)then return false;end if;select*into subscription from public.subscriptions where organization_id=requested_organization_id;if subscription.organization_id is null or subscription.status not in('trialing','active','grace_period')or(subscription.status='grace_period'and subscription.grace_period_end<=clock_timestamp())then return false;end if;if subscription.status='trialing'and subscription.entitlements->>'fullMvpAccess'='true'then return true;end if;return exists(select 1 from public.subscription_features feature where feature.plan_key=subscription.plan_key and feature.feature_key=requested_feature_key and feature.is_enabled);end$$;

create or replace function public.check_subscription_limit(requested_organization_id uuid,requested_usage_key text,requested_delta bigint default 0)returns jsonb language plpgsql security definer set search_path='' as $$declare subscription public.subscriptions%rowtype;limit_row public.usage_limits%rowtype;used bigint:=0;begin if auth.uid()is null or not private.can_business_permission(requested_organization_id,'organization.read',null)or requested_delta<0 then raise exception'Permission denied.'using errcode='42501';end if;perform private.ensure_free_subscription(requested_organization_id);perform private.refresh_subscription_state(requested_organization_id);select*into subscription from public.subscriptions where organization_id=requested_organization_id;select*into limit_row from public.usage_limits where plan_key=subscription.plan_key and usage_key=requested_usage_key;if limit_row.plan_key is null then raise exception'Unknown usage limit.'using errcode='22023';end if;if requested_usage_key='max_branches' and subscription.provider='paymongo' then limit_row.limit_value:=(subscription.entitlements->>'paymongoBranchLimit')::bigint;end if;if requested_usage_key='max_branches'then select count(*)into used from public.branches where organization_id=requested_organization_id;elsif requested_usage_key='max_active_users'then select count(*)into used from public.organization_memberships where organization_id=requested_organization_id and status='active';elsif requested_usage_key='monthly_transactions'then select count(*)into used from public.sales_transactions where organization_id=requested_organization_id and created_at>=date_trunc('month',clock_timestamp()at time zone'Asia/Manila')at time zone'Asia/Manila'and status not in('suspended','voided');end if;return jsonb_build_object('usageKey',requested_usage_key,'used',used,'limit',limit_row.limit_value,'requestedDelta',requested_delta,'allowed',subscription.status in('trialing','active','grace_period')and(limit_row.limit_value is null or used+requested_delta<=limit_row.limit_value));end$$;

create or replace function public.get_subscription_dashboard(requested_organization_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$declare subscription public.subscriptions%rowtype;features jsonb;limits jsonb;begin if auth.uid()is null or not private.can_business_permission(requested_organization_id,'subscription.read',null)then raise exception'Permission denied.'using errcode='42501';end if;perform private.ensure_free_subscription(requested_organization_id);perform private.refresh_subscription_state(requested_organization_id);select*into subscription from public.subscriptions where organization_id=requested_organization_id;select coalesce(jsonb_agg(feature.feature_key order by feature.feature_key),'[]')into features from public.subscription_features feature where feature.plan_key=subscription.plan_key and feature.is_enabled;select coalesce(jsonb_agg(jsonb_build_object('key',limit_row.usage_key,'limit',case when limit_row.usage_key='max_branches' and subscription.provider='paymongo' then (subscription.entitlements->>'paymongoBranchLimit')::bigint else limit_row.limit_value end,'period',limit_row.period)order by limit_row.usage_key),'[]')into limits from public.usage_limits limit_row where limit_row.plan_key=subscription.plan_key;return jsonb_build_object('id',subscription.id,'planKey',subscription.plan_key,'status',subscription.status,'provider',subscription.provider,'currentPeriodStart',subscription.current_period_start,'currentPeriodEnd',subscription.current_period_end,'gracePeriodEnd',subscription.grace_period_end,'pendingPlanKey',subscription.pending_plan_key,'cancelAtPeriodEnd',subscription.cancel_at_period_end,'features',features,'limits',limits);end$$;
