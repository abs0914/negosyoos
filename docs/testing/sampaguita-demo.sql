-- Local marketing fixture. Fictional records only. Run with psql ON_ERROR_STOP=1.
-- Requires explicit -v commit_demo=true to persist; otherwise rolls back.
-- Scoped to the existing Sampaguita local test business; refuses a second seed.
\set ON_ERROR_STOP on
begin;
set local timezone = 'Asia/Manila';
select pg_advisory_xact_lock(hashtext('sampaguita-marketing-demo-v1'));
do $$ begin
  if not exists(select 1 from public.organizations where id='caf9a6e0-79e0-43c7-bce9-5a550d9cdc46' and display_name='Sampaguita Test Store' and email='store@negosyo.example') then
    raise exception 'Expected local demo business not found';
  end if;
  if exists(select 1 from public.products where organization_id='caf9a6e0-79e0-43c7-bce9-5a550d9cdc46') then
    raise exception 'Demo already populated or catalog changed; refusing to duplicate records';
  end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','6ac00442-b6cf-4ad1-8a8e-8581b798b02b',true);
select set_config('request.jwt.claims','{"sub":"6ac00442-b6cf-4ad1-8a8e-8581b798b02b","role":"authenticated"}',true);
create temporary table demo_products(n integer primary key,name text,price numeric,cost numeric,unit text,category text,variant uuid,item uuid);
insert into demo_products(n,name,price,cost,unit,category) values
 (1,'Portland cement 40 kg',285,228,'bag','Building essentials'),
 (2,'Concrete hollow block 4 inch',18,12,'piece','Building essentials'),
 (3,'Deformed steel bar 10 mm',195,150,'piece','Building essentials'),
 (4,'Common wire nails 2 inch',95,65,'kg','Building essentials'),
 (5,'Interior latex paint white 4 L',680,490,'can','Paint and finishing'),
 (6,'Paint roller kit 9 inch',165,105,'set','Paint and finishing'),
 (7,'Paint brush 2 inch',55,30,'piece','Paint and finishing'),
 (8,'Sandpaper assorted grit',18,8,'sheet','Paint and finishing'),
 (9,'LED bulb daylight 9 W',95,55,'piece','Electrical'),
 (10,'Extension cord 3 metres',245,160,'piece','Electrical'),
 (11,'Electrical tape black',25,12,'roll','Electrical'),
 (12,'Duplex convenience outlet',85,48,'piece','Electrical'),
 (13,'PVC pipe 1/2 inch',95,62,'length','Plumbing'),
 (14,'PVC elbow 1/2 inch',12,6,'piece','Plumbing'),
 (15,'Teflon thread seal tape',18,8,'roll','Plumbing'),
 (16,'Brass garden faucet',185,120,'piece','Plumbing'),
 (17,'Garden hose 10 metres',350,230,'roll','Home and garden'),
 (18,'Heavy-duty pail 16 L',145,90,'piece','Home and garden'),
 (19,'Hand broom and dustpan set',125,75,'set','Home and garden'),
 (20,'Work gloves cotton pair',35,18,'pair','Safety and tools'),
 (21,'Claw hammer 16 oz',225,145,'piece','Safety and tools'),
 (22,'Measuring tape 5 metres',135,80,'piece','Safety and tools'),
 (23,'Clear silicone sealant 300 ml',165,105,'tube','Paint and finishing'),
 (24,'Adjustable wrench 10 inch',295,190,'piece','Safety and tools');
create temporary table demo_customers(n integer primary key,id uuid);
create temporary table demo_suppliers(n integer primary key,id uuid);
create temporary table demo_sales(n integer primary key,id uuid);
do $$
declare
 org constant uuid := 'caf9a6e0-79e0-43c7-bce9-5a550d9cdc46';
 branch constant uuid := 'a3bbe781-80b7-48a0-9788-a212bd43233f';
 shop constant uuid := '67b22e46-bad0-4b92-85af-64af6ba33f24';
 warehouse uuid; category_id uuid; target_product uuid; variant_id uuid; item_id uuid;
 customer_id uuid; supplier_id uuid; request_id uuid; order_id uuid; line_id uuid; invoice_id uuid; delivery_id uuid;
 driver_id uuid; expense_category uuid; record_id uuid;
 r record; i integer; j integer; units integer; opening integer; final_stock integer;
 lines jsonb; amount numeric; invoice_amount numeric; customer_names text[];
 supplier_names text[]; methods text[] := array['cash','digital','cash','digital'];
