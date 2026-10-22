-- Module 18: suppliers, purchasing approvals, purchase orders, and atomic goods receiving.
insert into public.permissions(key,domain,action,description) values
  ('purchasing.read','purchasing','read','View suppliers and purchasing history'),
  ('purchasing.manage','purchasing','manage','Create suppliers, requests, purchase orders, and supplier invoices'),
  ('purchasing.receive','purchasing','receive','Receive purchase orders into branch inventory')
on conflict(key) do update set domain=excluded.domain,action=excluded.action,description=excluded.description;

create function private.install_purchasing_permissions(requested_organization_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.role_permissions(role_id,permission_id)
  select role.id,permission.id from public.roles role cross join public.permissions permission
  where role.organization_id=requested_organization_id and role.key in('owner','administrator') and permission.key like 'purchasing.%' on conflict do nothing;
  insert into public.role_permissions(role_id,permission_id)
  select role.id,permission.id from public.roles role join public.permissions permission on permission.key=any(
    case role.key when 'manager' then array['purchasing.read','purchasing.manage','purchasing.receive']
      when 'staff' then array['purchasing.read','purchasing.receive'] when 'viewer' then array['purchasing.read'] else array[]::text[] end)
  where role.organization_id=requested_organization_id and role.key in('manager','staff','viewer') on conflict do nothing;
end; $$;
create function private.handle_main_branch_purchasing_permissions() returns trigger language plpgsql security definer set search_path='' as $$begin if new.code='main' then perform private.install_purchasing_permissions(new.organization_id);end if;return new;end;$$;
create trigger zzzzz_install_purchasing_permissions_on_main_branch after insert on public.branches for each row execute function private.handle_main_branch_purchasing_permissions();
select private.install_purchasing_permissions(id) from public.organizations;

create table public.purchasing_document_counters(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check(document_type in('purchase_request','purchase_order','goods_receipt')),
  document_year integer not null, next_value bigint not null default 1 check(next_value>0),
  primary key(organization_id,document_type,document_year)
);
create table public.suppliers(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null, name text not null check(char_length(btrim(name)) between 1 and 180), contact_person text,
  mobile text, email text, address text, tax_id text, payment_terms_days integer not null default 30 check(payment_terms_days between 0 and 365),
  status text not null default 'active' check(status in('active','inactive')), notes text check(char_length(notes)<=2000),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), unique(organization_id,code)
);
create table public.purchase_requests(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null, request_number text not null, requested_by uuid not null references auth.users(id),
  needed_by date, purpose text not null check(char_length(btrim(purpose)) between 1 and 1000),
  status text not null default 'draft' check(status in('draft','pending_approval','approved','rejected','cancelled','converted')),
  approval_request_id uuid references public.approval_requests(id) on delete restrict,
  estimated_total numeric(16,4) not null default 0 check(estimated_total>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), unique(organization_id,request_number), unique(approval_request_id),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict
);
create table public.purchase_request_lines(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, purchase_request_id uuid not null,
  product_variant_id uuid not null, description text not null check(char_length(btrim(description)) between 1 and 500),
  quantity numeric(16,4) not null check(quantity>0), estimated_unit_cost numeric(16,4) not null check(estimated_unit_cost>=0), position integer not null check(position>=0),
  unique(purchase_request_id,product_variant_id), foreign key(purchase_request_id,organization_id) references public.purchase_requests(id,organization_id) on delete cascade,
  foreign key(product_variant_id,organization_id) references public.product_variants(id,organization_id) on delete restrict
);
create table public.purchase_orders(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null, supplier_id uuid not null, purchase_request_id uuid, order_number text not null,
  order_date date not null, expected_date date, status text not null default 'issued' check(status in('draft','issued','partially_received','received','cancelled')),
  supplier_reference text, notes text check(char_length(notes)<=2000), subtotal numeric(16,4) not null default 0 check(subtotal>=0),
  tax_total numeric(16,4) not null default 0 check(tax_total>=0), total numeric(16,4) not null default 0 check(total>=0),
  created_by uuid not null references auth.users(id), issued_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), unique(organization_id,order_number), unique(purchase_request_id),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(supplier_id,organization_id) references public.suppliers(id,organization_id) on delete restrict,
  foreign key(purchase_request_id,organization_id) references public.purchase_requests(id,organization_id) on delete restrict,
  check(expected_date is null or expected_date>=order_date)
);
create table public.purchase_order_lines(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, purchase_order_id uuid not null,
  product_variant_id uuid not null, description text not null, quantity_ordered numeric(16,4) not null check(quantity_ordered>0),
  quantity_received numeric(16,4) not null default 0 check(quantity_received>=0 and quantity_received<=quantity_ordered),
  unit_cost numeric(16,4) not null check(unit_cost>=0), tax_rate numeric(7,4) not null default 0 check(tax_rate between 0 and 100),
  subtotal numeric(16,4) not null check(subtotal>=0), tax_amount numeric(16,4) not null check(tax_amount>=0), total numeric(16,4) not null check(total>=0), position integer not null,
  unique(id,organization_id), unique(purchase_order_id,product_variant_id), foreign key(purchase_order_id,organization_id) references public.purchase_orders(id,organization_id) on delete cascade,
  foreign key(product_variant_id,organization_id) references public.product_variants(id,organization_id) on delete restrict
);
create table public.goods_receipts(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null, inventory_location_id uuid not null, purchase_order_id uuid not null, receipt_number text not null,
  received_at timestamptz not null, supplier_delivery_reference text, notes text check(char_length(notes)<=1000), idempotency_key text not null,
  received_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(id,organization_id), unique(organization_id,receipt_number), unique(organization_id,idempotency_key),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(inventory_location_id,organization_id) references public.inventory_locations(id,organization_id) on delete restrict,
  foreign key(purchase_order_id,organization_id) references public.purchase_orders(id,organization_id) on delete restrict
);
create table public.goods_receipt_lines(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, goods_receipt_id uuid not null, purchase_order_line_id uuid not null,
  inventory_item_id uuid not null, quantity_received numeric(16,4) not null check(quantity_received>0), unit_cost numeric(16,4) not null check(unit_cost>=0),
  unique(goods_receipt_id,purchase_order_line_id), foreign key(goods_receipt_id,organization_id) references public.goods_receipts(id,organization_id) on delete restrict,
  foreign key(purchase_order_line_id,organization_id) references public.purchase_order_lines(id,organization_id) on delete restrict,
  foreign key(inventory_item_id,organization_id) references public.inventory_items(id,organization_id) on delete restrict
);
create table public.supplier_invoices(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null, supplier_id uuid not null, purchase_order_id uuid, supplier_invoice_number text not null,
  invoice_date date not null, due_date date not null, status text not null default 'issued' check(status in('draft','issued','partially_paid','paid','cancelled')),
  subtotal numeric(16,4) not null check(subtotal>=0), tax_total numeric(16,4) not null default 0 check(tax_total>=0), total numeric(16,4) not null check(total>=0),
  notes text check(char_length(notes)<=2000), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), unique(organization_id,supplier_id,supplier_invoice_number),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(supplier_id,organization_id) references public.suppliers(id,organization_id) on delete restrict,
  foreign key(purchase_order_id,organization_id) references public.purchase_orders(id,organization_id) on delete restrict,
  check(due_date>=invoice_date and total=subtotal+tax_total)
);
create table public.purchasing_audit_history(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check(entity_type in('supplier','purchase_request','purchase_order','goods_receipt','supplier_invoice')),
  entity_id uuid not null, event text not null, actor_id uuid not null references auth.users(id), details jsonb not null default '{}', created_at timestamptz not null default now()
);

