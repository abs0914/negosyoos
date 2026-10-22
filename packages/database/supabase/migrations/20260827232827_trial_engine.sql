-- Module 30: a calm, measurable 45-day Business OS trial.
create table public.business_trials(
 organization_id uuid primary key references public.organizations(id)on delete cascade,
 installation_id uuid not null unique,
 trial_start_date timestamptz not null,
 trial_end_date timestamptz not null,
 trial_status text not null default'active'check(trial_status in('not_started','active','expiring','expired','converted')),
 activated_by uuid not null references auth.users(id),converted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(installation_id,organization_id)references public.business_os_installations(id,organization_id)on delete restrict,
 check(trial_end_date=trial_start_date+interval'45 days'),
 check((trial_status='converted')=(converted_at is not null))
);
create table public.business_trial_milestones(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.business_trials(organization_id)on delete cascade,
 milestone_key text not null check(milestone_key in('day_1_os_created','day_7_setup','day_15_operational','day_30_insights','day_40_value_report','day_45_conversion')),
 due_day integer not null check(due_day in(1,7,15,30,40,45)),status text not null default'pending'check(status in('pending','achieved')),
 achieved_at timestamptz,evidence jsonb not null default'{}'check(jsonb_typeof(evidence)='object'),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,milestone_key),check((status='achieved')=(achieved_at is not null))
);
create table public.business_trial_adoption_events(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.business_trials(organization_id)on delete cascade,
 event_type text not null check(event_type in('report_viewed','trial_value_report_viewed')),
 resource_key text not null check(char_length(btrim(resource_key))between 1 and 180),idempotency_key text not null check(char_length(btrim(idempotency_key))between 8 and 180),
 actor_id uuid not null references auth.users(id),occurred_at timestamptz not null default now(),metadata jsonb not null default'{}'check(jsonb_typeof(metadata)='object'),
 unique(organization_id,idempotency_key)
);
create index business_trial_events_metrics_idx on public.business_trial_adoption_events(organization_id,event_type,occurred_at);
create trigger set_updated_at before update on public.business_trials for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.business_trial_milestones for each row execute function private.set_updated_at();

create function private.activate_business_trial()returns trigger language plpgsql security definer set search_path='' as $$
declare started_at timestamptz:=now();
begin
 insert into public.business_trials(organization_id,installation_id,trial_start_date,trial_end_date,activated_by)
 values(new.organization_id,new.id,started_at,started_at+interval'45 days',new.installed_by)on conflict(organization_id)do nothing;
 if found then
  insert into public.business_trial_milestones(organization_id,milestone_key,due_day,status,achieved_at,evidence)values
   (new.organization_id,'day_1_os_created',1,'achieved',started_at,jsonb_build_object('installationId',new.id)),
   (new.organization_id,'day_7_setup',7,'pending',null,'{}'),(new.organization_id,'day_15_operational',15,'pending',null,'{}'),
   (new.organization_id,'day_30_insights',30,'pending',null,'{}'),(new.organization_id,'day_40_value_report',40,'pending',null,'{}'),
   (new.organization_id,'day_45_conversion',45,'pending',null,'{}');
  insert into public.subscriptions(organization_id,provider,plan_key,status,current_period_start,current_period_end,entitlements)
  values(new.organization_id,'negosyoos_trial','pro','trialing',started_at,started_at+interval'45 days','{"trial":true,"fullMvpAccess":true}'::jsonb)
  on conflict(organization_id)do update set plan_key='pro',status='trialing',current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
   entitlements=public.subscriptions.entitlements||excluded.entitlements,updated_at=now()
  where public.subscriptions.status<>'active';
 end if;
 return new;
end$$;
create trigger activate_trial_after_os_install after insert on public.business_os_installations for each row execute function private.activate_business_trial();

create function private.business_trial_metrics(requested_organization_id uuid,started_at timestamptz)returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'transactionsRecorded',(select count(*)from public.sales_transactions where organization_id=requested_organization_id and created_at>=started_at and status not in('suspended','voided')),
  'productsCreated',(select count(*)from public.products where organization_id=requested_organization_id and created_at>=started_at),
  'customersCreated',(select count(*)from public.sales_customers where organization_id=requested_organization_id and created_at>=started_at),
  'inventoryMovements',(select count(*)from public.stock_movements where organization_id=requested_organization_id and occurred_at>=started_at),
  'reportsViewed',(select count(*)from public.business_trial_adoption_events where organization_id=requested_organization_id and occurred_at>=started_at and event_type='report_viewed'),
  'aiRecommendationsUsed',
   (select count(*)from public.configuration_versions where organization_id=requested_organization_id and created_at>=started_at and source='ai')+
   (select count(*)from public.ai_business_interviews where organization_id=requested_organization_id and reviewed_at>=started_at and status='approved')
 )
$$;

