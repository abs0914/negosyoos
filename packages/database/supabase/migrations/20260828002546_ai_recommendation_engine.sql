-- Module 34: traceable AI recommendation engine.
create table public.recommendation_business_query_definitions(
 key text primary key check(key in('customer_sales_concentration','inventory_stockout_risk','expense_period_comparison')),
 label text not null,description text not null,required_permissions text[]not null,date_behavior text not null check(date_behavior in('month_to_date','velocity_projection','period_comparison')),is_enabled boolean not null default true,created_at timestamptz not null default now(),
 check(cardinality(required_permissions)>0)
);
insert into public.recommendation_business_query_definitions(key,label,description,required_permissions,date_behavior)values
('customer_sales_concentration','Top-customer sales concentration','Share of total net recorded sales represented by the ten highest-value identified customers in the selected period.',array['sales.read'],'month_to_date'),
('inventory_stockout_risk','Seven-day stock threshold projection','Tracked items currently above their configured low-stock threshold whose stock would reach or cross that threshold within seven days if their trailing 30-day net unit rate continued.',array['inventory.read','sales.read'],'velocity_projection'),
('expense_period_comparison','Expense period comparison','Approved expenses in the selected period compared with the immediately preceding period of equal length.',array['expenses.read'],'period_comparison');
alter table public.recommendation_business_query_definitions enable row level security;
create policy recommendation_query_registry_read on public.recommendation_business_query_definitions for select to authenticated using(is_enabled);
revoke all on public.recommendation_business_query_definitions from public,anon,authenticated;grant select on public.recommendation_business_query_definitions to authenticated;