create index suppliers_name_idx on public.suppliers(organization_id,status,name);
create index purchase_requests_branch_status_idx on public.purchase_requests(organization_id,branch_id,status,created_at desc);
create index purchase_request_lines_request_idx on public.purchase_request_lines(purchase_request_id,position);
create index purchase_request_lines_variant_idx on public.purchase_request_lines(product_variant_id);
create index purchase_orders_branch_status_idx on public.purchase_orders(organization_id,branch_id,status,created_at desc);
create index purchase_orders_supplier_idx on public.purchase_orders(supplier_id,created_at desc);
create index purchase_order_lines_order_idx on public.purchase_order_lines(purchase_order_id,position);
create index purchase_order_lines_variant_idx on public.purchase_order_lines(product_variant_id);
create index goods_receipts_order_idx on public.goods_receipts(purchase_order_id,received_at desc);
create index goods_receipt_lines_receipt_idx on public.goods_receipt_lines(goods_receipt_id);
create index goods_receipt_lines_po_line_idx on public.goods_receipt_lines(purchase_order_line_id);
create index supplier_invoices_supplier_idx on public.supplier_invoices(supplier_id,invoice_date desc);
create index supplier_invoices_order_idx on public.supplier_invoices(purchase_order_id) where purchase_order_id is not null;
create index purchasing_audit_entity_idx on public.purchasing_audit_history(organization_id,entity_type,entity_id,created_at desc);
create trigger set_updated_at before update on public.suppliers for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.purchase_requests for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.purchase_orders for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.supplier_invoices for each row execute function private.set_updated_at();

