-- Module 32: controlled business analytics semantic layer.
create table public.analytics_metric_definitions(
 key text primary key check(key in('sales_today','sales_this_month','sales_growth','average_transaction_value','gross_margin','expense_total','inventory_value','low_stock_count','customer_count','repeat_customer_rate','receivables_total','overdue_receivables','top_products','slow_moving_products')),
 label text not null,description text not null,value_type text not null check(value_type in('currency','number','percentage','list')),
 default_period text not null check(default_period in('today','month_to_date','last_30_days','current_snapshot')),
 supports_date_filter boolean not null,supports_branch_filter boolean not null default true,
 required_permission text not null references public.permissions(key),is_enabled boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
insert into public.analytics_metric_definitions(key,label,description,value_type,default_period,supports_date_filter,required_permission)values
('sales_today','Sales today','Transaction totals recorded in the selected Philippine-local day, less refunds recorded that day; suspended and voided sales are excluded.','currency','today',true,'sales.read'),
('sales_this_month','Sales this month','Transaction totals recorded in the selected month-to-date period, less refunds recorded in that period; suspended and voided sales are excluded.','currency','month_to_date',true,'sales.read'),
('sales_growth','Sales growth','Percentage change in net recorded sales versus the immediately preceding period of equal length; null when the previous period has no sales.','percentage','month_to_date',true,'sales.read'),
('average_transaction_value','Average transaction value','Net recorded sales divided by qualifying transactions in the selected period.','currency','month_to_date',true,'sales.read'),
('gross_margin','Gross margin','Current net line sales less recorded unit cost, divided by current net line sales, for qualifying sales recorded in the selected period.','percentage','month_to_date',true,'sales.read'),
('expense_total','Expense total','Sum of approved expenses whose expense date falls in the selected period.','currency','month_to_date',true,'expenses.read'),
('inventory_value','Inventory value','Current on-hand quantity multiplied by current average unit cost across accessible inventory locations.','currency','current_snapshot',false,'inventory.read'),
('low_stock_count','Low stock count','Tracked inventory items whose current total accessible quantity is at or below their configured low-stock threshold.','number','current_snapshot',false,'inventory.read'),
('customer_count','Customer count','Customer records created in the selected period.','number','month_to_date',true,'crm.read'),
('repeat_customer_rate','Repeat customer rate','Share of customers with qualifying sales in the selected period who recorded at least two qualifying transactions.','percentage','month_to_date',true,'crm.read'),
('receivables_total','Receivables total','Current unpaid balance of issued, partially paid, and overdue invoices.','currency','current_snapshot',false,'invoices.read'),
('overdue_receivables','Overdue receivables','Current unpaid balance of open invoices past their due date in Philippine local time.','currency','current_snapshot',false,'invoices.read'),
('top_products','Top products','Products ranked by net units recorded on qualifying sales in the selected period.','list','last_30_days',true,'sales.read'),
('slow_moving_products','Slow moving products','Active tracked products with accessible stock on hand and no net units recorded on qualifying sales in the selected period.','list','last_30_days',true,'inventory.read');
create trigger set_updated_at before update on public.analytics_metric_definitions for each row execute function private.set_updated_at();
alter table public.analytics_metric_definitions enable row level security;
create policy analytics_metric_registry_read on public.analytics_metric_definitions for select to authenticated using(is_enabled);
revoke all on table public.analytics_metric_definitions from public,anon,authenticated;
grant select on table public.analytics_metric_definitions to authenticated;

create function private.analytics_branch_allowed(requested_organization_id uuid,requested_branch_id uuid,requested_permission text)returns boolean
language sql stable security definer set search_path='' as $$
 select requested_branch_id is not null
 and private.can_business_permission(requested_organization_id,'report.read',requested_branch_id)
 and private.can_business_permission(requested_organization_id,requested_permission,requested_branch_id)
$$;
revoke all on function private.analytics_branch_allowed(uuid,uuid,text)from public,anon,authenticated;

create function public.query_business_metric(
 requested_organization_id uuid,requested_metric_key text,requested_date_from date default null,requested_date_to date default null,requested_branch_id uuid default null,requested_limit integer default 5
)returns jsonb language plpgsql security definer set search_path='' as $$
declare
 definition public.analytics_metric_definitions%rowtype;today_ph date:=(now()at time zone'Asia/Manila')::date;
 date_from date;date_to date;from_at timestamptz;to_at timestamptz;previous_from_at timestamptz;previous_to_at timestamptz;
 period_days integer;metric_value jsonb:='null'::jsonb;current_amount numeric:=0;previous_amount numeric:=0;transaction_count bigint:=0;
 numerator numeric:=0;denominator numeric:=0;calculated_at timestamptz:=now();
begin
 select*into definition from public.analytics_metric_definitions where key=requested_metric_key and is_enabled;
 if auth.uid()is null or definition.key is null then raise exception'Unknown or unavailable metric.'using errcode='22023';end if;
 if requested_limit not between 1 and 25 then raise exception'Metric result limit must be between 1 and 25.'using errcode='22023';end if;
 if requested_branch_id is not null and not private.analytics_branch_allowed(requested_organization_id,requested_branch_id,definition.required_permission)then raise exception'Permission denied.'using errcode='42501';end if;
 if requested_branch_id is null and(not private.can_business_permission(requested_organization_id,'report.read',null)or not private.can_business_permission(requested_organization_id,definition.required_permission,null))then raise exception'Permission denied.'using errcode='42501';end if;
 if(requested_date_from is not null or requested_date_to is not null)and not definition.supports_date_filter then raise exception'This metric is a current snapshot and does not accept date filters.'using errcode='22023';end if;
 if definition.default_period='today'then date_from:=coalesce(requested_date_from,requested_date_to,today_ph);date_to:=coalesce(requested_date_to,requested_date_from,today_ph);
 elsif definition.default_period='month_to_date'then date_from:=coalesce(requested_date_from,date_trunc('month',today_ph)::date);date_to:=coalesce(requested_date_to,today_ph);
 elsif definition.default_period='last_30_days'then date_from:=coalesce(requested_date_from,today_ph-29);date_to:=coalesce(requested_date_to,today_ph);
 else date_from:=null;date_to:=null;end if;
 if date_from is not null then
  if date_from>date_to or date_to-date_from>365 then raise exception'Date range must be ordered and no longer than 366 days.'using errcode='22023';end if;
  from_at:=date_from::timestamp at time zone'Asia/Manila';to_at:=(date_to+1)::timestamp at time zone'Asia/Manila';period_days:=date_to-date_from+1;
  previous_from_at:=(date_from-period_days)::timestamp at time zone'Asia/Manila';previous_to_at:=from_at;
 end if;

 if requested_metric_key in('sales_today','sales_this_month','sales_growth','average_transaction_value')then
  select coalesce(sum(sale.total),0),count(*)into current_amount,transaction_count from public.sales_transactions sale
   where sale.organization_id=requested_organization_id and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')
   and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id);
  current_amount:=current_amount-coalesce((select sum(refund.amount)from public.sales_refunds refund join public.sales_transactions sale on sale.id=refund.sale_id and sale.organization_id=refund.organization_id where refund.organization_id=requested_organization_id and refund.created_at>=from_at and refund.created_at<to_at and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id)),0);
  if requested_metric_key='sales_growth'then
   select coalesce(sum(sale.total),0)into previous_amount from public.sales_transactions sale where sale.organization_id=requested_organization_id and sale.created_at>=previous_from_at and sale.created_at<previous_to_at and sale.status not in('suspended','voided')and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id);
   previous_amount:=previous_amount-coalesce((select sum(refund.amount)from public.sales_refunds refund join public.sales_transactions sale on sale.id=refund.sale_id and sale.organization_id=refund.organization_id where refund.organization_id=requested_organization_id and refund.created_at>=previous_from_at and refund.created_at<previous_to_at and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id)),0);
   metric_value:=case when previous_amount=0 then'null'::jsonb else to_jsonb(round((current_amount-previous_amount)/previous_amount*100,2))end;
  elsif requested_metric_key='average_transaction_value'then metric_value:=to_jsonb(case when transaction_count=0 then 0 else round(current_amount/transaction_count,2)end);
  else metric_value:=to_jsonb(round(current_amount,2));end if;
 elsif requested_metric_key='gross_margin'then
  select coalesce(sum((line.total/nullif(line.quantity,0))*greatest(line.quantity-line.returned_quantity,0)-line.unit_cost*greatest(line.quantity-line.returned_quantity,0)),0),coalesce(sum((line.total/nullif(line.quantity,0))*greatest(line.quantity-line.returned_quantity,0)),0)into numerator,denominator
  from public.sales_lines line join public.sales_transactions sale on sale.id=line.sale_id and sale.organization_id=line.organization_id where line.organization_id=requested_organization_id and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id);
  metric_value:=case when denominator=0 then'null'::jsonb else to_jsonb(round(numerator/denominator*100,2))end;
 elsif requested_metric_key='expense_total'then
  select to_jsonb(coalesce(round(sum(expense.amount),2),0))into metric_value from public.expenses expense where expense.organization_id=requested_organization_id and expense.expense_date between date_from and date_to and expense.approval_status='approved'and private.analytics_branch_allowed(requested_organization_id,expense.branch_id,definition.required_permission)and(requested_branch_id is null or expense.branch_id=requested_branch_id);
 elsif requested_metric_key='inventory_value'then
  select to_jsonb(coalesce(round(sum(balance.quantity*balance.average_unit_cost),2),0))into metric_value from public.stock_balances balance join public.inventory_locations location on location.id=balance.location_id and location.organization_id=balance.organization_id where balance.organization_id=requested_organization_id and private.analytics_branch_allowed(requested_organization_id,location.branch_id,definition.required_permission)and(requested_branch_id is null or location.branch_id=requested_branch_id);
 elsif requested_metric_key='low_stock_count'then
  select to_jsonb(count(*))into metric_value from(select item.id from public.inventory_items item join public.stock_balances balance on balance.inventory_item_id=item.id and balance.organization_id=item.organization_id join public.inventory_locations location on location.id=balance.location_id and location.organization_id=balance.organization_id where item.organization_id=requested_organization_id and item.is_tracked and private.analytics_branch_allowed(requested_organization_id,location.branch_id,definition.required_permission)and(requested_branch_id is null or location.branch_id=requested_branch_id)group by item.id,item.low_stock_threshold having sum(balance.quantity)<=item.low_stock_threshold)low;
 elsif requested_metric_key='customer_count'then
  select to_jsonb(count(*))into metric_value from public.sales_customers customer where customer.organization_id=requested_organization_id and customer.created_at>=from_at and customer.created_at<to_at and private.analytics_branch_allowed(requested_organization_id,customer.branch_id,definition.required_permission)and(requested_branch_id is null or customer.branch_id=requested_branch_id);
 elsif requested_metric_key='repeat_customer_rate'then
  select count(*),count(*)filter(where purchases>=2)into denominator,numerator from(select sale.customer_id,count(*)purchases from public.sales_transactions sale where sale.organization_id=requested_organization_id and sale.customer_id is not null and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id)group by sale.customer_id)customer_sales;
  metric_value:=case when denominator=0 then to_jsonb(0)else to_jsonb(round(numerator/denominator*100,2))end;
 elsif requested_metric_key in('receivables_total','overdue_receivables')then
  select to_jsonb(coalesce(round(sum(invoice.balance_due),2),0))into metric_value from public.invoices invoice where invoice.organization_id=requested_organization_id and invoice.status in('issued','partially_paid','overdue')and invoice.balance_due>0 and(requested_metric_key='receivables_total'or invoice.due_date<today_ph)and private.analytics_branch_allowed(requested_organization_id,invoice.branch_id,definition.required_permission)and(requested_branch_id is null or invoice.branch_id=requested_branch_id);
 elsif requested_metric_key='top_products'then
  select coalesce(jsonb_agg(jsonb_build_object('productName',ranked.product_name,'variantName',ranked.variant_name,'sku',ranked.sku,'unitsSold',ranked.units_sold,'recordedSales',ranked.recorded_sales)order by ranked.units_sold desc,ranked.product_name),'[]'::jsonb)into metric_value from(select line.product_name,line.variant_name,line.sku,round(sum(greatest(line.quantity-line.returned_quantity,0)),4)units_sold,round(sum((line.total/nullif(line.quantity,0))*greatest(line.quantity-line.returned_quantity,0)),2)recorded_sales from public.sales_lines line join public.sales_transactions sale on sale.id=line.sale_id and sale.organization_id=line.organization_id where line.organization_id=requested_organization_id and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,definition.required_permission)and(requested_branch_id is null or sale.branch_id=requested_branch_id)group by line.product_name,line.variant_name,line.sku having sum(greatest(line.quantity-line.returned_quantity,0))>0 order by units_sold desc,line.product_name limit requested_limit)ranked;
 elsif requested_metric_key='slow_moving_products'then
  select coalesce(jsonb_agg(jsonb_build_object('productName',ranked.product_name,'variantName',ranked.variant_name,'sku',ranked.sku,'quantityOnHand',ranked.quantity_on_hand,'unitsSold',0)order by ranked.quantity_on_hand desc,ranked.product_name),'[]'::jsonb)into metric_value from(select product.name product_name,variant.name variant_name,variant.sku,round(sum(balance.quantity),4)quantity_on_hand from public.product_variants variant join public.products product on product.id=variant.product_id and product.organization_id=variant.organization_id join public.inventory_items item on item.product_variant_id=variant.id and item.organization_id=variant.organization_id join public.stock_balances balance on balance.inventory_item_id=item.id and balance.organization_id=item.organization_id join public.inventory_locations location on location.id=balance.location_id and location.organization_id=balance.organization_id where variant.organization_id=requested_organization_id and variant.status='active'and product.status='active'and private.analytics_branch_allowed(requested_organization_id,location.branch_id,definition.required_permission)and(requested_branch_id is null or location.branch_id=requested_branch_id)and not exists(select 1 from public.sales_lines line join public.sales_transactions sale on sale.id=line.sale_id and sale.organization_id=line.organization_id where line.organization_id=variant.organization_id and line.product_variant_id=variant.id and sale.created_at>=from_at and sale.created_at<to_at and sale.status not in('suspended','voided')and greatest(line.quantity-line.returned_quantity,0)>0 and private.analytics_branch_allowed(requested_organization_id,sale.branch_id,'inventory.read')and(requested_branch_id is null or sale.branch_id=requested_branch_id))group by product.name,variant.name,variant.sku having sum(balance.quantity)>0 order by quantity_on_hand desc,product.name limit requested_limit)ranked;
 end if;
 return jsonb_build_object('metricKey',definition.key,'label',definition.label,'definition',definition.description,'valueType',definition.value_type,'value',metric_value,'unit',case when definition.value_type='currency'then'PHP'when definition.value_type='percentage'then'percent'else null end,'dateBehavior',definition.default_period,'period',case when date_from is null then null else jsonb_build_object('dateFrom',date_from,'dateTo',date_to,'timezone','Asia/Manila')end,'branchId',requested_branch_id,'calculatedAt',calculated_at);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception'Invalid metric query.'using errcode='22023';
end$$;
revoke all on function public.query_business_metric(uuid,text,date,date,uuid,integer)from public,anon;
grant execute on function public.query_business_metric(uuid,text,date,date,uuid,integer)to authenticated;
comment on table public.analytics_metric_definitions is'Allowlisted semantic metric registry consumed by application and AI analytics clients.';
comment on function public.query_business_metric(uuid,text,date,date,uuid,integer)is'The only supported AI analytics boundary: validates metric, tenant, branch, dates, permission, and list limit before querying source records.';