create function public.query_recommendation_business_data(requested_organization_id uuid,requested_query_key text,requested_date_from date default null,requested_date_to date default null,requested_branch_id uuid default null,requested_limit integer default 10)returns jsonb
language plpgsql security definer set search_path='' as $$
declare definition public.recommendation_business_query_definitions%rowtype;today_ph date:=(now()at time zone'Asia/Manila')::date;date_from date;date_to date;from_at timestamptz;to_at timestamptz;period_days integer;rows jsonb:='[]'::jsonb;permission_key text;
begin
 select*into definition from public.recommendation_business_query_definitions where key=requested_query_key and is_enabled;
 if auth.uid()is null or definition.key is null then raise exception'Unknown or unavailable recommendation query.'using errcode='22023';end if;
 if requested_limit not between 1 and 25 then raise exception'Recommendation query limit must be between 1 and 25.'using errcode='22023';end if;
 foreach permission_key in array definition.required_permissions loop
  if requested_branch_id is not null then
   if not private.analytics_branch_allowed(requested_organization_id,requested_branch_id,permission_key)then raise exception'Permission denied.'using errcode='42501';end if;
  elsif not private.can_business_permission(requested_organization_id,'report.read',null)or not private.can_business_permission(requested_organization_id,permission_key,null)then raise exception'Permission denied.'using errcode='42501';end if;
 end loop;
 if definition.date_behavior='velocity_projection'then
  if requested_date_from is not null or requested_date_to is not null then raise exception'This projection uses a fixed trailing 30-day window and does not accept date filters.'using errcode='22023';end if;
  date_from:=today_ph-29;date_to:=today_ph;
 else
  date_from:=coalesce(requested_date_from,date_trunc('month',today_ph)::date);date_to:=coalesce(requested_date_to,today_ph);
  if date_from>date_to or date_to-date_from>365 then raise exception'Date range must be ordered and no longer than 366 days.'using errcode='22023';end if;
 end if;
 from_at:=date_from::timestamp at time zone'Asia/Manila';to_at:=(date_to+1)::timestamp at time zone'Asia/Manila';period_days:=date_to-date_from+1;
 if requested_query_key='customer_sales_concentration'then
  with scoped_amounts as(
   select sale.customer_id,sale.total amount from public.sales_transactions sale where sale.organization_id=requested_organization_id and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,'sales.read')and(requested_branch_id is null or sale.branch_id=requested_branch_id)
   union all
   select sale.customer_id,-refund.amount from public.sales_refunds refund join public.sales_transactions sale on sale.id=refund.sale_id and sale.organization_id=refund.organization_id where refund.organization_id=requested_organization_id and refund.created_at>=from_at and refund.created_at<to_at and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,'sales.read')and(requested_branch_id is null or sale.branch_id=requested_branch_id)
  ),customer_totals as(select customer_id,sum(amount)amount from scoped_amounts where customer_id is not null group by customer_id),ranked as(select amount,row_number()over(order by amount desc)position from customer_totals where amount>0),summary as(select(select coalesce(sum(amount),0)from scoped_amounts)total_sales,coalesce(sum(amount)filter(where position<=10),0)top_sales,count(*)filter(where position<=10)top_count from ranked)
  select case when total_sales>0 and top_count>0 then jsonb_build_array(jsonb_build_object('topCustomerCount',top_count,'topCustomerSales',round(top_sales,2),'totalSales',round(total_sales,2),'sharePercent',round(top_sales/total_sales*100,2)))else'[]'::jsonb end into rows from summary;
 elsif requested_query_key='inventory_stockout_risk'then
  with balances as(select item.id inventory_item_id,item.product_variant_id,item.low_stock_threshold,sum(balance.quantity)quantity_on_hand from public.inventory_items item join public.stock_balances balance on balance.inventory_item_id=item.id and balance.organization_id=item.organization_id join public.inventory_locations location on location.id=balance.location_id and location.organization_id=balance.organization_id where item.organization_id=requested_organization_id and item.is_tracked and private.analytics_branch_allowed(requested_organization_id,location.branch_id,'inventory.read')and(requested_branch_id is null or location.branch_id=requested_branch_id)group by item.id,item.product_variant_id,item.low_stock_threshold),velocity as(select line.inventory_item_id,sum(greatest(line.quantity-line.returned_quantity,0))/30 average_daily_units from public.sales_lines line join public.sales_transactions sale on sale.id=line.sale_id and sale.organization_id=line.organization_id where line.organization_id=requested_organization_id and line.inventory_item_id is not null and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,'sales.read')and(requested_branch_id is null or sale.branch_id=requested_branch_id)group by line.inventory_item_id),risk as(select product.name product_name,variant.name variant_name,variant.sku,balance.quantity_on_hand,balance.low_stock_threshold,velocity.average_daily_units,round(balance.quantity_on_hand-velocity.average_daily_units*7,4)projected_quantity from balances balance join velocity on velocity.inventory_item_id=balance.inventory_item_id join public.product_variants variant on variant.id=balance.product_variant_id and variant.organization_id=requested_organization_id join public.products product on product.id=variant.product_id and product.organization_id=variant.organization_id where velocity.average_daily_units>0 and balance.quantity_on_hand>balance.low_stock_threshold and balance.quantity_on_hand-velocity.average_daily_units*7<=balance.low_stock_threshold and product.status='active'and variant.status='active'order by projected_quantity,product.name limit requested_limit)
  select coalesce(jsonb_agg(jsonb_build_object('productName',product_name,'variantName',variant_name,'sku',sku,'quantityOnHand',quantity_on_hand,'lowStockThreshold',low_stock_threshold,'averageDailyUnits',round(average_daily_units,4),'projectedQuantity',projected_quantity,'projectionDays',7)order by projected_quantity,product_name),'[]'::jsonb)into rows from risk;
 elsif requested_query_key='expense_period_comparison'then
  with amounts as(select coalesce(sum(expense.amount)filter(where expense.expense_date between date_from and date_to),0)current_expenses,coalesce(sum(expense.amount)filter(where expense.expense_date>=date_from-period_days and expense.expense_date<date_from),0)previous_expenses from public.expenses expense where expense.organization_id=requested_organization_id and expense.approval_status='approved'and expense.expense_date between date_from-period_days and date_to and private.analytics_branch_allowed(requested_organization_id,expense.branch_id,'expenses.read')and(requested_branch_id is null or expense.branch_id=requested_branch_id))
  select jsonb_build_array(jsonb_build_object('currentExpenses',round(current_expenses,2),'previousExpenses',round(previous_expenses,2),'changePercent',case when previous_expenses=0 then null else round((current_expenses-previous_expenses)/previous_expenses*100,2)end))into rows from amounts;
 end if;
 return jsonb_build_object('queryKey',definition.key,'label',definition.label,'definition',definition.description,'rows',rows,'dateBehavior',definition.date_behavior,'period',jsonb_build_object('dateFrom',date_from,'dateTo',date_to,'timezone','Asia/Manila'),'branchId',requested_branch_id,'calculatedAt',clock_timestamp());
exception when invalid_text_representation or numeric_value_out_of_range then raise exception'Invalid recommendation query.'using errcode='22023';end$$;
revoke all on function public.query_recommendation_business_data(uuid,text,date,date,uuid,integer)from public,anon;grant execute on function public.query_recommendation_business_data(uuid,text,date,date,uuid,integer)to authenticated;