create function private.purchasing_module_enabled(requested_organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id
    where module.organization_id=requested_organization_id and module.is_enabled and definition.key='purchasing');
$$;
create function private.can_read_purchase_request(requested_organization_id uuid,requested_purchase_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.purchasing_module_enabled(requested_organization_id) and exists(select 1 from public.purchase_requests request where request.id=requested_purchase_request_id and request.organization_id=requested_organization_id and private.can_business_permission(requested_organization_id,'purchasing.read',request.branch_id));
$$;
create function private.can_read_purchase_order(requested_organization_id uuid,requested_purchase_order_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.purchasing_module_enabled(requested_organization_id) and exists(select 1 from public.purchase_orders orders where orders.id=requested_purchase_order_id and orders.organization_id=requested_organization_id and private.can_business_permission(requested_organization_id,'purchasing.read',orders.branch_id));
$$;
create function private.can_read_goods_receipt(requested_organization_id uuid,requested_goods_receipt_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.purchasing_module_enabled(requested_organization_id) and exists(select 1 from public.goods_receipts receipt where receipt.id=requested_goods_receipt_id and receipt.organization_id=requested_organization_id and private.can_business_permission(requested_organization_id,'purchasing.read',receipt.branch_id));
$$;
create function private.next_purchasing_number(requested_organization_id uuid,requested_type text) returns text language plpgsql security definer set search_path='' as $$
declare year_value integer:=extract(year from current_date);number_value bigint;prefix text;
begin
  if requested_type not in('purchase_request','purchase_order','goods_receipt') then raise exception 'Invalid purchasing document type.' using errcode='22023';end if;
  insert into public.purchasing_document_counters(organization_id,document_type,document_year,next_value) values(requested_organization_id,requested_type,year_value,2)
  on conflict(organization_id,document_type,document_year) do update set next_value=public.purchasing_document_counters.next_value+1 returning next_value-1 into number_value;
  if number_value is null then number_value:=1;end if;prefix:=case requested_type when 'purchase_request' then 'PR' when 'purchase_order' then 'PO' else 'GR' end;
  return prefix||'-'||year_value||'-'||lpad(number_value::text,6,'0');
end; $$;

create function private.save_supplier(requested_organization_id uuid,requested_supplier_id uuid,requested_name text,requested_contact_person text,requested_mobile text,requested_email text,requested_address text,requested_tax_id text,requested_payment_terms_days integer,requested_status text,requested_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());target_id uuid:=coalesce(requested_supplier_id,gen_random_uuid());supplier_code text;
begin
  if actor is null or not private.purchasing_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'purchasing.manage',null) then raise exception 'Permission denied.' using errcode='42501';end if;
  if char_length(btrim(requested_name)) not between 1 and 180 or requested_payment_terms_days not between 0 and 365 or requested_status not in('active','inactive') or char_length(coalesce(requested_notes,''))>2000 then raise exception 'Invalid supplier.' using errcode='22023';end if;
  if requested_supplier_id is not null then select code into supplier_code from public.suppliers where id=target_id and organization_id=requested_organization_id;if supplier_code is null then raise exception 'Supplier not found.' using errcode='22023';end if;else supplier_code:='SUP-'||upper(substr(replace(target_id::text,'-',''),1,8));end if;
  insert into public.suppliers(id,organization_id,code,name,contact_person,mobile,email,address,tax_id,payment_terms_days,status,notes,created_by)
  values(target_id,requested_organization_id,supplier_code,btrim(requested_name),nullif(btrim(requested_contact_person),''),nullif(btrim(requested_mobile),''),nullif(lower(btrim(requested_email)),''),nullif(btrim(requested_address),''),nullif(btrim(requested_tax_id),''),requested_payment_terms_days,requested_status,nullif(btrim(requested_notes),''),actor)
  on conflict(id) do update set name=excluded.name,contact_person=excluded.contact_person,mobile=excluded.mobile,email=excluded.email,address=excluded.address,tax_id=excluded.tax_id,payment_terms_days=excluded.payment_terms_days,status=excluded.status,notes=excluded.notes;
  insert into public.purchasing_audit_history(organization_id,entity_type,entity_id,event,actor_id,details) values(requested_organization_id,'supplier',target_id,case when requested_supplier_id is null then 'created' else 'updated' end,actor,'{}');return target_id;
end; $$;

create function private.save_purchase_request(requested_organization_id uuid,requested_branch_id uuid,requested_needed_by date,requested_purpose text,requested_lines jsonb,requested_submit boolean,requested_require_approval boolean,requested_approver_role_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());target_id uuid:=gen_random_uuid();request_number text;item jsonb;position_value integer:=0;estimated_total_value numeric:=0;approval_id uuid;target_status text;
begin
  if actor is null or not private.purchasing_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'purchasing.manage',requested_branch_id) then raise exception 'Permission denied.' using errcode='42501';end if;
  if not exists(select 1 from public.branches where id=requested_branch_id and organization_id=requested_organization_id and is_active) or char_length(btrim(requested_purpose)) not between 1 and 1000 or jsonb_typeof(requested_lines)<>'array' or jsonb_array_length(requested_lines) not between 1 and 200 then raise exception 'Invalid purchase request.' using errcode='22023';end if;
  if requested_require_approval and (requested_approver_role_key is null or not exists(select 1 from public.roles where organization_id=requested_organization_id and key=requested_approver_role_key)) then raise exception 'Approver role not found.' using errcode='22023';end if;
  request_number:=private.next_purchasing_number(requested_organization_id,'purchase_request');target_status:=case when not requested_submit then 'draft' when requested_require_approval then 'pending_approval' else 'approved' end;
  insert into public.purchase_requests(id,organization_id,branch_id,request_number,requested_by,needed_by,purpose,status) values(target_id,requested_organization_id,requested_branch_id,request_number,actor,requested_needed_by,btrim(requested_purpose),target_status);
  for item in select value from jsonb_array_elements(requested_lines) loop
    if item-array['productVariantId','description','quantity','estimatedUnitCost']::text[]<>'{}'::jsonb or not(item?&array['productVariantId','description','quantity','estimatedUnitCost']) or (item->>'quantity')::numeric<=0 or (item->>'estimatedUnitCost')::numeric<0 or not exists(select 1 from public.product_variants where id=(item->>'productVariantId')::uuid and organization_id=requested_organization_id and status='active') then raise exception 'Invalid purchase request line.' using errcode='22023';end if;
    insert into public.purchase_request_lines(organization_id,purchase_request_id,product_variant_id,description,quantity,estimated_unit_cost,position) values(requested_organization_id,target_id,(item->>'productVariantId')::uuid,btrim(item->>'description'),(item->>'quantity')::numeric,(item->>'estimatedUnitCost')::numeric,position_value);
    estimated_total_value:=estimated_total_value+(item->>'quantity')::numeric*(item->>'estimatedUnitCost')::numeric;position_value:=position_value+1;
  end loop;
  update public.purchase_requests set estimated_total=round(estimated_total_value,4) where id=target_id;
  if target_status='pending_approval' then approval_id:=private.create_approval_request(requested_organization_id,'purchase','Approve '||request_number,requested_purpose,null,null,null,jsonb_build_array(jsonb_build_object('key','purchase_review','name','Purchase request review','approverRoleKey',requested_approver_role_key)));update public.purchase_requests set approval_request_id=approval_id where id=target_id;end if;
  insert into public.purchasing_audit_history(organization_id,entity_type,entity_id,event,actor_id,details) values(requested_organization_id,'purchase_request',target_id,case when target_status='draft' then 'created' else 'submitted' end,actor,jsonb_build_object('status',target_status,'total',estimated_total_value));return target_id;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid purchase request data.' using errcode='22023';end; $$;

create function private.sync_purchase_approval() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status='pending' and new.status in('approved','rejected','cancelled') then
    update public.purchase_requests set status=case new.status when 'approved' then 'approved' when 'rejected' then 'rejected' else 'cancelled' end where approval_request_id=new.id and status='pending_approval';
    insert into public.purchasing_audit_history(organization_id,entity_type,entity_id,event,actor_id,details)
    select request.organization_id,'purchase_request',request.id,'approval_'||new.status,coalesce(new.cancelled_by,request.requested_by),jsonb_build_object('approvalRequestId',new.id)
    from public.purchase_requests request where request.approval_request_id=new.id;
  end if;return new;
end; $$;
create trigger sync_purchase_request_approval after update of status on public.approval_requests for each row execute function private.sync_purchase_approval();

create function private.create_purchase_order(requested_organization_id uuid,requested_purchase_request_id uuid,requested_supplier_id uuid,requested_order_date date,requested_expected_date date,requested_supplier_reference text,requested_notes text,requested_tax_rate numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());request_row public.purchase_requests%rowtype;target_id uuid:=gen_random_uuid();order_number text;line public.purchase_request_lines%rowtype;subtotal_value numeric:=0;tax_value numeric:=0;line_subtotal numeric;line_tax numeric;
begin
  select * into request_row from public.purchase_requests where id=requested_purchase_request_id and organization_id=requested_organization_id for update;
  if actor is null or not private.purchasing_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'purchasing.manage',request_row.branch_id) then raise exception 'Permission denied.' using errcode='42501';end if;
  if request_row.id is null or request_row.status<>'approved' or requested_tax_rate not between 0 and 100 or (requested_expected_date is not null and requested_expected_date<requested_order_date) or not exists(select 1 from public.suppliers where id=requested_supplier_id and organization_id=requested_organization_id and status='active') then raise exception 'Purchase request cannot be ordered.' using errcode='P0001';end if;
  order_number:=private.next_purchasing_number(requested_organization_id,'purchase_order');
  insert into public.purchase_orders(id,organization_id,branch_id,supplier_id,purchase_request_id,order_number,order_date,expected_date,status,supplier_reference,notes,created_by,issued_at)
  values(target_id,requested_organization_id,request_row.branch_id,requested_supplier_id,request_row.id,order_number,requested_order_date,requested_expected_date,'issued',nullif(btrim(requested_supplier_reference),''),nullif(btrim(requested_notes),''),actor,now());
  for line in select * from public.purchase_request_lines where purchase_request_id=request_row.id order by position loop
    line_subtotal:=round(line.quantity*line.estimated_unit_cost,4);line_tax:=round(line_subtotal*requested_tax_rate/100,4);
    insert into public.purchase_order_lines(organization_id,purchase_order_id,product_variant_id,description,quantity_ordered,unit_cost,tax_rate,subtotal,tax_amount,total,position)
    values(requested_organization_id,target_id,line.product_variant_id,line.description,line.quantity,line.estimated_unit_cost,requested_tax_rate,line_subtotal,line_tax,line_subtotal+line_tax,line.position);
    subtotal_value:=subtotal_value+line_subtotal;tax_value:=tax_value+line_tax;
  end loop;
  update public.purchase_orders set subtotal=subtotal_value,tax_total=tax_value,total=subtotal_value+tax_value where id=target_id;update public.purchase_requests set status='converted' where id=request_row.id;
  insert into public.purchasing_audit_history(organization_id,entity_type,entity_id,event,actor_id,details) values(requested_organization_id,'purchase_order',target_id,'issued',actor,jsonb_build_object('requestId',request_row.id,'total',subtotal_value+tax_value));return target_id;
