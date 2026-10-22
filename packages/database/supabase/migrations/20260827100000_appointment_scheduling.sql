-- Module 19: reusable branch-local appointment scheduling for service businesses.
insert into public.module_dependencies(module_key,dependency_module_key) values('appointments','product_catalog') on conflict do nothing;
update public.module_definitions set configuration_schema='{"properties":{"slot_minutes":{"type":"integer","label":"Appointment slot (minutes)","minimum":5,"maximum":480,"default":30},"prevent_staff_conflicts":{"type":"boolean","label":"Prevent staff conflicts","default":true},"prevent_customer_conflicts":{"type":"boolean","label":"Prevent customer conflicts","default":false}},"additionalProperties":false}'::jsonb,updated_at=now() where key='appointments';
insert into public.permissions(key,domain,action,description) values
 ('appointments.read','appointments','read','View appointment schedules and history'),
 ('appointments.manage','appointments','manage','Create and reschedule appointments'),
 ('appointments.status','appointments','status','Update appointment arrival and completion status')
on conflict(key) do update set domain=excluded.domain,action=excluded.action,description=excluded.description;
create function private.install_appointment_permissions(requested_organization_id uuid)returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.role_permissions(role_id,permission_id)select role.id,permission.id from public.roles role cross join public.permissions permission where role.organization_id=requested_organization_id and role.key in('owner','administrator','manager')and permission.key like'appointments.%'on conflict do nothing;
 insert into public.role_permissions(role_id,permission_id)select role.id,permission.id from public.roles role join public.permissions permission on permission.key=any(case role.key when'staff'then array['appointments.read','appointments.manage','appointments.status']when'viewer'then array['appointments.read']else array[]::text[]end)where role.organization_id=requested_organization_id and role.key in('staff','viewer')on conflict do nothing;
end;$$;
create function private.handle_main_branch_appointment_permissions()returns trigger language plpgsql security definer set search_path='' as $$begin if new.code='main'then perform private.install_appointment_permissions(new.organization_id);end if;return new;end;$$;
create trigger zzzzzz_install_appointment_permissions_on_main_branch after insert on public.branches for each row execute function private.handle_main_branch_appointment_permissions();
select private.install_appointment_permissions(id)from public.organizations;

create table public.appointment_staff(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,
 membership_id uuid not null,user_id uuid not null references auth.users(id)on delete restrict,display_name text not null check(char_length(btrim(display_name))between 1 and 160),
 status text not null default'active'check(status in('active','inactive')),color text not null default'#2563eb'check(color~'^#[0-9a-fA-F]{6}$'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,organization_id),unique(organization_id,membership_id),unique(organization_id,user_id),
 foreign key(membership_id,organization_id)references public.organization_memberships(id,organization_id)on delete cascade
);
create table public.appointment_counters(organization_id uuid primary key references public.organizations(id)on delete cascade,next_value bigint not null default 1 check(next_value>0));
create table public.appointments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,branch_id uuid not null,
 appointment_number text not null,customer_id uuid not null,service_id uuid not null,staff_id uuid not null,appointment_date date not null,start_time time not null,end_time time not null,
 status text not null default'scheduled'check(status in('scheduled','confirmed','arrived','in_progress','completed','cancelled','no_show')),
 notes text check(char_length(notes)<=2000),created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,organization_id),unique(organization_id,appointment_number),
 foreign key(branch_id,organization_id)references public.branches(id,organization_id)on delete restrict,
 foreign key(customer_id,organization_id)references public.sales_customers(id,organization_id)on delete restrict,
 foreign key(service_id,organization_id)references public.products(id,organization_id)on delete restrict,
 foreign key(staff_id,organization_id)references public.appointment_staff(id,organization_id)on delete restrict,
 check(end_time>start_time)
);
create table public.appointment_audit_history(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,appointment_id uuid not null,
 event text not null,from_status text,to_status text,actor_id uuid not null references auth.users(id),details jsonb not null default'{}',created_at timestamptz not null default now(),
 foreign key(appointment_id,organization_id)references public.appointments(id,organization_id)on delete cascade
);
create index appointment_staff_active_idx on public.appointment_staff(organization_id,status,display_name);
create index appointments_calendar_idx on public.appointments(organization_id,branch_id,appointment_date,start_time);
create index appointments_staff_schedule_idx on public.appointments(staff_id,appointment_date,start_time)where status in('scheduled','confirmed','arrived','in_progress');
create index appointments_customer_history_idx on public.appointments(customer_id,appointment_date desc,start_time desc);
create index appointments_service_idx on public.appointments(service_id,appointment_date desc);
create index appointment_audit_idx on public.appointment_audit_history(appointment_id,created_at desc);
create trigger set_updated_at before update on public.appointment_staff for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.appointments for each row execute function private.set_updated_at();

