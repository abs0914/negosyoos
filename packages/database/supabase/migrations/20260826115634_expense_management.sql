-- Module 14: Business-scoped expenses, approvals, recurring schedules, receipts, and summaries.
insert into public.permissions(key,domain,action,description) values
  ('expenses.manage','expenses','manage','Manage expense categories, schedules, and all expense records')
on conflict(key) do update set domain=excluded.domain,action=excluded.action,description=excluded.description;

create function private.install_expense_permissions(requested_organization_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  insert into public.role_permissions(role_id,permission_id)
  select role.id,permission.id from public.roles role cross join public.permissions permission
  where role.organization_id=requested_organization_id
    and role.key in('owner','administrator','manager')
    and permission.key in('expenses.read','expenses.create','expenses.manage')
  on conflict do nothing;
end;$$;
create function private.handle_main_branch_expense_permissions() returns trigger
language plpgsql security definer set search_path='' as $$
begin if new.code='main' then perform private.install_expense_permissions(new.organization_id);end if;return new;end;$$;
create trigger zzzzzz_install_expense_permissions_on_main_branch after insert on public.branches for each row execute function private.handle_main_branch_expense_permissions();
select private.install_expense_permissions(id) from public.organizations;

create table public.expense_categories(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 1 and 120),description text check(char_length(description)<=500),
  is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(id,organization_id)
);
create unique index expense_categories_name_unique on public.expense_categories(organization_id,lower(name));
create function private.install_default_expense_categories(requested_organization_id uuid)returns void language plpgsql security definer set search_path='' as $$begin
  insert into public.expense_categories(organization_id,name)select requested_organization_id,name from unnest(array['Rent','Utilities','Supplies','Transport','Payroll','Marketing','Taxes','Repairs','Other'])name on conflict do nothing;
end;$$;
create function private.handle_main_branch_expense_categories()returns trigger language plpgsql security definer set search_path='' as $$begin if new.code='main'then perform private.install_default_expense_categories(new.organization_id);end if;return new;end;$$;
create trigger zzzzzzz_install_expense_categories_on_main_branch after insert on public.branches for each row execute function private.handle_main_branch_expense_categories();
select private.install_default_expense_categories(id)from public.organizations;

create table public.expense_number_counters(
  organization_id uuid not null references public.organizations(id) on delete cascade,calendar_year integer not null check(calendar_year between 2000 and 9999),
  last_value bigint not null default 0 check(last_value>=0),primary key(organization_id,calendar_year)
);

create table public.expenses(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_number text not null,expense_date date not null,category_id uuid not null,branch_id uuid not null,
  supplier_payee text not null check(char_length(btrim(supplier_payee)) between 1 and 160),amount numeric(16,4) not null check(amount>0),
  payment_method text not null check(payment_method in('cash','bank_transfer','card','digital_wallet','cheque','other')),
  description text check(char_length(description)<=1000),receipt_path text,receipt_file_name text check(char_length(receipt_file_name)<=255),
  receipt_mime_type text check(receipt_mime_type in('image/jpeg','image/png','image/webp','application/pdf')),receipt_size_bytes bigint check(receipt_size_bytes between 1 and 10485760),
  approval_status text not null default'draft' check(approval_status in('draft','pending','approved','rejected','cancelled')),
  idempotency_key text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(id,organization_id),unique(organization_id,expense_number),unique(organization_id,idempotency_key),
  foreign key(category_id,organization_id) references public.expense_categories(id,organization_id) on delete restrict,
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,
  check((receipt_path is null and receipt_file_name is null and receipt_mime_type is null and receipt_size_bytes is null)or(receipt_path is not null and receipt_file_name is not null and receipt_mime_type is not null and receipt_size_bytes is not null))
);
create index expenses_business_date_idx on public.expenses(organization_id,expense_date desc,id desc);
create index expenses_branch_date_idx on public.expenses(organization_id,branch_id,expense_date desc);
create index expenses_category_date_idx on public.expenses(organization_id,category_id,expense_date desc);
create index expenses_pending_idx on public.expenses(organization_id,created_at) where approval_status='pending';