end; $$;

create function private.receive_purchase_order(requested_organization_id uuid,requested_purchase_order_id uuid,requested_location_id uuid,requested_received_at timestamptz,requested_supplier_delivery_reference text,requested_notes text,requested_idempotency_key text,requested_lines jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());order_row public.purchase_orders%rowtype;target_id uuid;receipt_number text;item jsonb;order_line public.purchase_order_lines%rowtype;inventory_item_id uuid;received_qty numeric;received_cost numeric;
begin
  select id into target_id from public.goods_receipts where organization_id=requested_organization_id and idempotency_key=requested_idempotency_key;if found then return target_id;end if;
  select * into order_row from public.purchase_orders where id=requested_purchase_order_id and organization_id=requested_organization_id for update;
  if actor is null or not private.purchasing_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'purchasing.receive',order_row.branch_id) then raise exception 'Permission denied.' using errcode='42501';end if;
  if order_row.id is null or order_row.status not in('issued','partially_received') or char_length(btrim(requested_idempotency_key)) not between 8 and 200 or jsonb_typeof(requested_lines)<>'array' or jsonb_array_length(requested_lines) not between 1 and 200 or not exists(select 1 from public.inventory_locations where id=requested_location_id and organization_id=requested_organization_id and branch_id=order_row.branch_id and is_active) then raise exception 'Invalid goods receipt.' using errcode='22023';end if;
  if (select count(distinct value->>'purchaseOrderLineId') from jsonb_array_elements(requested_lines))<>jsonb_array_length(requested_lines) then raise exception 'Duplicate receipt line.' using errcode='22023';end if;
  perform 1 from public.purchase_order_lines where purchase_order_id=order_row.id and id in(select(value->>'purchaseOrderLineId')::uuid from jsonb_array_elements(requested_lines)) order by id for update;
  target_id:=gen_random_uuid();receipt_number:=private.next_purchasing_number(requested_organization_id,'goods_receipt');
  insert into public.goods_receipts(id,organization_id,branch_id,inventory_location_id,purchase_order_id,receipt_number,received_at,supplier_delivery_reference,notes,idempotency_key,received_by)
  values(target_id,requested_organization_id,order_row.branch_id,requested_location_id,order_row.id,receipt_number,requested_received_at,nullif(btrim(requested_supplier_delivery_reference),''),nullif(btrim(requested_notes),''),requested_idempotency_key,actor);
  for item in select value from jsonb_array_elements(requested_lines) order by value->>'purchaseOrderLineId' loop
    if item-array['purchaseOrderLineId','quantity','unitCost']::text[]<>'{}'::jsonb or not(item?&array['purchaseOrderLineId','quantity','unitCost']) then raise exception 'Invalid receipt line.' using errcode='22023';end if;
    select * into order_line from public.purchase_order_lines where id=(item->>'purchaseOrderLineId')::uuid and purchase_order_id=order_row.id and organization_id=requested_organization_id for update;
    received_qty:=(item->>'quantity')::numeric;received_cost:=(item->>'unitCost')::numeric;
    if order_line.id is null or received_qty<=0 or received_cost<0 or received_qty>order_line.quantity_ordered-order_line.quantity_received then raise exception 'Receipt exceeds outstanding quantity.' using errcode='P0001';end if;
    insert into public.inventory_items(organization_id,product_variant_id,is_tracked) values(requested_organization_id,order_line.product_variant_id,true) on conflict(organization_id,product_variant_id) do nothing;
    select id into inventory_item_id from public.inventory_items where organization_id=requested_organization_id and product_variant_id=order_line.product_variant_id and is_tracked;
    if inventory_item_id is null then raise exception 'Product is not inventory tracked.' using errcode='P0001';end if;
    insert into public.goods_receipt_lines(organization_id,goods_receipt_id,purchase_order_line_id,inventory_item_id,quantity_received,unit_cost) values(requested_organization_id,target_id,order_line.id,inventory_item_id,received_qty,received_cost);
    perform private.post_stock_movement(requested_organization_id,inventory_item_id,requested_location_id,'purchase',received_qty,received_cost,null,null,'goods_receipt',target_id,requested_notes,'goods-receipt:'||target_id||':'||order_line.id,actor);
    update public.purchase_order_lines set quantity_received=quantity_received+received_qty,unit_cost=received_cost,subtotal=round(quantity_ordered*received_cost,4),tax_amount=round(quantity_ordered*received_cost*tax_rate/100,4),total=round(quantity_ordered*received_cost*(1+tax_rate/100),4) where id=order_line.id;
    update public.product_variants set cost_price=received_cost where id=order_line.product_variant_id and organization_id=requested_organization_id;
  end loop;
  update public.purchase_orders set status=case when not exists(select 1 from public.purchase_order_lines where purchase_order_id=order_row.id and quantity_received<quantity_ordered) then 'received' else 'partially_received' end,
    subtotal=(select sum(subtotal) from public.purchase_order_lines where purchase_order_id=order_row.id),tax_total=(select sum(tax_amount) from public.purchase_order_lines where purchase_order_id=order_row.id),total=(select sum(total) from public.purchase_order_lines where purchase_order_id=order_row.id) where id=order_row.id;
  insert into public.purchasing_audit_history(organization_id,entity_type,entity_id,event,actor_id,details) values(requested_organization_id,'goods_receipt',target_id,'received',actor,jsonb_build_object('purchaseOrderId',order_row.id,'locationId',requested_location_id));return target_id;