insert into public.appointment_staff(organization_id,membership_id,user_id,display_name)
select membership.organization_id,membership.id,membership.user_id,coalesce(nullif(btrim(profile.display_name),''),split_part(user_record.email,'@',1),'Staff')
from public.organization_memberships membership join auth.users user_record on user_record.id=membership.user_id left join public.profiles profile on profile.id=membership.user_id
where membership.status='active'on conflict(organization_id,membership_id)do nothing;
create function private.sync_appointment_staff_membership()returns trigger language plpgsql security definer set search_path='' as $$
declare name_value text;
begin
 select coalesce(nullif(btrim(profile.display_name),''),split_part(user_record.email,'@',1),'Staff')into name_value from auth.users user_record left join public.profiles profile on profile.id=user_record.id where user_record.id=new.user_id;
 insert into public.appointment_staff(organization_id,membership_id,user_id,display_name,status)values(new.organization_id,new.id,new.user_id,name_value,case when new.status='active'then'active'else'inactive'end)
 on conflict(organization_id,membership_id)do update set display_name=excluded.display_name,status=excluded.status;return new;
end;$$;
create trigger sync_appointment_staff after insert or update of status on public.organization_memberships for each row execute function private.sync_appointment_staff_membership();

create function private.appointments_module_enabled(requested_organization_id uuid)returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id where module.organization_id=requested_organization_id and module.is_enabled and definition.key='appointments');$$;
create function private.can_read_appointment(requested_organization_id uuid,requested_appointment_id uuid)returns boolean language sql stable security definer set search_path='' as $$select private.appointments_module_enabled(requested_organization_id)and exists(select 1 from public.appointments appointment where appointment.id=requested_appointment_id and appointment.organization_id=requested_organization_id and private.can_business_permission(requested_organization_id,'appointments.read',appointment.branch_id));$$;
create function private.next_appointment_number(requested_organization_id uuid)returns text language plpgsql security definer set search_path='' as $$declare value bigint;begin insert into public.appointment_counters(organization_id,next_value)values(requested_organization_id,2)on conflict(organization_id)do update set next_value=public.appointment_counters.next_value+1 returning next_value-1 into value;if value is null then value:=1;end if;return'APT-'||extract(year from current_date)::integer||'-'||lpad(value::text,6,'0');end;$$;
create function private.appointment_config(requested_organization_id uuid)returns jsonb language sql stable security definer set search_path='' as $$select coalesce(module.config,'{}')from public.organization_modules module join public.module_definitions definition on definition.id=module.module_id where module.organization_id=requested_organization_id and module.is_enabled and definition.key='appointments';$$;

