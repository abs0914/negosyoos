-- Module 31: calculated 45-day transformation report. No modeled or invented savings.
create function public.get_business_trial_value_report(requested_organization_id uuid)returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 trial public.business_trials%rowtype;period_end timestamptz;generated_at timestamptz:=now();
 setup jsonb;transactions_count bigint;sales_amount numeric;expense_count bigint;expense_amount numeric;
 inventory_count bigint;customers_count bigint;receivable_count bigint;receivable_amount numeric;
 low_stock_count bigint;reports_count bigint;ai_count bigint;repeat_customers bigint;average_ticket numeric;
 top_products jsonb;slow_products jsonb;ai_recommendations jsonb;features jsonb:='[]'::jsonb;insights jsonb:='[]'::jsonb;improvements jsonb:='[]'::jsonb;
begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'report.read',null)then raise exception'Permission denied.'using errcode='42501';end if;
 perform private.refresh_business_trial(requested_organization_id);
 select*into trial from public.business_trials where organization_id=requested_organization_id;
 if trial.organization_id is null then raise exception'The 45-day report is available after Business OS activation.'using errcode='P0001';end if;
 period_end:=least(generated_at,trial.trial_end_date);

 select jsonb_build_object('businessOs',template.name,'templateVersion',version.version,'branchesConfigured',(select count(*)from public.branches where organization_id=requested_organization_id and is_active),'modulesEnabled',(select count(*)from public.organization_modules where organization_id=requested_organization_id and is_enabled),'productsConfigured',(select count(*)from public.products where organization_id=requested_organization_id and status<>'inactive'),'setupMilestoneCompleted',exists(select 1 from public.business_trial_milestones where organization_id=requested_organization_id and milestone_key='day_7_setup'and status='achieved'))into setup
 from public.business_os_installations installation join public.business_os_templates template on template.id=installation.template_id join public.business_os_template_versions version on version.id=installation.installed_version_id where installation.organization_id=requested_organization_id;

 select count(*),coalesce(sum(sale.total),0)-coalesce((select sum(refund.amount)from public.sales_refunds refund where refund.organization_id=requested_organization_id and refund.created_at>=trial.trial_start_date and refund.created_at<=period_end),0)
 into transactions_count,sales_amount from public.sales_transactions sale where sale.organization_id=requested_organization_id and sale.created_at>=trial.trial_start_date and sale.created_at<=period_end and sale.status not in('suspended','voided');
 select count(*),coalesce(sum(amount)filter(where approval_status='approved'),0)into expense_count,expense_amount from public.expenses where organization_id=requested_organization_id and created_at>=trial.trial_start_date and created_at<=period_end and approval_status not in('rejected','cancelled');
 select count(*)into inventory_count from public.stock_movements where organization_id=requested_organization_id and occurred_at>=trial.trial_start_date and occurred_at<=period_end;
 select count(*)into customers_count from public.sales_customers where organization_id=requested_organization_id and created_at>=trial.trial_start_date and created_at<=period_end;
 select count(*),coalesce(sum(balance_due),0)into receivable_count,receivable_amount from public.invoices where organization_id=requested_organization_id and status in('issued','partially_paid','overdue')and balance_due>0;
 select count(*)into low_stock_count from(select item.id from public.inventory_items item join public.stock_balances balance on balance.organization_id=item.organization_id and balance.inventory_item_id=item.id where item.organization_id=requested_organization_id and item.is_tracked group by item.id,item.low_stock_threshold having sum(balance.quantity)<=item.low_stock_threshold)low;
 select count(*)into reports_count from public.business_trial_adoption_events where organization_id=requested_organization_id and event_type='report_viewed'and occurred_at>=trial.trial_start_date and occurred_at<=period_end;
 select count(*)into ai_count from public.configuration_versions where organization_id=requested_organization_id and source='ai'and created_at>=trial.trial_start_date and created_at<=period_end;
 select count(*)into repeat_customers from(select sale.customer_id from public.sales_transactions sale where sale.organization_id=requested_organization_id and sale.customer_id is not null and sale.created_at>=trial.trial_start_date and sale.created_at<=period_end and sale.status not in('suspended','voided')group by sale.customer_id having count(*)>=2)repeat;
 average_ticket:=case when transactions_count>0 then round(sales_amount/transactions_count,2)else 0 end;

 select coalesce(jsonb_agg(jsonb_build_object('productName',ranked.product_name,'variantName',ranked.variant_name,'sku',ranked.sku,'unitsSold',ranked.units_sold)order by ranked.units_sold desc,ranked.product_name),'[]'::jsonb)into top_products from(
  select line.product_name,line.variant_name,line.sku,sum(greatest(line.quantity-line.returned_quantity,0))units_sold from public.sales_lines line join public.sales_transactions sale on sale.id=line.sale_id and sale.organization_id=line.organization_id
  where line.organization_id=requested_organization_id and sale.created_at>=trial.trial_start_date and sale.created_at<=period_end and sale.status not in('suspended','voided')group by line.product_name,line.variant_name,line.sku having sum(greatest(line.quantity-line.returned_quantity,0))>0 order by units_sold desc,line.product_name limit 5
 )ranked;
 select coalesce(jsonb_agg(jsonb_build_object('productName',ranked.product_name,'variantName',ranked.variant_name,'sku',ranked.sku,'quantityOnHand',ranked.quantity_on_hand,'unitsSold',ranked.units_sold)order by ranked.quantity_on_hand desc,ranked.product_name),'[]'::jsonb)into slow_products from(
  select product.name product_name,variant.name variant_name,variant.sku,coalesce(stock.quantity_on_hand,0)quantity_on_hand,coalesce(sold.units_sold,0)units_sold
  from public.product_variants variant join public.products product on product.id=variant.product_id and product.organization_id=variant.organization_id
  join public.inventory_items item on item.product_variant_id=variant.id and item.organization_id=variant.organization_id
  join lateral(select sum(balance.quantity)quantity_on_hand from public.stock_balances balance where balance.organization_id=item.organization_id and balance.inventory_item_id=item.id)stock on true
  left join lateral(select sum(greatest(line.quantity-line.returned_quantity,0))units_sold from public.sales_lines line join public.sales_transactions sale on sale.id=line.sale_id and sale.organization_id=line.organization_id where line.organization_id=variant.organization_id and line.product_variant_id=variant.id and sale.created_at>=trial.trial_start_date and sale.created_at<=period_end and sale.status not in('suspended','voided'))sold on true
  where variant.organization_id=requested_organization_id and variant.status='active'and product.status='active'and coalesce(stock.quantity_on_hand,0)>0 and coalesce(sold.units_sold,0)=0 order by quantity_on_hand desc,product.name limit 5
 )ranked;
 select coalesce(jsonb_agg(jsonb_build_object('description',description,'appliedAt',created_at)order by created_at desc),'[]'::jsonb)into ai_recommendations from public.configuration_versions where organization_id=requested_organization_id and source='ai'and created_at>=trial.trial_start_date and created_at<=period_end;

 features:=features||jsonb_build_array(jsonb_build_object('name','Business OS','activityCount',1,'evidence','Activated configuration'));
 if transactions_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','Sales / POS','activityCount',transactions_count,'evidence','Recorded transactions'));end if;
 if expense_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','Expenses','activityCount',expense_count,'evidence','Tracked expense records'));end if;
 if inventory_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','Inventory','activityCount',inventory_count,'evidence','Immutable stock movements'));end if;
 if customers_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','CRM','activityCount',customers_count,'evidence','Customer records added'));end if;
 if receivable_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','Receivables','activityCount',receivable_count,'evidence','Open invoices'));end if;
 if reports_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','Reports','activityCount',reports_count,'evidence','Unique report views'));end if;
 if ai_count>0 then features:=features||jsonb_build_array(jsonb_build_object('name','AI System Builder','activityCount',ai_count,'evidence','Approved configuration changes'));end if;

 if transactions_count>0 then insights:=insights||jsonb_build_array(jsonb_build_object('label','Average recorded transaction','value',average_ticket,'unit','PHP','evidence',transactions_count||' qualifying transactions'));end if;
 if repeat_customers>0 then insights:=insights||jsonb_build_array(jsonb_build_object('label','Repeat customers','value',repeat_customers,'unit','customers','evidence','At least two qualifying transactions during the trial'));end if;
 if low_stock_count>0 then insights:=insights||jsonb_build_array(jsonb_build_object('label','Items at or below threshold','value',low_stock_count,'unit','items','evidence','Current stock balances compared with configured thresholds'));end if;
 if receivable_amount>0 then insights:=insights||jsonb_build_array(jsonb_build_object('label','Current outstanding receivables','value',receivable_amount,'unit','PHP','evidence',receivable_count||' open invoices'));end if;

 if transactions_count=0 then improvements:=improvements||jsonb_build_array('Record completed sales consistently to establish a reliable sales trend.');end if;
 if expense_count=0 then improvements:=improvements||jsonb_build_array('Track operating expenses to compare costs with recorded sales.');end if;
 if customers_count=0 then improvements:=improvements||jsonb_build_array('Add customers to build purchase history and repeat-customer insights.');end if;
 if inventory_count=0 then improvements:=improvements||jsonb_build_array('Use stock movements for purchases, sales, counts, and adjustments when inventory is tracked.');end if;
 if low_stock_count>0 then improvements:=improvements||jsonb_build_array('Review items at or below their configured stock thresholds.');end if;
 if receivable_amount>0 then improvements:=improvements||jsonb_build_array('Follow up on open invoices and keep payment allocations current.');end if;
 if reports_count=0 then improvements:=improvements||jsonb_build_array('Review operational reports regularly so recorded activity informs decisions.');end if;
 if jsonb_array_length(slow_products)>0 then improvements:=improvements||jsonb_build_array('Review products with stock on hand and no recorded trial-period sales.');end if;
 if jsonb_array_length(improvements)=0 then improvements:=jsonb_build_array('Continue recording operations consistently to strengthen trend quality over time.');end if;

 return jsonb_build_object('generatedAt',generated_at,'periodStart',trial.trial_start_date,'periodEnd',period_end,'currency','PHP','trialStatus',trial.trial_status,
  'businessSetupCompleted',setup,'transactionsRecorded',transactions_count,'salesRecorded',sales_amount,
  'expensesTracked',jsonb_build_object('records',expense_count,'approvedAmount',expense_amount),
  'inventoryManaged',jsonb_build_object('stockMovements',inventory_count,'itemsAtOrBelowThreshold',low_stock_count),
  'customersAdded',customers_count,'mostPopularProducts',top_products,'slowMovingProducts',slow_products,
  'outstandingReceivables',jsonb_build_object('openInvoices',receivable_count,'amount',receivable_amount),
  'operationalInsights',insights,'aiRecommendations',ai_recommendations,'potentialAreasForImprovement',improvements,'systemFeaturesUsed',features,
  'methodology',jsonb_build_object('sales','Recorded transaction totals less recorded refunds during the report period. Suspended and voided transactions are excluded.','expenses','Record count excludes rejected and cancelled expenses; amount includes approved expenses only.','slowMoving','Active tracked products with stock on hand and no recorded units sold during the report period.','receivables','Current unpaid balance on issued, partially paid, and overdue invoices.'));
end$$;
revoke all on function public.get_business_trial_value_report(uuid)from public,anon;
grant execute on function public.get_business_trial_value_report(uuid)to authenticated;
comment on function public.get_business_trial_value_report(uuid)is'Calculates the 45-day transformation report solely from tenant records and documented formulas.';