exception when unique_violation then select id into target_id from public.goods_receipts where organization_id=requested_organization_id and idempotency_key=requested_idempotency_key;if target_id is null then raise;end if;return target_id;when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid receipt data.' using errcode='22023';end; $$;

create function private.save_supplier_invoice(requested_organization_id uuid,requested_branch_id uuid,requested_supplier_id uuid,requested_purchase_order_id uuid,requested_invoice_number text,requested_invoice_date date,requested_due_date date,requested_subtotal numeric,requested_tax_total numeric,requested_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());target_id uuid:=gen_random_uuid();
begin
  if actor is null or not private.purchasing_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'purchasing.manage',requested_branch_id) then raise exception 'Permission denied.' using errcode='42501';end if;
  if char_length(btrim(requested_invoice_number)) not between 1 and 120 or requested_due_date<requested_invoice_date or requested_subtotal<0 or requested_tax_total<0 or not exists(select 1 from public.suppliers where id=requested_supplier_id and organization_id=requested_organization_id) or (requested_purchase_order_id is not null and not exists(select 1 from public.purchase_orders where id=requested_purchase_order_id and organization_id=requested_organization_id and branch_id=requested_branch_id and supplier_id=requested_supplier_id)) then raise exception 'Invalid supplier invoice.' using errcode='22023';end if;
  insert into public.supplier_invoices(id,organization_id,branch_id,supplier_id,purchase_order_id,supplier_invoice_number,invoice_date,due_date,status,subtotal,tax_total,total,notes,created_by)
  values(target_id,requested_organization_id,requested_branch_id,requested_supplier_id,requested_purchase_order_id,btrim(requested_invoice_number),requested_invoice_date,requested_due_date,'issued',requested_subtotal,requested_tax_total,requested_subtotal+requested_tax_total,nullif(btrim(requested_notes),''),actor);
  insert into public.purchasing_audit_history(organization_id,entity_type,entity_id,event,actor_id,details) values(requested_organization_id,'supplier_invoice',target_id,'recorded',actor,jsonb_build_object('supplierId',requested_supplier_id,'total',requested_subtotal+requested_tax_total));return target_id;