create function private.save_appointment(requested_organization_id uuid,requested_appointment_id uuid,requested_branch_id uuid,requested_customer_id uuid,requested_service_id uuid,requested_staff_id uuid,requested_date date,requested_start_time time,requested_end_time time,requested_status text,requested_notes text)returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());target_id uuid:=coalesce(requested_appointment_id,gen_random_uuid());record public.appointments%rowtype;config jsonb;prevent_staff boolean;prevent_customer boolean;appointment_number text;
begin
 if actor is null or not private.appointments_module_enabled(requested_organization_id)or not private.can_business_permission(requested_organization_id,'appointments.manage',requested_branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
 if requested_end_time<=requested_start_time or requested_status not in('scheduled','confirmed')or char_length(coalesce(requested_notes,''))>2000 or not exists(select 1 from public.branches where id=requested_branch_id and organization_id=requested_organization_id and is_active)or not exists(select 1 from public.sales_customers where id=requested_customer_id and organization_id=requested_organization_id)or not exists(select 1 from public.products where id=requested_service_id and organization_id=requested_organization_id and product_type='service'and status='active'and(branch_id is null or branch_id=requested_branch_id))or not exists(select 1 from public.appointment_staff where id=requested_staff_id and organization_id=requested_organization_id and status='active')then raise exception'Invalid appointment.'using errcode='22023';end if;
 if requested_appointment_id is not null then select*into record from public.appointments where id=target_id and organization_id=requested_organization_id for update;if record.id is null or record.status not in('scheduled','confirmed')then raise exception'Appointment can no longer be rescheduled.'using errcode='P0001';end if;appointment_number:=record.appointment_number;else appointment_number:=private.next_appointment_number(requested_organization_id);end if;
 config:=private.appointment_config(requested_organization_id);prevent_staff:=coalesce((config->>'prevent_staff_conflicts')::boolean,true);prevent_customer:=coalesce((config->>'prevent_customer_conflicts')::boolean,false);
 if prevent_staff then perform pg_advisory_xact_lock(hashtextextended(requested_organization_id||':staff:'||requested_staff_id||':'||requested_date,0));if exists(select 1 from public.appointments appointment where appointment.organization_id=requested_organization_id and appointment.staff_id=requested_staff_id and appointment.appointment_date=requested_date and appointment.id<>target_id and appointment.status in('scheduled','confirmed','arrived','in_progress')and appointment.start_time<requested_end_time and appointment.end_time>requested_start_time)then raise exception'Staff member already has an overlapping appointment.'using errcode='P0001';end if;end if;
 if prevent_customer then perform pg_advisory_xact_lock(hashtextextended(requested_organization_id||':customer:'||requested_customer_id||':'||requested_date,0));if exists(select 1 from public.appointments appointment where appointment.organization_id=requested_organization_id and appointment.customer_id=requested_customer_id and appointment.appointment_date=requested_date and appointment.id<>target_id and appointment.status in('scheduled','confirmed','arrived','in_progress')and appointment.start_time<requested_end_time and appointment.end_time>requested_start_time)then raise exception'Customer already has an overlapping appointment.'using errcode='P0001';end if;end if;
 insert into public.appointments(id,organization_id,branch_id,appointment_number,customer_id,service_id,staff_id,appointment_date,start_time,end_time,status,notes,created_by,updated_by)
 values(target_id,requested_organization_id,requested_branch_id,appointment_number,requested_customer_id,requested_service_id,requested_staff_id,requested_date,requested_start_time,requested_end_time,requested_status,nullif(btrim(requested_notes),''),actor,actor)
 on conflict(id)do update set branch_id=excluded.branch_id,customer_id=excluded.customer_id,service_id=excluded.service_id,staff_id=excluded.staff_id,appointment_date=excluded.appointment_date,start_time=excluded.start_time,end_time=excluded.end_time,status=excluded.status,notes=excluded.notes,updated_by=actor;
 insert into public.appointment_audit_history(organization_id,appointment_id,event,from_status,to_status,actor_id,details)values(requested_organization_id,target_id,case when requested_appointment_id is null then'created'else'rescheduled'end,record.status,requested_status,actor,jsonb_build_object('date',requested_date,'startTime',requested_start_time,'endTime',requested_end_time,'staffId',requested_staff_id));return target_id;
exception when invalid_text_representation then raise exception'Invalid appointment data.'using errcode='22023';end;$$;

create function private.change_appointment_status(requested_organization_id uuid,requested_appointment_id uuid,requested_status text,requested_notes text)returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());record public.appointments%rowtype;allowed boolean:=false;
begin
 select*into record from public.appointments where id=requested_appointment_id and organization_id=requested_organization_id for update;
 if actor is null or record.id is null or not private.appointments_module_enabled(requested_organization_id)or not private.can_business_permission(requested_organization_id,'appointments.status',record.branch_id)then raise exception'Permission denied.'using errcode='42501';end if;
 allowed:=case record.status when'scheduled'then requested_status in('confirmed','arrived','cancelled','no_show')when'confirmed'then requested_status in('arrived','cancelled','no_show')when'arrived'then requested_status in('in_progress','cancelled')when'in_progress'then requested_status in('completed','cancelled')else false end;
 if not allowed or char_length(coalesce(requested_notes,''))>2000 then raise exception'Invalid appointment status transition.'using errcode='P0001';end if;
 update public.appointments set status=requested_status,notes=case when nullif(btrim(requested_notes),'')is null then notes else concat_ws(E'\n',notes,btrim(requested_notes))end,updated_by=actor where id=record.id;
 insert into public.appointment_audit_history(organization_id,appointment_id,event,from_status,to_status,actor_id,details)values(requested_organization_id,record.id,'status_changed',record.status,requested_status,actor,jsonb_build_object('notes',coalesce(requested_notes,'')));