create table public.recurring_expense_definitions(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 1 and 160),category_id uuid not null,branch_id uuid not null,
  supplier_payee text not null check(char_length(btrim(supplier_payee)) between 1 and 160),amount numeric(16,4) not null check(amount>0),
  payment_method text not null check(payment_method in('cash','bank_transfer','card','digital_wallet','cheque','other')),description text check(char_length(description)<=1000),
  frequency text not null check(frequency in('weekly','monthly','quarterly','yearly')),next_due_date date not null,end_date date,
  is_active boolean not null default true,last_generated_at timestamptz,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(id,organization_id),foreign key(category_id,organization_id) references public.expense_categories(id,organization_id) on delete restrict,
  foreign key(branch_id,organization_id) references public.branches(id,organization_id) on delete restrict,check(end_date is null or end_date>=next_due_date)
);
create index recurring_expenses_due_idx on public.recurring_expense_definitions(organization_id,next_due_date) where is_active;
create table public.recurring_expense_occurrences(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
  recurring_expense_id uuid not null,scheduled_date date not null,expense_id uuid not null,created_at timestamptz not null default now(),
  unique(recurring_expense_id,scheduled_date),foreign key(recurring_expense_id,organization_id) references public.recurring_expense_definitions(id,organization_id) on delete cascade,
  foreign key(expense_id,organization_id) references public.expenses(id,organization_id) on delete restrict
);
create index recurring_occurrences_expense_idx on public.recurring_expense_occurrences(expense_id);

create table public.expense_approval_links(
  expense_id uuid primary key,organization_id uuid not null,approval_request_id uuid not null unique,created_at timestamptz not null default now(),
  foreign key(expense_id,organization_id) references public.expenses(id,organization_id) on delete cascade,
  foreign key(approval_request_id,organization_id) references public.approval_requests(id,organization_id) on delete restrict
);
create index expense_approval_links_org_idx on public.expense_approval_links(organization_id);
create table public.expense_audit_events(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null,specific_expense_id uuid not null,event text not null check(event in('created','updated','submitted','approved','rejected','cancelled','receipt_attached','recurring_generated')),
  actor_id uuid not null references auth.users(id),details jsonb not null default'{}' check(jsonb_typeof(details)='object'),created_at timestamptz not null default now(),
  foreign key(specific_expense_id,organization_id) references public.expenses(id,organization_id) on delete cascade
);
create index expense_audit_expense_idx on public.expense_audit_events(specific_expense_id,created_at);
create trigger set_updated_at before update on public.expense_categories for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.expenses for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.recurring_expense_definitions for each row execute function private.set_updated_at();
create function private.reject_expense_audit_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception'Expense audit events are immutable.' using errcode='P0001';end;$$;
create trigger expense_audit_immutable before update or delete on public.expense_audit_events for each row execute function private.reject_expense_audit_mutation();

create function private.expenses_module_enabled(requested_organization_id uuid) returns boolean
language sql stable security definer set search_path='' as $$select exists(select 1 from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id where module.organization_id=requested_organization_id and module.is_enabled and definition.key='expenses');$$;
create function private.can_access_expense_receipt(object_name text,requested_permission text)returns boolean language plpgsql stable security definer set search_path='' as $$
declare requested_organization_id uuid;requested_expense_id uuid;expense_branch_id uuid;begin
  if(select auth.uid())is null then return false;end if;
  begin requested_organization_id:=split_part(object_name,'/',1)::uuid;requested_expense_id:=split_part(object_name,'/',2)::uuid;exception when invalid_text_representation then return false;end;
  select branch_id into expense_branch_id from public.expenses where id=requested_expense_id and organization_id=requested_organization_id;
  return expense_branch_id is not null and private.can_business_permission(requested_organization_id,requested_permission,expense_branch_id);
end;$$;