end; $$;

create function public.save_supplier(requested_organization_id uuid,requested_supplier_id uuid,requested_name text,requested_contact_person text,requested_mobile text,requested_email text,requested_address text,requested_tax_id text,requested_payment_terms_days integer,requested_status text,requested_notes text) returns uuid language sql security definer set search_path='' as $$select private.save_supplier(requested_organization_id,requested_supplier_id,requested_name,requested_contact_person,requested_mobile,requested_email,requested_address,requested_tax_id,requested_payment_terms_days,requested_status,requested_notes);$$;
create function public.save_purchase_request(requested_organization_id uuid,requested_branch_id uuid,requested_needed_by date,requested_purpose text,requested_lines jsonb,requested_submit boolean,requested_require_approval boolean,requested_approver_role_key text) returns uuid language sql security definer set search_path='' as $$select private.save_purchase_request(requested_organization_id,requested_branch_id,requested_needed_by,requested_purpose,requested_lines,requested_submit,requested_require_approval,requested_approver_role_key);$$;
create function public.create_purchase_order(requested_organization_id uuid,requested_purchase_request_id uuid,requested_supplier_id uuid,requested_order_date date,requested_expected_date date,requested_supplier_reference text,requested_notes text,requested_tax_rate numeric) returns uuid language sql security definer set search_path='' as $$select private.create_purchase_order(requested_organization_id,requested_purchase_request_id,requested_supplier_id,requested_order_date,requested_expected_date,requested_supplier_reference,requested_notes,requested_tax_rate);$$;
create function public.receive_purchase_order(requested_organization_id uuid,requested_purchase_order_id uuid,requested_location_id uuid,requested_received_at timestamptz,requested_supplier_delivery_reference text,requested_notes text,requested_idempotency_key text,requested_lines jsonb) returns uuid language sql security definer set search_path='' as $$select private.receive_purchase_order(requested_organization_id,requested_purchase_order_id,requested_location_id,requested_received_at,requested_supplier_delivery_reference,requested_notes,requested_idempotency_key,requested_lines);$$;
create function public.save_supplier_invoice(requested_organization_id uuid,requested_branch_id uuid,requested_supplier_id uuid,requested_purchase_order_id uuid,requested_invoice_number text,requested_invoice_date date,requested_due_date date,requested_subtotal numeric,requested_tax_total numeric,requested_notes text) returns uuid language sql security definer set search_path='' as $$select private.save_supplier_invoice(requested_organization_id,requested_branch_id,requested_supplier_id,requested_purchase_order_id,requested_invoice_number,requested_invoice_date,requested_due_date,requested_subtotal,requested_tax_total,requested_notes);$$;