begin
 warehouse := public.save_inventory_location(org,null,branch,'demo_warehouse','Demo warehouse','warehouse',true);
 for r in select distinct category from demo_products loop
   category_id := public.save_product_category(org,null,r.category,'Fictional marketing demo category','active');
   for i in select n from demo_products where category=r.category order by n loop
     select * into r from demo_products where n=i;
     target_product := public.save_catalog_product(org,null,null,'product',r.name,'Fictional sample product for the Sampaguita marketing demo.',category_id,null,case when r.unit in ('piece','box','pack','kg','gram','liter','meter') then r.unit else 'piece' end,r.price,r.cost,'exempt',0,'active',false,
       jsonb_build_array(jsonb_build_object('name','Default','sku','DEMO-'||lpad(i::text,3,'0'),'barcode','','attributes','{}'::jsonb,'status','active')),'[]');
     select id into variant_id from public.product_variants where product_id=target_product;
     item_id := public.configure_inventory_item(org,null,variant_id,5,15,true);
     update demo_products set variant=variant_id,item=item_id where n=i;
     -- Opening stock covers today's exact planned sales plus the desired remainder.
     opening := 0;
     for j in 1..32 loop
       if (j-1)%23+1=i then opening:=opening+(j%3+1); end if;
       if (j+6)%23+1=i then opening:=opening+2; end if;
     end loop;
     final_stock := case when i=24 then 0 when i>=21 then 25-i else 30+i*2 end;
     if opening+final_stock>0 then
       perform public.record_stock_movement(org,item_id,shop,'opening_balance',opening+final_stock,r.cost,'Fictional demo opening stock','demo-v1-opening-shop-'||i);
     end if;
     perform public.record_stock_movement(org,item_id,warehouse,'opening_balance',40+i,r.cost,'Fictional demo warehouse opening stock','demo-v1-opening-warehouse-'||i);
   end loop;
 end loop;
 customer_names:=array['Luningning Home Projects','Mabini Repair Crew','Dalisay Garden Studio','Amihan Mini Mart','Malaya Building Services','Tala Home Improvements','Ligaya Community Kitchen','Silangan Property Care','Hiraya Workshop','Sinag Neighborhood Cafe','Alon Electrical Services','Sibol Plumbing Works'];
 for i in 1..12 loop
   customer_id:=public.save_crm_customer(org,null,branch,customer_names[i],'0900090'||lpad(i::text,4,'0'),'demo.customer'||i||'@negosyo.example',jsonb_build_object('line1',i||' Demo Lane (fictional)','city','Quezon City','province','Metro Manila'),null,customer_names[i],case when i<=4 then 'wholesale' else 'retail' end,array['Demo','Hardware'], 'Fictional marketing demo customer. No real person or business; do not contact.');
   insert into demo_customers values(i,customer_id);
 end loop;
 supplier_names:=array['Luntian Building Supply — Demo','Silahis Electrical Depot — Demo','Habi Paint and Tools — Demo','Bukal Plumbing Wholesale — Demo'];
 for i in 1..4 loop
   supplier_id:=public.save_supplier(org,null,supplier_names[i],'Demo supplier contact','0900000100'||i,'demo.supplier'||i||'@negosyo.example','Demo Supply Road, Quezon City (fictional)','',30,'active','Fictional supplier for marketing demonstrations. Do not contact.');
   insert into demo_suppliers values(i,supplier_id);
 end loop;
 for i in 1..32 loop
   select jsonb_agg(jsonb_build_object('productVariantId',p.variant,'quantity',case when p.n=(i-1)%23+1 then i%3+1 else 2 end,'discountAmount',0)),sum(p.price*case when p.n=(i-1)%23+1 then i%3+1 else 2 end)
     into lines,amount from demo_products p where p.n in ((i-1)%23+1,(i+6)%23+1);
   select id into customer_id from demo_customers where n=(i-1)%12+1;
   record_id:=public.save_pos_transaction(org,null,branch,shop,customer_id,'completed',gen_random_uuid(),now(),lines,
      jsonb_build_array(jsonb_build_object('method',methods[(i-1)%4+1],'amount',amount,'reference',case when i%4=1 then '' else 'DEMO-PAY-'||i end)));
   insert into demo_sales values(i,record_id);
 end loop;
 -- Two incoming orders, a partial receipt, a complete receipt, and a pending approval.
 for i in 1..5 loop
   select * into r from demo_products where n=case when i<=2 then 20+i else i end;
   request_id:=public.save_purchase_request(org,branch,current_date+3,'Demo restock: '||r.name,
     jsonb_build_array(jsonb_build_object('productVariantId',r.variant,'description',r.name,'quantity',20,'estimatedUnitCost',r.cost)),true,i=5,'manager');
   if i<=4 then
     select id into supplier_id from demo_suppliers where n=i;
     order_id:=public.create_purchase_order(org,request_id,supplier_id,current_date,current_date+2,'DEMO-QUOTE-'||i,'Fictional demo supplier order; no external order placed.',0);
     if i>=3 then
       select id into line_id from public.purchase_order_lines where purchase_order_id=order_id;
       perform public.receive_purchase_order(org,order_id,warehouse,now(),'DEMO-DR-'||i,'Fictional demo goods received.','demo-v1-receipt-'||i,
         jsonb_build_array(jsonb_build_object('purchaseOrderLineId',line_id,'quantity',case when i=3 then 8 else 20 end,'unitCost',r.cost)));
       perform public.save_supplier_invoice(org,branch,supplier_id,order_id,'DEMO-SI-'||i,current_date,current_date+30,r.cost*case when i=3 then 8 else 20 end,0,'Fictional invoice for the quantity received.');
     end if;
   end if;
 end loop;
 -- Historical opening trade balances are separate from today's fully paid POS receipts.
 for i in 1..5 loop
   select id into customer_id from demo_customers where n=i;
   invoice_amount:=case i when 1 then 8500 when 2 then 4200 when 3 then 6250 when 4 then 3200 else 1750 end;
   invoice_id:=public.save_invoice(org,null,branch,customer_id,current_date-case when i<=2 then 45 else 5 end,current_date+case when i=1 then -15 when i=2 then -7 else 15 end,
     'Fictional opening trade account balance. Separate from today''s POS sales; no new stock dispatch.',
     jsonb_build_array(jsonb_build_object('description','Demo opening trade account balance','productVariantId','','sku','','unit','account','quantity',1,'unitPrice',invoice_amount,'discountAmount',0,'taxRate',0)),true);
   if i in (2,4,5) then
     amount:=case i when 2 then 1200 when 4 then 1000 else invoice_amount end;
     perform public.record_ar_payment(org,branch,customer_id,current_date,'bank_transfer','DEMO-AR-'||i,amount,
       jsonb_build_array(jsonb_build_object('invoiceId',invoice_id,'amount',amount)),'demo-v1-ar-'||i);
   end if;
 end loop;
 perform public.refresh_overdue_invoices(org);
 select id into driver_id from public.delivery_drivers where organization_id=org and status='active' limit 1;
 for i in 1..5 loop
   select id into customer_id from demo_customers where n=i;
   select id into record_id from demo_sales where n=i;
   delivery_id:=public.save_delivery(org,branch,customer_id,i||' Demo Lane, Quezon City (fictional)','0900090'||lpad(i::text,4,'0'),record_id,
     now()+case when i=2 then interval '-1 day' else interval '1 day' end,'Demo delivery van','internal');
   if i>=2 then perform public.change_delivery_status(org,delivery_id,'scheduled','Fictional demo delivery scheduled.'); end if;
   if i>=3 then
     perform public.assign_delivery_driver(org,delivery_id,driver_id,'Demo delivery van');
     perform public.change_delivery_status(org,delivery_id,'out_for_delivery','Fictional dispatch for demonstration; no actual vehicle tracking.');
   end if;
   if i=4 then perform public.change_delivery_status(org,delivery_id,'failed','Demo scenario: recipient unavailable; arrange another delivery.'); end if;
   if i=5 then perform public.change_delivery_status(org,delivery_id,'failed','Demo scenario: address needs confirmation.'); end if;
 end loop;
 for i in 1..3 loop
   select id into customer_id from demo_customers where n=i+5;
   select * into r from demo_products where n=i;
   perform public.save_quotation(org,null,branch,customer_id,current_date+14,'Fictional demo project estimate.','Demo only; subject to stock availability.','6ac00442-b6cf-4ad1-8a8e-8581b798b02b',
     jsonb_build_array(jsonb_build_object('productVariantId',r.variant,'quantity',20,'unitPrice',r.price,'discountAmount',case when i=3 then r.price*3 else 0 end)),i=3);
 end loop;
 for i in 1..6 loop
   select id into expense_category from public.expense_categories where organization_id=org and name=(array['Rent','Utilities','Transport','Marketing','Supplies','Repairs'])[i];
   perform public.save_expense(org,null,current_date-(i-1)*3,expense_category,branch,'Demo operating payee '||i,(array[18000,2450,850,1500,625,1200])[i], 'bank_transfer','Fictional operating expense for the marketing demo.',true,'demo-v1-expense-'||i);
 end loop;
 for r in select l.approval_request_id,s.id as step_id from public.expenses e
   join public.expense_approval_links l on l.expense_id=e.id
   join public.approval_steps s on s.approval_request_id=l.approval_request_id
   where e.organization_id=org and e.idempotency_key in ('demo-v1-expense-1','demo-v1-expense-2','demo-v1-expense-3','demo-v1-expense-4') and e.approval_status='pending'
 loop
   perform public.decide_approval(org,r.approval_request_id,r.step_id,'approved','Approved fictional demo expense.');
 end loop;
 if (select count(*) from demo_sales)<>32 then raise exception 'Expected 32 receipts'; end if;
 if exists(select 1 from public.stock_balances where organization_id=org and quantity<0) then raise exception 'Negative stock'; end if;
 if exists(select 1 from demo_products p left join public.stock_balances b on b.inventory_item_id=p.item and b.location_id=shop
   where coalesce(b.quantity,0)<>case when p.n=24 then 0 when p.n>=21 then 25-p.n else 30+p.n*2 end) then
   raise exception 'Shop balances do not reconcile with sales';
 end if;
 if (select sum(balance_due) from public.invoices where organization_id=org)<>19950 then raise exception 'Receivables do not reconcile'; end if;
 if (select sum(balance_due) from public.invoices where organization_id=org and due_date<current_date)<>11500 then raise exception 'Overdue balances do not reconcile'; end if;
 if exists(select 1 from public.sales_transactions s join demo_sales d on d.id=s.id where s.amount_paid-s.change_amount<>s.total) then raise exception 'Receipt payments do not reconcile'; end if;
 raise notice 'Demo populated: 24 products, 12 new customers, 4 suppliers, 32 receipts, 5 purchase requests, 5 invoices, 5 deliveries, 3 quotations, 6 expenses.';
end $$;
select count(*) as receipts,sum(s.total) as receipt_total,round(avg(s.total),2) as average_sale from public.sales_transactions s join demo_sales d on d.id=s.id;
select status,count(*) from public.purchase_orders where organization_id='caf9a6e0-79e0-43c7-bce9-5a550d9cdc46' group by status;
select status,count(*),sum(balance_due) as balance_due from public.invoices where organization_id='caf9a6e0-79e0-43c7-bce9-5a550d9cdc46' group by status;
select status,count(*) from public.deliveries where organization_id='caf9a6e0-79e0-43c7-bce9-5a550d9cdc46' group by status;
select approval_status,count(*),sum(amount) from public.expenses where organization_id='caf9a6e0-79e0-43c7-bce9-5a550d9cdc46' group by approval_status;
\if :{?commit_demo}
\if :commit_demo
commit;
\else
rollback;
\endif
\else
rollback;
\endif