alter table public.expense_categories enable row level security;alter table public.expenses enable row level security;alter table public.recurring_expense_definitions enable row level security;
alter table public.recurring_expense_occurrences enable row level security;alter table public.expense_approval_links enable row level security;alter table public.expense_audit_events enable row level security;
create policy expense_categories_read on public.expense_categories for select to authenticated using((select private.expenses_module_enabled(expense_categories.organization_id))and private.can_business_permission(expense_categories.organization_id,'expenses.read',null));
create policy expenses_read on public.expenses for select to authenticated using((select private.expenses_module_enabled(expenses.organization_id))and private.can_business_permission(expenses.organization_id,'expenses.read',expenses.branch_id));
create policy recurring_expenses_read on public.recurring_expense_definitions for select to authenticated using((select private.expenses_module_enabled(recurring_expense_definitions.organization_id))and private.can_business_permission(recurring_expense_definitions.organization_id,'expenses.read',recurring_expense_definitions.branch_id));
create policy recurring_occurrences_read on public.recurring_expense_occurrences for select to authenticated using(exists(select 1 from public.expenses expense where expense.id=recurring_expense_occurrences.expense_id and expense.organization_id=recurring_expense_occurrences.organization_id and private.can_business_permission(recurring_expense_occurrences.organization_id,'expenses.read',expense.branch_id)));
create policy expense_approval_links_read on public.expense_approval_links for select to authenticated using(exists(select 1 from public.expenses expense where expense.id=expense_approval_links.expense_id and expense.organization_id=expense_approval_links.organization_id and private.can_business_permission(expense_approval_links.organization_id,'expenses.read',expense.branch_id)));
create policy expense_audit_read on public.expense_audit_events for select to authenticated using(exists(select 1 from public.expenses expense where expense.id=expense_audit_events.specific_expense_id and expense.organization_id=expense_audit_events.organization_id and private.can_business_permission(expense_audit_events.organization_id,'expenses.read',expense.branch_id)));
grant select on public.expense_categories,public.expenses,public.recurring_expense_definitions,public.recurring_expense_occurrences,public.expense_approval_links,public.expense_audit_events to authenticated;

create function private.next_expense_number(requested_organization_id uuid,requested_date date) returns text
language plpgsql security definer set search_path='' as $$declare next_value bigint;year_value integer:=extract(year from requested_date);begin
  insert into public.expense_number_counters(organization_id,calendar_year,last_value) values(requested_organization_id,year_value,1)
  on conflict(organization_id,calendar_year) do update set last_value=public.expense_number_counters.last_value+1 returning last_value into next_value;
  if next_value is null then next_value:=1;end if;return'EXP-'||year_value||'-'||lpad(next_value::text,6,'0');end;$$;