create table public.ai_recommendations(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,branch_id uuid,rule_key text not null check(rule_key~'^[a-z][a-z0-9_]{0,79}$'),recommendation_type text not null check(recommendation_type in('inventory','sales','customer_retention','cashflow','expenses','operations','staffing','marketing')),title text not null check(char_length(btrim(title))between 1 and 180),summary text not null check(char_length(btrim(summary))between 1 and 1000),reason text not null check(char_length(btrim(reason))between 1 and 1500),supporting_metrics jsonb not null check(jsonb_typeof(supporting_metrics)='array'and jsonb_array_length(supporting_metrics)>0),required_permissions text[]not null check(cardinality(required_permissions)>0),priority text not null check(priority in('low','medium','high','critical')),potential_action text not null check(char_length(btrim(potential_action))between 1 and 1000),status text not null default'new'check(status in('new','viewed','accepted','dismissed','completed')),evidence_fingerprint text not null check(evidence_fingerprint~'^[0-9a-f]{64}$'),created_by uuid not null references auth.users(id),viewed_at timestamptz,accepted_at timestamptz,dismissed_at timestamptz,completed_at timestamptz,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),unique(id,organization_id),foreign key(branch_id,organization_id)references public.branches(id,organization_id)on delete restrict
);
create unique index ai_recommendations_evidence_unique on public.ai_recommendations(organization_id,coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid),rule_key,evidence_fingerprint);
create index ai_recommendations_inbox_idx on public.ai_recommendations(organization_id,status,priority,created_at desc);
create table public.ai_recommendation_events(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,recommendation_id uuid not null,actor_id uuid not null references auth.users(id),event text not null check(event in('generated','status_changed')),from_status text check(from_status is null or from_status in('new','viewed','accepted','dismissed','completed')),to_status text not null check(to_status in('new','viewed','accepted','dismissed','completed')),created_at timestamptz not null default clock_timestamp(),foreign key(recommendation_id,organization_id)references public.ai_recommendations(id,organization_id)on delete cascade
);
create index ai_recommendation_events_history_idx on public.ai_recommendation_events(organization_id,recommendation_id,created_at,id);
create trigger set_updated_at before update on public.ai_recommendations for each row execute function private.set_updated_at();