end;$$;
create function public.save_appointment(requested_organization_id uuid,requested_appointment_id uuid,requested_branch_id uuid,requested_customer_id uuid,requested_service_id uuid,requested_staff_id uuid,requested_date date,requested_start_time time,requested_end_time time,requested_status text,requested_notes text)returns uuid language sql security definer set search_path='' as $$select private.save_appointment(requested_organization_id,requested_appointment_id,requested_branch_id,requested_customer_id,requested_service_id,requested_staff_id,requested_date,requested_start_time,requested_end_time,requested_status,requested_notes);$$;
create function public.change_appointment_status(requested_organization_id uuid,requested_appointment_id uuid,requested_status text,requested_notes text)returns void language sql security definer set search_path='' as $$select private.change_appointment_status(requested_organization_id,requested_appointment_id,requested_status,requested_notes);$$;

alter table public.appointment_staff enable row level security;alter table public.appointments enable row level security;alter table public.appointment_audit_history enable row level security;
create policy appointment_staff_read on public.appointment_staff for select to authenticated using((select private.appointments_module_enabled(organization_id))and private.can_business_permission(organization_id,'appointments.read',null));
create policy appointments_read on public.appointments for select to authenticated using((select private.appointments_module_enabled(organization_id))and private.can_business_permission(organization_id,'appointments.read',branch_id));
create policy appointment_audit_read on public.appointment_audit_history for select to authenticated using(private.can_read_appointment(organization_id,appointment_id));
revoke all on table public.appointment_staff,public.appointment_counters,public.appointments,public.appointment_audit_history from public,anon,authenticated;grant select on table public.appointment_staff,public.appointments,public.appointment_audit_history to authenticated;
revoke all on function private.install_appointment_permissions(uuid),private.handle_main_branch_appointment_permissions(),private.sync_appointment_staff_membership(),private.appointments_module_enabled(uuid),private.can_read_appointment(uuid,uuid),private.next_appointment_number(uuid),private.appointment_config(uuid),private.save_appointment(uuid,uuid,uuid,uuid,uuid,uuid,date,time,time,text,text),private.change_appointment_status(uuid,uuid,text,text)from public,anon,authenticated;grant execute on function private.appointments_module_enabled(uuid),private.can_read_appointment(uuid,uuid)to authenticated;
revoke all on function public.save_appointment(uuid,uuid,uuid,uuid,uuid,uuid,date,time,time,text,text),public.change_appointment_status(uuid,uuid,text,text)from public,anon;grant execute on function public.save_appointment(uuid,uuid,uuid,uuid,uuid,uuid,date,time,time,text,text),public.change_appointment_status(uuid,uuid,text,text)to authenticated;
comment on table public.appointments is'Branch-local appointment aggregate linking a customer, catalog service, and active Business staff member.';
