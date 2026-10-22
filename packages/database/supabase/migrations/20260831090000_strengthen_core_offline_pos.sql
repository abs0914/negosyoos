-- Strengthen Core: enrolled registers, durable POS commands, reconciliation, and offline replay.

insert into public.permissions(key,domain,action,description) values
('sales.reconcile','sales','reconcile','Resolve POS payment, stock, and register reconciliation cases')
on conflict(key) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select role.id,permission.id
from public.roles role
join public.permissions permission on permission.key='sales.reconcile'
where role.key in('owner','administrator','manager')
on conflict do nothing;

create table public.pos_registers(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  inventory_location_id uuid not null,
  code text not null check(code ~ '^[A-Z0-9][A-Z0-9-]{0,31}$'),
  name text not null check(char_length(btrim(name)) between 1 and 120),
  status text not null default 'active' check(status in('active','revoked')),
  enrolled_by uuid not null references auth.users(id),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,organization_id),
  unique(organization_id,branch_id,code),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(inventory_location_id,organization_id) references public.inventory_locations(id,organization_id) on delete restrict
);

create table public.pos_register_sessions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  register_id uuid not null,
  branch_id uuid not null,
  inventory_location_id uuid not null,
  cashier_id uuid not null references auth.users(id),
  client_session_id uuid not null,
  status text not null default 'open' check(status in('open','closed','reconciled')),
  opening_cash numeric(16,4) not null default 0 check(opening_cash>=0),
  expected_cash numeric(16,4) not null default 0,
  actual_cash numeric(16,4),
  cash_variance numeric(16,4),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(id,organization_id),
  unique(organization_id,client_session_id),
  foreign key(register_id,organization_id) references public.pos_registers(id,organization_id) on delete restrict,
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(inventory_location_id,organization_id) references public.inventory_locations(id,organization_id) on delete restrict
);
create unique index pos_register_one_open_session_idx on public.pos_register_sessions(register_id) where status='open';
create index pos_register_sessions_business_recent_idx on public.pos_register_sessions(organization_id,branch_id,opened_at desc);

create table public.pos_offline_leases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  register_id uuid not null,
  register_session_id uuid not null,
  user_id uuid not null references auth.users(id),
  token_hash text not null unique,
  allowed_commands text[] not null default array['sale.complete','register.close']::text[],
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check(expires_at>issued_at and expires_at<=issued_at+interval '24 hours 5 minutes'),
  unique(id,organization_id),
  foreign key(register_id,organization_id) references public.pos_registers(id,organization_id) on delete cascade,
  foreign key(register_session_id,organization_id) references public.pos_register_sessions(id,organization_id) on delete cascade
);
create index pos_offline_leases_active_idx on public.pos_offline_leases(organization_id,register_id,expires_at) where revoked_at is null;

create table public.pos_document_sequences(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  document_type text not null check(document_type in('pos_receipt')),
  next_number bigint not null default 1 check(next_number>0),
  updated_at timestamptz not null default now(),
  primary key(organization_id,branch_id,document_type),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete cascade
);

create table public.pos_commands(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  command_id uuid not null,
  schema_version integer not null check(schema_version between 1 and 100),
  command_type text not null check(command_type in('sale.complete','register.close')),
  payload_hash text not null,
  branch_id uuid not null,
  register_id uuid not null,
  register_session_id uuid not null,
  actor_user_id uuid not null references auth.users(id),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  mode text not null check(mode in('online','offline')),
  status text not null default 'processing' check(status in('processing','applied','rejected','quarantined')),
  provisional_receipt_number text,
  result jsonb,
  error_code text,
  error_message text,
  applied_at timestamptz,
  unique(organization_id,command_id),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(register_id,organization_id) references public.pos_registers(id,organization_id) on delete restrict,
  foreign key(register_session_id,organization_id) references public.pos_register_sessions(id,organization_id) on delete restrict
);
create index pos_commands_sync_queue_idx on public.pos_commands(organization_id,status,received_at);
create index pos_commands_register_recent_idx on public.pos_commands(organization_id,register_id,occurred_at desc);