create function public.save_ai_recommendations(requested_organization_id uuid,requested_branch_id uuid default null,recommendations jsonb default'[]'::jsonb)returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();item jsonb;evidence jsonb;permission_key text;permissions text[];saved integer:=0;recommendation_key uuid;
begin
 if actor is null or not private.can_business_permission(requested_organization_id,'ai.manage',requested_branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
 if jsonb_typeof(recommendations)<>'array'or jsonb_array_length(recommendations)>20 then raise exception'Invalid recommendations.'using errcode='22023';end if;
 for item in select value from jsonb_array_elements(recommendations)loop
  if jsonb_typeof(item->'supportingMetrics')<>'array'or jsonb_array_length(item->'supportingMetrics')=0 or item->>'evidenceFingerprint'!~'^[0-9a-f]{64}$'then raise exception'Invalid recommendation evidence.'using errcode='22023';end if;
  permissions:='{}';
  for evidence in select value from jsonb_array_elements(item->'supportingMetrics')loop
   permission_key:=null;
   if evidence->>'source'='metric'and evidence->'data'->>'metricKey'=evidence->>'key'then select required_permission into permission_key from public.analytics_metric_definitions where key=evidence->>'key'and is_enabled;
   elsif evidence->>'source'='business_query'and evidence->'data'->>'queryKey'=evidence->>'key'then
    select required_permission into permission_key from public.advisor_business_query_definitions where key=evidence->>'key'and is_enabled;
    if permission_key is null then select unnest(required_permissions)into permission_key from public.recommendation_business_query_definitions where key=evidence->>'key'and is_enabled limit 1;end if;
    if exists(select 1 from public.recommendation_business_query_definitions where key=evidence->>'key'and is_enabled)then permissions:=permissions||(select required_permissions from public.recommendation_business_query_definitions where key=evidence->>'key');end if;
   end if;
   if permission_key is null then raise exception'Unknown recommendation evidence.'using errcode='22023';end if;
   permissions:=array_append(permissions,permission_key);
  end loop;
  select array_agg(distinct value order by value)into permissions from unnest(permissions)entry(value);
  foreach permission_key in array permissions loop if not private.can_business_permission(requested_organization_id,permission_key,requested_branch_id)then raise exception'Permission denied.'using errcode='42501';end if;end loop;
  recommendation_key:=null;
  insert into public.ai_recommendations(organization_id,branch_id,rule_key,recommendation_type,title,summary,reason,supporting_metrics,required_permissions,priority,potential_action,evidence_fingerprint,created_by)
  values(requested_organization_id,requested_branch_id,item->>'ruleKey',item->>'type',item->>'title',item->>'summary',item->>'reason',item->'supportingMetrics',permissions,item->>'priority',item->>'potentialAction',item->>'evidenceFingerprint',actor)on conflict do nothing returning id into recommendation_key;
  if recommendation_key is not null then insert into public.ai_recommendation_events(organization_id,recommendation_id,actor_id,event,to_status)values(requested_organization_id,recommendation_key,actor,'generated','new');saved:=saved+1;end if;
 end loop;
 return saved;
end$$;

create function public.transition_ai_recommendation(requested_organization_id uuid,requested_recommendation_id uuid,next_status text)returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();recommendation public.ai_recommendations%rowtype;permission_key text;
begin
 select*into recommendation from public.ai_recommendations where id=requested_recommendation_id and organization_id=requested_organization_id for update;
 if actor is null or recommendation.id is null or not private.can_business_permission(requested_organization_id,case when next_status='viewed'then'ai.read'else'ai.manage'end,recommendation.branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
 foreach permission_key in array recommendation.required_permissions loop if not private.can_business_permission(requested_organization_id,permission_key,recommendation.branch_id)then raise exception'Permission denied.'using errcode='42501';end if;end loop;
 if not((recommendation.status='new'and next_status in('viewed','accepted','dismissed'))or(recommendation.status='viewed'and next_status in('accepted','dismissed'))or(recommendation.status='accepted'and next_status in('completed','dismissed')))then raise exception'Invalid recommendation status transition.'using errcode='22023';end if;
 update public.ai_recommendations set status=next_status,viewed_at=case when next_status='viewed'then clock_timestamp()else viewed_at end,accepted_at=case when next_status='accepted'then clock_timestamp()else accepted_at end,dismissed_at=case when next_status='dismissed'then clock_timestamp()else dismissed_at end,completed_at=case when next_status='completed'then clock_timestamp()else completed_at end where id=recommendation.id;
 insert into public.ai_recommendation_events(organization_id,recommendation_id,actor_id,event,from_status,to_status)values(requested_organization_id,recommendation.id,actor,'status_changed',recommendation.status,next_status);
end$$;

alter table public.ai_recommendations enable row level security;alter table public.ai_recommendation_events enable row level security;
create policy ai_recommendations_authorized_read on public.ai_recommendations for select to authenticated using(private.can_business_permission(organization_id,'ai.read',branch_id)and(select bool_and(private.can_business_permission(organization_id,permission,branch_id))from unnest(required_permissions)permission));
create policy ai_recommendation_events_authorized_read on public.ai_recommendation_events for select to authenticated using(exists(select 1 from public.ai_recommendations recommendation where recommendation.id=recommendation_id and recommendation.organization_id=ai_recommendation_events.organization_id and private.can_business_permission(recommendation.organization_id,'ai.read',recommendation.branch_id)and(select bool_and(private.can_business_permission(recommendation.organization_id,permission,recommendation.branch_id))from unnest(recommendation.required_permissions)permission)));
revoke all on public.ai_recommendations,public.ai_recommendation_events from public,anon,authenticated;grant select on public.ai_recommendations,public.ai_recommendation_events to authenticated;
revoke all on function public.save_ai_recommendations(uuid,uuid,jsonb),public.transition_ai_recommendation(uuid,uuid,text),public.query_recommendation_business_data(uuid,text,date,date,uuid,integer)from public,anon;grant execute on function public.save_ai_recommendations(uuid,uuid,jsonb),public.transition_ai_recommendation(uuid,uuid,text),public.query_recommendation_business_data(uuid,text,date,date,uuid,integer)to authenticated;
comment on table public.ai_recommendations is'Business recommendations with immutable evidence snapshots, permission provenance, lifecycle state, and auditable generation.';
comment on function public.query_recommendation_business_data(uuid,text,date,date,uuid,integer)is'Allowlisted business-query boundary used by the recommendation rules engine; arbitrary query input is rejected.';