create function private.refresh_business_trial(requested_organization_id uuid)returns void language plpgsql security definer set search_path='' as $$
declare trial public.business_trials%rowtype;metrics jsonb;
begin
 select*into trial from public.business_trials where organization_id=requested_organization_id for update;
 if trial.organization_id is null then return;end if;
 if trial.trial_status<>'converted'then
  update public.business_trials set trial_status=case when now()>=trial.trial_end_date then'expired'when now()>=trial.trial_end_date-interval'5 days'then'expiring'else'active'end where organization_id=requested_organization_id;
  if now()>=trial.trial_end_date then update public.subscriptions set status='paused',entitlements=entitlements||'{"trial":false,"trialExpired":true}'::jsonb,updated_at=now()where organization_id=requested_organization_id and provider='negosyoos_trial'and status='trialing';end if;
 end if;
 metrics:=private.business_trial_metrics(requested_organization_id,trial.trial_start_date);
 update public.business_trial_milestones set status='achieved',achieved_at=now(),evidence=jsonb_build_object('productsCreated',metrics->'productsCreated','customersCreated',metrics->'customersCreated')
  where organization_id=requested_organization_id and milestone_key='day_7_setup'and status='pending'and((metrics->>'productsCreated')::int>0 or(metrics->>'customersCreated')::int>0);
 update public.business_trial_milestones set status='achieved',achieved_at=now(),evidence=jsonb_build_object('transactionsRecorded',metrics->'transactionsRecorded','inventoryMovements',metrics->'inventoryMovements')
  where organization_id=requested_organization_id and milestone_key='day_15_operational'and status='pending'and((metrics->>'transactionsRecorded')::int>0 or(metrics->>'inventoryMovements')::int>0);
 update public.business_trial_milestones set status='achieved',achieved_at=now(),evidence=jsonb_build_object('reportsViewed',metrics->'reportsViewed')
  where organization_id=requested_organization_id and milestone_key='day_30_insights'and status='pending'and(metrics->>'reportsViewed')::int>0;
 update public.business_trial_milestones set status='achieved',achieved_at=now(),evidence=jsonb_build_object('valueReportViewed',true)
  where organization_id=requested_organization_id and milestone_key='day_40_value_report'and status='pending'and exists(select 1 from public.business_trial_adoption_events where organization_id=requested_organization_id and event_type='trial_value_report_viewed');
end$$;

create function public.get_business_trial_dashboard(requested_organization_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare trial public.business_trials%rowtype;metrics jsonb;milestones jsonb;
begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'organization.read',null)then raise exception'Permission denied.'using errcode='42501';end if;
 perform private.refresh_business_trial(requested_organization_id);
 select*into trial from public.business_trials where organization_id=requested_organization_id;
 if trial.organization_id is null then return jsonb_build_object('trialStatus','not_started','metrics',jsonb_build_object('transactionsRecorded',0,'productsCreated',0,'customersCreated',0,'inventoryMovements',0,'reportsViewed',0,'aiRecommendationsUsed',0),'milestones','[]'::jsonb);end if;
 metrics:=private.business_trial_metrics(requested_organization_id,trial.trial_start_date);
 select coalesce(jsonb_agg(jsonb_build_object('key',milestone_key,'dueDay',due_day,'status',status,'achievedAt',achieved_at,'evidence',evidence)order by due_day),'[]'::jsonb)into milestones from public.business_trial_milestones where organization_id=requested_organization_id;
 return jsonb_build_object('trialStartDate',trial.trial_start_date,'trialEndDate',trial.trial_end_date,'trialStatus',trial.trial_status,'convertedAt',trial.converted_at,
  'daysElapsed',least(45,greatest(0,floor(extract(epoch from(now()-trial.trial_start_date))/86400)::int)),
  'daysRemaining',greatest(0,ceil(extract(epoch from(trial.trial_end_date-now()))/86400)::int),'metrics',metrics,'milestones',milestones);
end$$;

create function public.record_business_trial_adoption(requested_organization_id uuid,requested_event_type text,requested_resource_key text,requested_idempotency_key text,requested_metadata jsonb default'{}')returns uuid language plpgsql security definer set search_path='' as $$
declare event_id uuid;
begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'organization.read',null)then raise exception'Permission denied.'using errcode='42501';end if;
 insert into public.business_trial_adoption_events(organization_id,event_type,resource_key,idempotency_key,actor_id,metadata)values(requested_organization_id,requested_event_type,btrim(requested_resource_key),btrim(requested_idempotency_key),auth.uid(),requested_metadata)
 on conflict(organization_id,idempotency_key)do update set idempotency_key=excluded.idempotency_key returning id into event_id;
 perform private.refresh_business_trial(requested_organization_id);return event_id;
end$$;

create function public.convert_business_trial(requested_organization_id uuid)returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'settings.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 update public.business_trials set trial_status='converted',converted_at=now()where organization_id=requested_organization_id and trial_status not in('converted','not_started');
 if not found then raise exception'Active trial not found.'using errcode='P0001';end if;
 update public.subscriptions set status='active',entitlements=(entitlements-'trialExpired')||'{"trial":false,"converted":true}'::jsonb,updated_at=now()where organization_id=requested_organization_id;
 update public.business_trial_milestones set status='achieved',achieved_at=coalesce(achieved_at,now()),evidence=jsonb_build_object('converted',true)where organization_id=requested_organization_id and milestone_key='day_45_conversion';
end$$;

alter table public.business_trials enable row level security;alter table public.business_trial_milestones enable row level security;alter table public.business_trial_adoption_events enable row level security;
create policy business_trials_read on public.business_trials for select to authenticated using(private.can_business_permission(organization_id,'organization.read',null));
create policy business_trial_milestones_read on public.business_trial_milestones for select to authenticated using(private.can_business_permission(organization_id,'organization.read',null));
create policy business_trial_events_read on public.business_trial_adoption_events for select to authenticated using(private.can_business_permission(organization_id,'organization.read',null));
revoke all on table public.business_trials,public.business_trial_milestones,public.business_trial_adoption_events from public,anon,authenticated;
grant select on table public.business_trials,public.business_trial_milestones,public.business_trial_adoption_events to authenticated;
revoke all on function public.get_business_trial_dashboard(uuid),public.record_business_trial_adoption(uuid,text,text,text,jsonb),public.convert_business_trial(uuid)from public,anon;
grant execute on function public.get_business_trial_dashboard(uuid),public.record_business_trial_adoption(uuid,text,text,text,jsonb),public.convert_business_trial(uuid)to authenticated;
comment on table public.business_trials is'One 45-day trial per Business, started by its first Business OS activation; tenant records persist after expiration.';