alter table public.suppliers enable row level security;alter table public.purchase_requests enable row level security;alter table public.purchase_request_lines enable row level security;alter table public.purchase_orders enable row level security;alter table public.purchase_order_lines enable row level security;alter table public.goods_receipts enable row level security;alter table public.goods_receipt_lines enable row level security;alter table public.supplier_invoices enable row level security;alter table public.purchasing_audit_history enable row level security;
create policy suppliers_read on public.suppliers for select to authenticated using((select private.purchasing_module_enabled(organization_id)) and private.can_business_permission(organization_id,'purchasing.read',null));
create policy purchase_requests_read on public.purchase_requests for select to authenticated using((select private.purchasing_module_enabled(organization_id)) and private.can_business_permission(organization_id,'purchasing.read',branch_id));
create policy purchase_request_lines_read on public.purchase_request_lines for select to authenticated using(private.can_read_purchase_request(organization_id,purchase_request_id));
create policy purchase_orders_read on public.purchase_orders for select to authenticated using((select private.purchasing_module_enabled(organization_id)) and private.can_business_permission(organization_id,'purchasing.read',branch_id));
create policy purchase_order_lines_read on public.purchase_order_lines for select to authenticated using(private.can_read_purchase_order(organization_id,purchase_order_id));
create policy goods_receipts_read on public.goods_receipts for select to authenticated using((select private.purchasing_module_enabled(organization_id)) and private.can_business_permission(organization_id,'purchasing.read',branch_id));
create policy goods_receipt_lines_read on public.goods_receipt_lines for select to authenticated using(private.can_read_goods_receipt(organization_id,goods_receipt_id));
create policy supplier_invoices_read on public.supplier_invoices for select to authenticated using((select private.purchasing_module_enabled(organization_id)) and private.can_business_permission(organization_id,'purchasing.read',branch_id));
create policy purchasing_audit_read on public.purchasing_audit_history for select to authenticated using((select private.purchasing_module_enabled(organization_id)) and private.can_business_permission(organization_id,'purchasing.read',null));