create table public.pos_reconciliation_cases(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  register_id uuid,
  register_session_id uuid,
  sale_id uuid,
  payment_id uuid,
  command_id uuid,
  case_type text not null check(case_type in('payment_verification','payment_failed','negative_stock','register_variance','command_quarantine','ledger_mismatch')),
  severity text not null default 'warning' check(severity in('info','warning','critical')),
  status text not null default 'open' check(status in('open','resolved','dismissed')),
  summary text not null check(char_length(btrim(summary)) between 1 and 500),
  details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object'),
  resolution text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,organization_id),
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  foreign key(register_id,organization_id) references public.pos_registers(id,organization_id) on delete restrict,
  foreign key(register_session_id,organization_id) references public.pos_register_sessions(id,organization_id) on delete restrict,
  foreign key(sale_id,organization_id) references public.sales_transactions(id,organization_id) on delete restrict,
  foreign key(payment_id) references public.sales_payments(id) on delete restrict
);
create index pos_reconciliation_open_idx on public.pos_reconciliation_cases(organization_id,status,severity,created_at) where status='open';
create index pos_reconciliation_sale_idx on public.pos_reconciliation_cases(sale_id) where sale_id is not null;

create table public.payment_verification_history(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null references public.sales_payments(id) on delete restrict,
  from_status text not null,
  to_status text not null,
  reason text not null check(char_length(btrim(reason)) between 1 and 500),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index payment_verification_payment_idx on public.payment_verification_history(payment_id,created_at);

alter table public.sales_transactions
  add column register_id uuid,
  add column register_session_id uuid,
  add column command_id uuid,
  add column provisional_receipt_number text,
  add constraint sales_transactions_register_fk foreign key(register_id,organization_id) references public.pos_registers(id,organization_id) on delete restrict,
  add constraint sales_transactions_register_session_fk foreign key(register_session_id,organization_id) references public.pos_register_sessions(id,organization_id) on delete restrict;
create unique index sales_transactions_command_idx on public.sales_transactions(organization_id,command_id) where command_id is not null;
create unique index sales_transactions_provisional_idx on public.sales_transactions(organization_id,provisional_receipt_number) where provisional_receipt_number is not null;

alter table public.sales_payments drop constraint if exists sales_payments_status_check;
alter table public.sales_payments
  add column provider text,
  add column verified_at timestamptz,
  add column verification_note text,
  add constraint sales_payments_id_organization_unique unique(id,organization_id);
update public.sales_payments set status='verified',verified_at=created_at where status='recorded';
alter table public.sales_payments alter column status set default 'verified';
alter table public.sales_payments add constraint sales_payments_status_check check(status in('pending_verification','verified','failed','refunded'));

alter table public.pos_reconciliation_cases
  drop constraint pos_reconciliation_cases_payment_id_fkey,
  add constraint pos_reconciliation_payment_tenant_fk foreign key(payment_id,organization_id) references public.sales_payments(id,organization_id) on delete restrict;
alter table public.payment_verification_history
  drop constraint payment_verification_history_payment_id_fkey,
  add constraint payment_verification_payment_tenant_fk foreign key(payment_id,organization_id) references public.sales_payments(id,organization_id) on delete restrict;

create trigger set_updated_at before update on public.pos_registers for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.pos_reconciliation_cases for each row execute function private.set_updated_at();

create function private.reject_payment_verification_history_mutation() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'Payment verification history is immutable.' using errcode='P0001'; end;
$$;
create trigger payment_verification_history_immutable before update or delete on public.payment_verification_history
for each row execute function private.reject_payment_verification_history_mutation();

create function private.next_pos_receipt_number(requested_organization_id uuid,requested_branch_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare allocated bigint;branch_code text;
begin
  select upper(code) into branch_code from public.branches where id=requested_branch_id and organization_id=requested_organization_id;
  if branch_code is null then raise exception 'Branch not found.' using errcode='22023';end if;
  insert into public.pos_document_sequences(organization_id,branch_id,document_type,next_number)
  values(requested_organization_id,requested_branch_id,'pos_receipt',2)
  on conflict(organization_id,branch_id,document_type) do update
  set next_number=public.pos_document_sequences.next_number+1,updated_at=now()
  returning next_number-1 into allocated;
  return 'POS-'||branch_code||'-'||lpad(allocated::text,8,'0');
end;
$$;

create function private.open_reconciliation_case(
  requested_organization_id uuid,requested_branch_id uuid,requested_register_id uuid,
  requested_session_id uuid,requested_sale_id uuid,requested_payment_id uuid,
  requested_command_id uuid,requested_case_type text,requested_severity text,
  requested_summary text,requested_details jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
  insert into public.pos_reconciliation_cases(organization_id,branch_id,register_id,register_session_id,sale_id,payment_id,command_id,case_type,severity,summary,details)
  values(requested_organization_id,requested_branch_id,requested_register_id,requested_session_id,requested_sale_id,requested_payment_id,requested_command_id,requested_case_type,requested_severity,requested_summary,coalesce(requested_details,'{}'::jsonb))
  returning id into target_id;
  return target_id;
end;
$$;

create or replace function private.post_stock_movement(requested_organization_id uuid,requested_inventory_item_id uuid,requested_location_id uuid,requested_movement_type text,requested_quantity_delta numeric,requested_unit_cost numeric,requested_transfer_id uuid,requested_adjustment_id uuid,requested_reference_type text,requested_reference_id uuid,requested_notes text,requested_idempotency_key text,requested_actor uuid)returns uuid language plpgsql security definer set search_path='' as $$
declare target_id uuid;balance_row public.stock_balances%rowtype;next_quantity numeric;next_average numeric;allow_negative boolean:=false;
begin
  select id into target_id from public.stock_movements where organization_id=requested_organization_id and idempotency_key=requested_idempotency_key;
  if found then return target_id;end if;
  if requested_movement_type not in('purchase','sale','return','adjustment','transfer_in','transfer_out','opening_balance','wastage')or requested_quantity_delta=0 or requested_unit_cost<0 or not exists(select 1 from public.inventory_items where id=requested_inventory_item_id and organization_id=requested_organization_id and is_tracked)or not exists(select 1 from public.inventory_locations where id=requested_location_id and organization_id=requested_organization_id and is_active)then raise exception'Invalid stock movement.'using errcode='22023';end if;
  perform set_config('app.inventory_projection_write','on',true);
  insert into public.stock_balances(organization_id,inventory_item_id,location_id) values(requested_organization_id,requested_inventory_item_id,requested_location_id) on conflict(organization_id,inventory_item_id,location_id)do nothing;
  select*into balance_row from public.stock_balances where organization_id=requested_organization_id and inventory_item_id=requested_inventory_item_id and location_id=requested_location_id for update;
  next_quantity:=balance_row.quantity+requested_quantity_delta;
  select coalesce((module.config->>'allow_negative_stock')::boolean,false) into allow_negative from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id where module.organization_id=requested_organization_id and module.is_enabled and definition.key='inventory';
  allow_negative:=coalesce(allow_negative,false) or coalesce(current_setting('app.offline_sale',true),'off')='on';
  if next_quantity<0 and not allow_negative then raise exception'Insufficient stock.'using errcode='P0001';end if;
  next_average:=case when requested_quantity_delta>0 and next_quantity>0 then round(((balance_row.quantity*balance_row.average_unit_cost)+(requested_quantity_delta*requested_unit_cost))/next_quantity,4)else balance_row.average_unit_cost end;
  insert into public.stock_movements(organization_id,inventory_item_id,location_id,movement_type,quantity_delta,unit_cost,balance_after,transfer_id,adjustment_id,reference_type,reference_id,notes,idempotency_key,created_by) values(requested_organization_id,requested_inventory_item_id,requested_location_id,requested_movement_type,requested_quantity_delta,requested_unit_cost,next_quantity,requested_transfer_id,requested_adjustment_id,requested_reference_type,requested_reference_id,nullif(btrim(requested_notes),''),requested_idempotency_key,requested_actor) returning id into target_id;
  update public.stock_balances set quantity=next_quantity,average_unit_cost=next_average,last_movement_at=now(),updated_at=now() where id=balance_row.id;
  perform set_config('app.inventory_projection_write','off',true);
  return target_id;
exception when unique_violation then
  select id into target_id from public.stock_movements where organization_id=requested_organization_id and idempotency_key=requested_idempotency_key;
  if target_id is null then raise;end if;return target_id;
end;
$$;

create function private.bootstrap_pos_register(
  requested_organization_id uuid,requested_register_id uuid,requested_branch_id uuid,
  requested_inventory_location_id uuid,requested_device_name text,requested_client_session_id uuid,
  requested_opening_cash numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());register_row public.pos_registers%rowtype;session_row public.pos_register_sessions%rowtype;raw_token text;expires timestamptz:=now()+interval '24 hours';register_code text;
begin
  if actor is null or not private.pos_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'sales.create',requested_branch_id) then raise exception 'Permission denied.' using errcode='42501';end if;
  if requested_opening_cash<0 or char_length(btrim(requested_device_name)) not between 1 and 120 or not exists(select 1 from public.inventory_locations where id=requested_inventory_location_id and organization_id=requested_organization_id and branch_id=requested_branch_id and is_active) then raise exception 'Invalid register enrollment.' using errcode='22023';end if;
  register_code:='R-'||upper(substr(replace(requested_register_id::text,'-',''),1,8));
  insert into public.pos_registers(id,organization_id,branch_id,inventory_location_id,code,name,enrolled_by,last_seen_at)
  values(requested_register_id,requested_organization_id,requested_branch_id,requested_inventory_location_id,register_code,btrim(requested_device_name),actor,now())
  on conflict(id) do update set last_seen_at=now(),name=excluded.name
  returning * into register_row;
  if register_row.organization_id<>requested_organization_id or register_row.branch_id<>requested_branch_id or register_row.inventory_location_id<>requested_inventory_location_id or register_row.status<>'active' then raise exception 'Register scope mismatch.' using errcode='42501';end if;
  select * into session_row from public.pos_register_sessions where register_id=register_row.id and status='open' for update;
  if session_row.id is null then
    insert into public.pos_register_sessions(organization_id,register_id,branch_id,inventory_location_id,cashier_id,client_session_id,opening_cash,expected_cash)
    values(requested_organization_id,register_row.id,requested_branch_id,requested_inventory_location_id,actor,requested_client_session_id,requested_opening_cash,requested_opening_cash)
    returning * into session_row;
  elsif session_row.cashier_id<>actor then raise exception 'Register already has an open session.' using errcode='P0001';end if;
  update public.pos_offline_leases set revoked_at=now() where organization_id=requested_organization_id and register_id=register_row.id and user_id=actor and revoked_at is null;
  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.pos_offline_leases(organization_id,register_id,register_session_id,user_id,token_hash,expires_at)
  values(requested_organization_id,register_row.id,session_row.id,actor,encode(extensions.digest(raw_token,'sha256'),'hex'),expires);
  return jsonb_build_object('registerId',register_row.id,'registerCode',register_row.code,'registerName',register_row.name,'sessionId',session_row.id,'sessionStatus',session_row.status,'openingCash',session_row.opening_cash,'leaseToken',raw_token,'leaseExpiresAt',expires,'issuedAt',now());
end;
$$;

create function private.process_pos_command(
  requested_organization_id uuid,requested_command_id uuid,requested_schema_version integer,
  requested_register_id uuid,requested_session_id uuid,requested_occurred_at timestamptz,
  requested_mode text,requested_lease_token text,requested_payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());payload_hash text;existing public.pos_commands%rowtype;register_row public.pos_registers%rowtype;session_row public.pos_register_sessions%rowtype;lease_row public.pos_offline_leases%rowtype;command_type text;branch uuid;location uuid;provisional text;target_sale_id uuid;receipt text;payment_record public.sales_payments%rowtype;negative_count integer:=0;command_result jsonb;reported_actual_cash numeric;calculated_expected_cash numeric;
begin
  payload_hash:=encode(extensions.digest(requested_payload::text,'sha256'),'hex');
  select * into existing from public.pos_commands where organization_id=requested_organization_id and command_id=requested_command_id;
  if existing.id is not null then
    if existing.payload_hash<>payload_hash then raise exception 'Command identifier was reused with a different payload.' using errcode='P0001';end if;
    return coalesce(existing.result,'{}'::jsonb)||jsonb_build_object('status','duplicate');
  end if;
  command_type:=requested_payload->>'type';branch:=nullif(requested_payload->>'branchId','')::uuid;location:=nullif(requested_payload->>'inventoryLocationId','')::uuid;provisional:=nullif(requested_payload->>'provisionalReceiptNumber','');
  if actor is null or requested_schema_version<>1 or requested_mode not in('online','offline') or command_type not in('sale.complete','register.close') or jsonb_typeof(requested_payload)<>'object' then raise exception 'Invalid POS command.' using errcode='22023';end if;
  select * into register_row from public.pos_registers where id=requested_register_id and organization_id=requested_organization_id for update;
  select * into session_row from public.pos_register_sessions where id=requested_session_id and organization_id=requested_organization_id for update;
  if register_row.id is null or register_row.status<>'active' or session_row.id is null or session_row.register_id<>register_row.id or session_row.cashier_id<>actor or session_row.status<>'open' or branch<>register_row.branch_id or location<>register_row.inventory_location_id or not private.can_business_permission(requested_organization_id,'sales.create',branch) then raise exception 'POS command scope is not authorized.' using errcode='42501';end if;
  if requested_occurred_at>now()+interval '5 minutes' or requested_occurred_at<now()-interval '30 days' then raise exception 'POS command time is invalid.' using errcode='22023';end if;
  if requested_mode='offline' then
    select * into lease_row from public.pos_offline_leases where organization_id=requested_organization_id and register_id=requested_register_id and register_session_id=requested_session_id and user_id=actor and token_hash=encode(extensions.digest(coalesce(requested_lease_token,''),'sha256'),'hex') for update;
    if lease_row.id is null or lease_row.revoked_at is not null or requested_occurred_at<lease_row.issued_at or requested_occurred_at>lease_row.expires_at or not(command_type=any(lease_row.allowed_commands)) then raise exception 'Offline authorization is invalid or expired.' using errcode='42501';end if;
    update public.pos_offline_leases set last_used_at=now() where id=lease_row.id;
  end if;
  insert into public.pos_commands(organization_id,command_id,schema_version,command_type,payload_hash,branch_id,register_id,register_session_id,actor_user_id,occurred_at,mode,provisional_receipt_number)
  values(requested_organization_id,requested_command_id,requested_schema_version,command_type,payload_hash,branch,requested_register_id,requested_session_id,actor,requested_occurred_at,requested_mode,provisional);
  if command_type='sale.complete' then
    if provisional is null or provisional !~ '^OFF-[A-Z0-9-]{1,32}-R-[A-F0-9]{8}-[0-9]{6,}$' then raise exception 'Invalid provisional receipt number.' using errcode='22023';end if;
    if requested_mode='offline' then perform set_config('app.offline_sale','on',true);end if;
    target_sale_id:=private.save_pos_transaction(requested_organization_id,null,branch,location,nullif(requested_payload->>'customerId','')::uuid,'completed',requested_command_id,requested_occurred_at,requested_payload->'lines',requested_payload->'payments');
    receipt:=private.next_pos_receipt_number(requested_organization_id,branch);
    update public.sales_transactions set receipt_number=receipt,register_id=requested_register_id,register_session_id=requested_session_id,command_id=requested_command_id,provisional_receipt_number=provisional where id=target_sale_id;
    for payment_record in select p.* from public.sales_payments p where p.sale_id=target_sale_id loop
      if payment_record.payment_method='cash' or requested_mode='online' then
        update public.sales_payments set status='verified',verified_at=now(),provider=case when payment_record.payment_method='digital'then'manual_digital'else null end where id=payment_record.id;
      else
        update public.sales_payments set status='pending_verification',provider=coalesce(nullif(payment_record.reference,''),'manual_digital') where id=payment_record.id;
        perform private.open_reconciliation_case(requested_organization_id,branch,requested_register_id,requested_session_id,target_sale_id,payment_record.id,requested_command_id,'payment_verification','warning','Offline digital payment requires verification',jsonb_build_object('amount',payment_record.amount,'method',payment_record.payment_method));
      end if;
    end loop;
    if requested_mode='offline' then
      select count(*) into negative_count from public.sales_lines line join public.stock_balances balance on balance.organization_id=line.organization_id and balance.inventory_item_id=line.inventory_item_id and balance.location_id=location where line.sale_id=target_sale_id and balance.quantity<0;
      if negative_count>0 then perform private.open_reconciliation_case(requested_organization_id,branch,requested_register_id,requested_session_id,target_sale_id,null,requested_command_id,'negative_stock','critical','Offline sale produced negative stock',jsonb_build_object('negativeItemCount',negative_count));end if;
    end if;
    command_result:=jsonb_build_object('status','applied','commandId',requested_command_id,'saleId',target_sale_id,'receiptNumber',receipt,'provisionalReceiptNumber',provisional,'paymentStatus',case when requested_mode='offline' and exists(select 1 from public.sales_payments p where p.sale_id=target_sale_id and p.payment_method='digital') then 'pending_verification' else 'verified' end,'reconciliationRequired',negative_count>0 or exists(select 1 from public.sales_payments p where p.sale_id=target_sale_id and p.status='pending_verification'));
  else
    reported_actual_cash:=(requested_payload->>'actualCash')::numeric;
    if reported_actual_cash<0 then raise exception 'Actual cash cannot be negative.' using errcode='22023';end if;
    select session_row.opening_cash+coalesce(sum(p.amount),0) into calculated_expected_cash from public.sales_payments p join public.sales_transactions sale on sale.id=p.sale_id where sale.register_session_id=session_row.id and p.payment_method='cash' and p.status='verified';
    update public.pos_register_sessions set status='closed',expected_cash=calculated_expected_cash,actual_cash=reported_actual_cash,cash_variance=reported_actual_cash-calculated_expected_cash,closed_at=now() where id=session_row.id;
    if reported_actual_cash<>calculated_expected_cash then perform private.open_reconciliation_case(requested_organization_id,branch,requested_register_id,requested_session_id,null,null,requested_command_id,'register_variance',case when abs(reported_actual_cash-calculated_expected_cash)>=100 then'critical'else'warning'end,'Register close has a cash variance',jsonb_build_object('expectedCash',calculated_expected_cash,'actualCash',reported_actual_cash,'variance',reported_actual_cash-calculated_expected_cash));end if;
    command_result:=jsonb_build_object('status','applied','commandId',requested_command_id,'sessionId',session_row.id,'expectedCash',calculated_expected_cash,'actualCash',reported_actual_cash,'cashVariance',reported_actual_cash-calculated_expected_cash,'reconciliationRequired',reported_actual_cash<>calculated_expected_cash);
  end if;
  update public.pos_commands set status='applied',result=command_result,applied_at=now() where organization_id=requested_organization_id and command_id=requested_command_id;
  update public.pos_registers set last_seen_at=now() where id=requested_register_id;
  perform private.write_audit_event(requested_organization_id,branch,actor,'pos_command_applied','pos_commands',requested_command_id::text,null,jsonb_build_object('commandType',command_type,'mode',requested_mode,'status','applied'),'api',null);
  return command_result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid POS command data.' using errcode='22023';
end;
$$;

create function private.resolve_pos_reconciliation_case(requested_organization_id uuid,requested_case_id uuid,requested_resolution text,requested_disposition text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());case_row public.pos_reconciliation_cases%rowtype;payment_row public.sales_payments%rowtype;next_status text;
begin
  select * into case_row from public.pos_reconciliation_cases where id=requested_case_id and organization_id=requested_organization_id for update;
  if actor is null or case_row.id is null or not private.can_business_permission(requested_organization_id,'sales.reconcile',case_row.branch_id) then raise exception 'Permission denied.' using errcode='42501';end if;
  if case_row.status<>'open' or char_length(btrim(requested_resolution)) not between 1 and 500 or requested_disposition not in('verified','failed','resolved','dismissed') then raise exception 'Invalid reconciliation resolution.' using errcode='22023';end if;
  if case_row.payment_id is not null and requested_disposition in('verified','failed') then
    select * into payment_row from public.sales_payments where id=case_row.payment_id for update;
    next_status:=requested_disposition;
    insert into public.payment_verification_history(organization_id,payment_id,from_status,to_status,reason,actor_id) values(requested_organization_id,payment_row.id,payment_row.status,next_status,btrim(requested_resolution),actor);
    update public.sales_payments set status=next_status,verified_at=case when next_status='verified'then now()else verified_at end,verification_note=btrim(requested_resolution) where id=payment_row.id;
  end if;
  update public.pos_reconciliation_cases set status=case when requested_disposition='dismissed'then'dismissed'else'resolved'end,resolution=btrim(requested_resolution),resolved_by=actor,resolved_at=now() where id=case_row.id;
  perform private.write_audit_event(requested_organization_id,case_row.branch_id,actor,'reconciliation_resolved','pos_reconciliation_cases',case_row.id::text,null,jsonb_build_object('disposition',requested_disposition,'caseType',case_row.case_type),'user',null);
end;
$$;

create function public.bootstrap_pos_register(requested_organization_id uuid,requested_register_id uuid,requested_branch_id uuid,requested_inventory_location_id uuid,requested_device_name text,requested_client_session_id uuid,requested_opening_cash numeric)
returns jsonb language sql security definer set search_path='' as $$select private.bootstrap_pos_register(requested_organization_id,requested_register_id,requested_branch_id,requested_inventory_location_id,requested_device_name,requested_client_session_id,requested_opening_cash);$$;
create function public.process_pos_command(requested_organization_id uuid,requested_command_id uuid,requested_schema_version integer,requested_register_id uuid,requested_session_id uuid,requested_occurred_at timestamptz,requested_mode text,requested_lease_token text,requested_payload jsonb)
returns jsonb language sql security definer set search_path='' as $$select private.process_pos_command(requested_organization_id,requested_command_id,requested_schema_version,requested_register_id,requested_session_id,requested_occurred_at,requested_mode,requested_lease_token,requested_payload);$$;
create function public.resolve_pos_reconciliation_case(requested_organization_id uuid,requested_case_id uuid,requested_resolution text,requested_disposition text)
returns void language sql security definer set search_path='' as $$select private.resolve_pos_reconciliation_case(requested_organization_id,requested_case_id,requested_resolution,requested_disposition);$$;

create function public.pos_operations_dashboard(requested_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if(select auth.uid())is null or not private.can_business_permission(requested_organization_id,'audit.read',null)then raise exception'Permission denied.'using errcode='42501';end if;
  return jsonb_build_object(
    'openReconciliationCases',(select count(*)from public.pos_reconciliation_cases where organization_id=requested_organization_id and status='open'),
    'criticalCases',(select count(*)from public.pos_reconciliation_cases where organization_id=requested_organization_id and status='open'and severity='critical'),
    'pendingDigitalPayments',(select count(*)from public.sales_payments payment join public.sales_transactions sale on sale.id=payment.sale_id where sale.organization_id=requested_organization_id and payment.status='pending_verification'),
    'openRegisterSessions',(select count(*)from public.pos_register_sessions where organization_id=requested_organization_id and status='open'),
    'failedCommands',(select count(*)from public.pos_commands where organization_id=requested_organization_id and status in('rejected','quarantined')),
    'oldestOpenCaseAt',(select min(created_at)from public.pos_reconciliation_cases where organization_id=requested_organization_id and status='open')
  );
end;
$$;

create function public.pos_catalog_snapshot(requested_organization_id uuid,requested_location_id uuid,requested_known_revision text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare requested_branch_id uuid;revision text;items jsonb;
begin
  select branch_id into requested_branch_id from public.inventory_locations where id=requested_location_id and organization_id=requested_organization_id and is_active;
  if(select auth.uid())is null or requested_branch_id is null or not private.pos_module_enabled(requested_organization_id) or not private.can_business_permission(requested_organization_id,'sales.read',requested_branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
  select coalesce(to_char(max(changed_at)at time zone'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'empty') into revision
  from(
    select max(updated_at)changed_at from public.products where organization_id=requested_organization_id
    union all select max(updated_at)from public.product_variants where organization_id=requested_organization_id
    union all select max(updated_at)from public.inventory_items where organization_id=requested_organization_id
    union all select max(updated_at)from public.stock_balances where organization_id=requested_organization_id and location_id=requested_location_id
  )changes;
  if requested_known_revision=revision then return jsonb_build_object('revision',revision,'notModified',true,'items','[]'::jsonb);end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',variant.id,'productId',product.id,'name',product.name,'variantName',variant.name,'sku',variant.sku,
    'barcode',variant.barcode,'unit',coalesce(variant.unit,product.default_unit),'price',coalesce(variant.selling_price,product.selling_price),
    'taxType',product.tax_type,'taxRate',product.tax_rate,
    'availableQuantity',case when inventory.is_tracked then coalesce(balance.quantity,0)else null end
  )order by lower(product.name),lower(variant.name),variant.id),'[]'::jsonb) into items
  from public.product_variants variant
  join public.products product on product.id=variant.product_id and product.organization_id=variant.organization_id and product.status='active'
  left join public.inventory_items inventory on inventory.organization_id=variant.organization_id and inventory.product_variant_id=variant.id
  left join public.stock_balances balance on balance.organization_id=variant.organization_id and balance.inventory_item_id=inventory.id and balance.location_id=requested_location_id
  where variant.organization_id=requested_organization_id and variant.status='active' and(product.branch_id is null or product.branch_id=requested_branch_id);
  if jsonb_array_length(items)>20000 then raise exception'POS catalog exceeds the supported 20,000 item snapshot.'using errcode='P0001';end if;
  return jsonb_build_object('revision',revision,'notModified',false,'items',items);
end;
$$;

alter table public.pos_registers enable row level security;
alter table public.pos_register_sessions enable row level security;
alter table public.pos_offline_leases enable row level security;
alter table public.pos_document_sequences enable row level security;
alter table public.pos_commands enable row level security;
alter table public.pos_reconciliation_cases enable row level security;
alter table public.payment_verification_history enable row level security;

create policy pos_registers_read on public.pos_registers for select to authenticated using(private.can_business_permission(organization_id,'sales.read',branch_id));
create policy pos_register_sessions_read on public.pos_register_sessions for select to authenticated using(private.can_business_permission(organization_id,'sales.read',branch_id));
create policy pos_commands_read on public.pos_commands for select to authenticated using(private.can_business_permission(organization_id,'sales.read',branch_id));
create policy pos_reconciliation_read on public.pos_reconciliation_cases for select to authenticated using(private.can_business_permission(organization_id,'sales.reconcile',branch_id));
create policy payment_verification_history_read on public.payment_verification_history for select to authenticated using(exists(select 1 from public.sales_payments payment join public.sales_transactions sale on sale.id=payment.sale_id where payment.id=payment_verification_history.payment_id and private.can_business_permission(payment_verification_history.organization_id,'sales.reconcile',sale.branch_id)));

revoke all on table public.pos_registers,public.pos_register_sessions,public.pos_offline_leases,public.pos_document_sequences,public.pos_commands,public.pos_reconciliation_cases,public.payment_verification_history from public,anon,authenticated;
grant select on table public.pos_registers,public.pos_register_sessions,public.pos_commands,public.pos_reconciliation_cases,public.payment_verification_history to authenticated;

revoke all on function private.next_pos_receipt_number(uuid,uuid),private.open_reconciliation_case(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb),private.bootstrap_pos_register(uuid,uuid,uuid,uuid,text,uuid,numeric),private.process_pos_command(uuid,uuid,integer,uuid,uuid,timestamptz,text,text,jsonb),private.resolve_pos_reconciliation_case(uuid,uuid,text,text),private.reject_payment_verification_history_mutation() from public,anon,authenticated;
revoke all on function public.bootstrap_pos_register(uuid,uuid,uuid,uuid,text,uuid,numeric),public.process_pos_command(uuid,uuid,integer,uuid,uuid,timestamptz,text,text,jsonb),public.resolve_pos_reconciliation_case(uuid,uuid,text,text),public.pos_operations_dashboard(uuid),public.pos_catalog_snapshot(uuid,uuid,text) from public,anon;
grant execute on function public.bootstrap_pos_register(uuid,uuid,uuid,uuid,text,uuid,numeric),public.process_pos_command(uuid,uuid,integer,uuid,uuid,timestamptz,text,text,jsonb),public.resolve_pos_reconciliation_case(uuid,uuid,text,text),public.pos_operations_dashboard(uuid),public.pos_catalog_snapshot(uuid,uuid,text) to authenticated;

comment on table public.pos_commands is 'Durable, tenant-scoped POS command receipts. Same command ID and payload are idempotent; altered replays are rejected.';
comment on table public.pos_offline_leases is 'Hashed, short-lived register authorization. Raw lease tokens are returned once and never stored.';
comment on function public.process_pos_command(uuid,uuid,integer,uuid,uuid,timestamptz,text,text,jsonb) is 'Single authoritative boundary for connected and offline-replayed POS commands.';