create function private.save_expense_category(requested_organization_id uuid,requested_category_id uuid,requested_name text,requested_description text,requested_is_active boolean) returns uuid
language plpgsql security definer set search_path='' as $$declare target_id uuid:=coalesce(requested_category_id,gen_random_uuid());begin
  if(select auth.uid())is null or not private.expenses_module_enabled(requested_organization_id)or not private.can_business_permission(requested_organization_id,'expenses.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
  if char_length(btrim(requested_name))not between 1 and 120 or char_length(coalesce(requested_description,''))>500 then raise exception'Invalid expense category.'using errcode='22023';end if;
  if requested_category_id is not null and not exists(select 1 from public.expense_categories where id=target_id and organization_id=requested_organization_id)then raise exception'Expense category not found.'using errcode='22023';end if;
  insert into public.expense_categories(id,organization_id,name,description,is_active)values(target_id,requested_organization_id,btrim(requested_name),nullif(btrim(requested_description),''),requested_is_active)
  on conflict(id)do update set name=excluded.name,description=excluded.description,is_active=excluded.is_active;return target_id;
exception when unique_violation then raise exception'Expense category name already exists.'using errcode='23505';end;$$;

create function private.save_expense(requested_organization_id uuid,requested_expense_id uuid,requested_expense_date date,requested_category_id uuid,requested_branch_id uuid,requested_supplier_payee text,requested_amount numeric,requested_payment_method text,requested_description text,requested_submit boolean,requested_idempotency_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare target_id uuid;actor uuid:=(select auth.uid());current_expense public.expenses%rowtype;next_status text:='draft';approval_threshold numeric:=0;approval_id uuid;expense_number text;
begin
  select id into target_id from public.expenses where organization_id=requested_organization_id and idempotency_key=requested_idempotency_key;if found then return target_id;end if;
  target_id:=coalesce(requested_expense_id,gen_random_uuid());
  if actor is null or not private.expenses_module_enabled(requested_organization_id)or not private.can_business_permission(requested_organization_id,'expenses.create',requested_branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
  if requested_expense_date is null or requested_amount<=0 or char_length(btrim(requested_supplier_payee))not between 1 and 160 or requested_payment_method not in('cash','bank_transfer','card','digital_wallet','cheque','other')or char_length(coalesce(requested_description,''))>1000
    or not exists(select 1 from public.expense_categories where id=requested_category_id and organization_id=requested_organization_id and is_active)
    or not exists(select 1 from public.branches where id=requested_branch_id and organization_id=requested_organization_id and is_active)then raise exception'Invalid expense.'using errcode='22023';end if;
  if requested_expense_id is not null then select*into current_expense from public.expenses where id=target_id and organization_id=requested_organization_id for update;if current_expense.id is null or current_expense.approval_status<>'draft'then raise exception'Only draft expenses can be edited.'using errcode='P0001';end if;expense_number:=current_expense.expense_number;else expense_number:=private.next_expense_number(requested_organization_id,requested_expense_date);end if;
  if requested_submit then select coalesce((module.config->>'approval_threshold')::numeric,0)into approval_threshold from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id where module.organization_id=requested_organization_id and module.is_enabled and definition.key='expenses';next_status:=case when requested_amount>approval_threshold then'pending'else'approved'end;end if;
  insert into public.expenses(id,organization_id,expense_number,expense_date,category_id,branch_id,supplier_payee,amount,payment_method,description,approval_status,idempotency_key,created_by)
  values(target_id,requested_organization_id,expense_number,requested_expense_date,requested_category_id,requested_branch_id,btrim(requested_supplier_payee),requested_amount,requested_payment_method,nullif(btrim(requested_description),''),next_status,requested_idempotency_key,actor)
  on conflict(id)do update set expense_date=excluded.expense_date,category_id=excluded.category_id,branch_id=excluded.branch_id,supplier_payee=excluded.supplier_payee,amount=excluded.amount,payment_method=excluded.payment_method,description=excluded.description,approval_status=excluded.approval_status;
  insert into public.expense_audit_events(organization_id,specific_expense_id,event,actor_id,details)values(requested_organization_id,target_id,case when requested_expense_id is null then'created'else'updated'end,actor,jsonb_build_object('status',next_status,'amount',requested_amount));
  if requested_submit then insert into public.expense_audit_events(organization_id,specific_expense_id,event,actor_id,details)values(requested_organization_id,target_id,'submitted',actor,jsonb_build_object('autoApproved',next_status='approved','approvalThreshold',approval_threshold));end if;
  if next_status='pending'then approval_id:=private.create_approval_request(requested_organization_id,'expense','Expense '||expense_number,'Approve '||expense_number||' for PHP '||requested_amount,null,null,null,jsonb_build_array(jsonb_build_object('key','expense_review','name','Expense review','approverRoleKey','manager')));insert into public.expense_approval_links(expense_id,organization_id,approval_request_id)values(target_id,requested_organization_id,approval_id);end if;
  return target_id;
exception when unique_violation then select id into target_id from public.expenses where organization_id=requested_organization_id and idempotency_key=requested_idempotency_key;if target_id is null then raise;end if;return target_id;end;$$;

create function private.attach_expense_receipt(requested_organization_id uuid,requested_expense_id uuid,requested_path text,requested_file_name text,requested_mime_type text,requested_size bigint) returns void
language plpgsql security definer set search_path='' as $$declare expense public.expenses%rowtype;actor uuid:=(select auth.uid());begin
  select*into expense from public.expenses where id=requested_expense_id and organization_id=requested_organization_id for update;
  if actor is null or expense.id is null or(expense.created_by<>actor and not private.can_business_permission(requested_organization_id,'expenses.manage',expense.branch_id))then raise exception'Permission denied.'using errcode='42501';end if;
  if requested_path!~('^'||requested_organization_id::text||'/'||requested_expense_id::text||'/[0-9a-f-]+\.(jpg|jpeg|png|webp|pdf)$')or char_length(requested_file_name)not between 1 and 255 or requested_mime_type not in('image/jpeg','image/png','image/webp','application/pdf')or requested_size not between 1 and 10485760 then raise exception'Invalid receipt.'using errcode='22023';end if;
  update public.expenses set receipt_path=requested_path,receipt_file_name=requested_file_name,receipt_mime_type=requested_mime_type,receipt_size_bytes=requested_size where id=expense.id;
  insert into public.expense_audit_events(organization_id,specific_expense_id,event,actor_id,details)values(requested_organization_id,expense.id,'receipt_attached',actor,jsonb_build_object('path',requested_path,'mimeType',requested_mime_type,'size',requested_size));
end;$$;

create function private.sync_expense_approval_status() returns trigger language plpgsql security definer set search_path='' as $$declare linked_expense uuid;begin
  if new.status is distinct from old.status and new.status in('approved','rejected','cancelled')then select expense_id into linked_expense from public.expense_approval_links where approval_request_id=new.id;if linked_expense is not null then update public.expenses set approval_status=new.status where id=linked_expense;insert into public.expense_audit_events(organization_id,specific_expense_id,event,actor_id,details)values(new.organization_id,linked_expense,new.status,coalesce(new.cancelled_by,(select auth.uid()),new.requester_id),jsonb_build_object('approvalRequestId',new.id));end if;end if;return new;end;$$;
create trigger sync_expense_approval after update of status on public.approval_requests for each row execute function private.sync_expense_approval_status();

create function private.save_recurring_expense(requested_organization_id uuid,requested_recurring_id uuid,requested_name text,requested_category_id uuid,requested_branch_id uuid,requested_supplier_payee text,requested_amount numeric,requested_payment_method text,requested_description text,requested_frequency text,requested_next_due_date date,requested_end_date date,requested_is_active boolean) returns uuid
language plpgsql security definer set search_path='' as $$declare target_id uuid:=coalesce(requested_recurring_id,gen_random_uuid());begin
  if(select auth.uid())is null or not private.expenses_module_enabled(requested_organization_id)or not private.can_business_permission(requested_organization_id,'expenses.manage',requested_branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
  if char_length(btrim(requested_name))not between 1 and 160 or requested_amount<=0 or requested_frequency not in('weekly','monthly','quarterly','yearly')or(requested_end_date is not null and requested_end_date<requested_next_due_date)or requested_payment_method not in('cash','bank_transfer','card','digital_wallet','cheque','other')or not exists(select 1 from public.expense_categories where id=requested_category_id and organization_id=requested_organization_id and is_active)or not exists(select 1 from public.branches where id=requested_branch_id and organization_id=requested_organization_id and is_active)then raise exception'Invalid recurring expense.'using errcode='22023';end if;
  if requested_recurring_id is not null and not exists(select 1 from public.recurring_expense_definitions where id=target_id and organization_id=requested_organization_id)then raise exception'Recurring expense not found.'using errcode='22023';end if;
  insert into public.recurring_expense_definitions(id,organization_id,name,category_id,branch_id,supplier_payee,amount,payment_method,description,frequency,next_due_date,end_date,is_active,created_by)
  values(target_id,requested_organization_id,btrim(requested_name),requested_category_id,requested_branch_id,btrim(requested_supplier_payee),requested_amount,requested_payment_method,nullif(btrim(requested_description),''),requested_frequency,requested_next_due_date,requested_end_date,requested_is_active,(select auth.uid()))
  on conflict(id)do update set name=excluded.name,category_id=excluded.category_id,branch_id=excluded.branch_id,supplier_payee=excluded.supplier_payee,amount=excluded.amount,payment_method=excluded.payment_method,description=excluded.description,frequency=excluded.frequency,next_due_date=excluded.next_due_date,end_date=excluded.end_date,is_active=excluded.is_active;return target_id;
end;$$;

create function private.generate_recurring_expense(requested_organization_id uuid,requested_recurring_id uuid,requested_scheduled_date date,requested_idempotency_key text) returns uuid
language plpgsql security definer set search_path='' as $$declare definition public.recurring_expense_definitions%rowtype;target_id uuid;next_date date;begin
  select expense_id into target_id from public.recurring_expense_occurrences where recurring_expense_id=requested_recurring_id and scheduled_date=requested_scheduled_date;if found then return target_id;end if;
  select*into definition from public.recurring_expense_definitions where id=requested_recurring_id and organization_id=requested_organization_id for update;
  if definition.id is null or not definition.is_active or requested_scheduled_date<>definition.next_due_date or(definition.end_date is not null and requested_scheduled_date>definition.end_date)then raise exception'Recurring expense is not due.'using errcode='P0001';end if;
  target_id:=private.save_expense(requested_organization_id,null,requested_scheduled_date,definition.category_id,definition.branch_id,definition.supplier_payee,definition.amount,definition.payment_method,definition.description,true,requested_idempotency_key);
  insert into public.recurring_expense_occurrences(organization_id,recurring_expense_id,scheduled_date,expense_id)values(requested_organization_id,definition.id,requested_scheduled_date,target_id);
  insert into public.expense_audit_events(organization_id,specific_expense_id,event,actor_id,details)values(requested_organization_id,target_id,'recurring_generated',(select auth.uid()),jsonb_build_object('recurringExpenseId',definition.id,'scheduledDate',requested_scheduled_date));
  next_date:=case definition.frequency when'weekly'then requested_scheduled_date+7 when'monthly'then(requested_scheduled_date+interval'1 month')::date when'quarterly'then(requested_scheduled_date+interval'3 months')::date else(requested_scheduled_date+interval'1 year')::date end;
  update public.recurring_expense_definitions set next_due_date=next_date,last_generated_at=now(),is_active=case when end_date is not null and next_date>end_date then false else is_active end where id=definition.id;return target_id;
end;$$;

create function private.expense_summary(requested_organization_id uuid,requested_from date,requested_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
  if(select auth.uid())is null or not private.expenses_module_enabled(requested_organization_id)or not private.can_business_permission(requested_organization_id,'expenses.read',null)then raise exception'Permission denied.'using errcode='42501';end if;
  if requested_from is null or requested_to is null or requested_from>requested_to or requested_to-requested_from>730 then raise exception'Invalid report range.'using errcode='22023';end if;
  return jsonb_build_object(
    'total',coalesce((select sum(expense.amount)from public.expenses expense where expense.organization_id=requested_organization_id and expense.expense_date between requested_from and requested_to and expense.approval_status='approved'),0),
    'monthly',coalesce((select jsonb_agg(jsonb_build_object('month',summary.month_key,'amount',summary.total_amount)order by summary.month_key)from(select to_char(date_trunc('month',expense.expense_date),'YYYY-MM') as month_key,sum(expense.amount) as total_amount from public.expenses expense where expense.organization_id=requested_organization_id and expense.expense_date between requested_from and requested_to and expense.approval_status='approved'group by 1)summary),'[]'),
    'byCategory',coalesce((select jsonb_agg(jsonb_build_object('categoryId',summary.id,'category',summary.name,'amount',summary.total_amount)order by summary.total_amount desc)from(select category.id,category.name,sum(expense.amount) as total_amount from public.expenses expense join public.expense_categories category on category.id=expense.category_id where expense.organization_id=requested_organization_id and expense.expense_date between requested_from and requested_to and expense.approval_status='approved'group by category.id,category.name)summary),'[]'),
    'byBranch',coalesce((select jsonb_agg(jsonb_build_object('branchId',summary.id,'branch',summary.name,'amount',summary.total_amount)order by summary.total_amount desc)from(select branch.id,branch.name,sum(expense.amount) as total_amount from public.expenses expense join public.branches branch on branch.id=expense.branch_id where expense.organization_id=requested_organization_id and expense.expense_date between requested_from and requested_to and expense.approval_status='approved'group by branch.id,branch.name)summary),'[]'));
end;$$;

create function public.save_expense_category(requested_organization_id uuid,requested_category_id uuid,requested_name text,requested_description text,requested_is_active boolean)returns uuid language sql security definer set search_path='' as $$select private.save_expense_category(requested_organization_id,requested_category_id,requested_name,requested_description,requested_is_active);$$;
create function public.save_expense(requested_organization_id uuid,requested_expense_id uuid,requested_expense_date date,requested_category_id uuid,requested_branch_id uuid,requested_supplier_payee text,requested_amount numeric,requested_payment_method text,requested_description text,requested_submit boolean,requested_idempotency_key text)returns uuid language sql security definer set search_path='' as $$select private.save_expense(requested_organization_id,requested_expense_id,requested_expense_date,requested_category_id,requested_branch_id,requested_supplier_payee,requested_amount,requested_payment_method,requested_description,requested_submit,requested_idempotency_key);$$;
create function public.attach_expense_receipt(requested_organization_id uuid,requested_expense_id uuid,requested_path text,requested_file_name text,requested_mime_type text,requested_size bigint)returns void language sql security definer set search_path='' as $$select private.attach_expense_receipt(requested_organization_id,requested_expense_id,requested_path,requested_file_name,requested_mime_type,requested_size);$$;
create function public.save_recurring_expense(requested_organization_id uuid,requested_recurring_id uuid,requested_name text,requested_category_id uuid,requested_branch_id uuid,requested_supplier_payee text,requested_amount numeric,requested_payment_method text,requested_description text,requested_frequency text,requested_next_due_date date,requested_end_date date,requested_is_active boolean)returns uuid language sql security definer set search_path='' as $$select private.save_recurring_expense(requested_organization_id,requested_recurring_id,requested_name,requested_category_id,requested_branch_id,requested_supplier_payee,requested_amount,requested_payment_method,requested_description,requested_frequency,requested_next_due_date,requested_end_date,requested_is_active);$$;
create function public.generate_recurring_expense(requested_organization_id uuid,requested_recurring_id uuid,requested_scheduled_date date,requested_idempotency_key text)returns uuid language sql security definer set search_path='' as $$select private.generate_recurring_expense(requested_organization_id,requested_recurring_id,requested_scheduled_date,requested_idempotency_key);$$;
create function public.expense_summary(requested_organization_id uuid,requested_from date,requested_to date)returns jsonb language sql stable security definer set search_path='' as $$select private.expense_summary(requested_organization_id,requested_from,requested_to);$$;

revoke all on function private.install_expense_permissions(uuid),private.handle_main_branch_expense_permissions(),private.install_default_expense_categories(uuid),private.handle_main_branch_expense_categories(),private.reject_expense_audit_mutation(),private.expenses_module_enabled(uuid),private.can_access_expense_receipt(text,text),private.next_expense_number(uuid,date),private.save_expense_category(uuid,uuid,text,text,boolean),private.save_expense(uuid,uuid,date,uuid,uuid,text,numeric,text,text,boolean,text),private.attach_expense_receipt(uuid,uuid,text,text,text,bigint),private.sync_expense_approval_status(),private.save_recurring_expense(uuid,uuid,text,uuid,uuid,text,numeric,text,text,text,date,date,boolean),private.generate_recurring_expense(uuid,uuid,date,text),private.expense_summary(uuid,date,date) from public,anon,authenticated;
grant execute on function private.expenses_module_enabled(uuid),private.can_access_expense_receipt(text,text) to authenticated;
revoke all on function public.save_expense_category(uuid,uuid,text,text,boolean),public.save_expense(uuid,uuid,date,uuid,uuid,text,numeric,text,text,boolean,text),public.attach_expense_receipt(uuid,uuid,text,text,text,bigint),public.save_recurring_expense(uuid,uuid,text,uuid,uuid,text,numeric,text,text,text,date,date,boolean),public.generate_recurring_expense(uuid,uuid,date,text),public.expense_summary(uuid,date,date) from public,anon;
grant execute on function public.save_expense_category(uuid,uuid,text,text,boolean),public.save_expense(uuid,uuid,date,uuid,uuid,text,numeric,text,text,boolean,text),public.attach_expense_receipt(uuid,uuid,text,text,text,bigint),public.save_recurring_expense(uuid,uuid,text,uuid,uuid,text,numeric,text,text,text,date,date,boolean),public.generate_recurring_expense(uuid,uuid,date,text),public.expense_summary(uuid,date,date) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('expense-receipts','expense-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])on conflict(id)do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy expense_receipts_select on storage.objects for select to authenticated using(bucket_id='expense-receipts'and private.can_access_expense_receipt(name,'expenses.read'));
create policy expense_receipts_insert on storage.objects for insert to authenticated with check(bucket_id='expense-receipts'and private.can_access_expense_receipt(name,'expenses.create'));
create policy expense_receipts_delete on storage.objects for delete to authenticated using(bucket_id='expense-receipts'and private.can_access_expense_receipt(name,'expenses.manage'));

comment on table public.recurring_expense_definitions is'Recurring expense schedule definitions; generation is explicit and idempotent so a future scheduler can safely replay due occurrences.';