revoke all on table public.purchasing_document_counters,public.suppliers,public.purchase_requests,public.purchase_request_lines,public.purchase_orders,public.purchase_order_lines,public.goods_receipts,public.goods_receipt_lines,public.supplier_invoices,public.purchasing_audit_history from public,anon,authenticated;
grant select on table public.suppliers,public.purchase_requests,public.purchase_request_lines,public.purchase_orders,public.purchase_order_lines,public.goods_receipts,public.goods_receipt_lines,public.supplier_invoices,public.purchasing_audit_history to authenticated;
revoke all on function private.install_purchasing_permissions(uuid),private.handle_main_branch_purchasing_permissions(),private.purchasing_module_enabled(uuid),private.can_read_purchase_request(uuid,uuid),private.can_read_purchase_order(uuid,uuid),private.can_read_goods_receipt(uuid,uuid),private.next_purchasing_number(uuid,text),private.save_supplier(uuid,uuid,text,text,text,text,text,text,integer,text,text),private.save_purchase_request(uuid,uuid,date,text,jsonb,boolean,boolean,text),private.sync_purchase_approval(),private.create_purchase_order(uuid,uuid,uuid,date,date,text,text,numeric),private.receive_purchase_order(uuid,uuid,uuid,timestamptz,text,text,text,jsonb),private.save_supplier_invoice(uuid,uuid,uuid,uuid,text,date,date,numeric,numeric,text) from public,anon,authenticated;
grant execute on function private.purchasing_module_enabled(uuid),private.can_read_purchase_request(uuid,uuid),private.can_read_purchase_order(uuid,uuid),private.can_read_goods_receipt(uuid,uuid) to authenticated;
revoke all on function public.save_supplier(uuid,uuid,text,text,text,text,text,text,integer,text,text),public.save_purchase_request(uuid,uuid,date,text,jsonb,boolean,boolean,text),public.create_purchase_order(uuid,uuid,uuid,date,date,text,text,numeric),public.receive_purchase_order(uuid,uuid,uuid,timestamptz,text,text,text,jsonb),public.save_supplier_invoice(uuid,uuid,uuid,uuid,text,date,date,numeric,numeric,text) from public,anon;
grant execute on function public.save_supplier(uuid,uuid,text,text,text,text,text,text,integer,text,text),public.save_purchase_request(uuid,uuid,date,text,jsonb,boolean,boolean,text),public.create_purchase_order(uuid,uuid,uuid,date,date,text,text,numeric),public.receive_purchase_order(uuid,uuid,uuid,timestamptz,text,text,text,jsonb),public.save_supplier_invoice(uuid,uuid,uuid,uuid,text,date,date,numeric,numeric,text) to authenticated;

comment on table public.goods_receipts is 'Immutable evidence of physical receipt; only this aggregate posts purchasing stock movements.';
comment on table public.purchase_orders is 'Commercial commitment only; issuing a purchase order never changes inventory.';
