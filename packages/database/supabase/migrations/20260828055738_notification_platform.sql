-- Module 36: tenant-safe, provider-neutral notification platform.
insert into public.permissions(key,domain,action,description)values
('notification.read','notification','read','Read personal Business notifications and preferences'),
('notification.manage','notification','manage','Manage Business notification templates and dispatch notifications')
on conflict(key)do update set domain=excluded.domain,action=excluded.action,description=excluded.description;

create function private.install_notification_permissions(requested_organization_id uuid)returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.role_permissions(role_id,permission_id)
 select role.id,permission.id from public.roles role join public.permissions permission on permission.key='notification.read'
 where role.organization_id=requested_organization_id and role.key in('owner','administrator','manager','cashier','staff','viewer')on conflict do nothing;
 insert into public.role_permissions(role_id,permission_id)
 select role.id,permission.id from public.roles role join public.permissions permission on permission.key='notification.manage'
 where role.organization_id=requested_organization_id and role.key in('owner','administrator','manager')on conflict do nothing;
end$$;
create function private.handle_main_branch_notification_permissions()returns trigger language plpgsql security definer set search_path='' as $$begin if new.code='main'then perform private.install_notification_permissions(new.organization_id);end if;return new;end$$;
create trigger zzzzzzzzzzz_install_notification_permissions_on_main_branch after insert on public.branches for each row execute function private.handle_main_branch_notification_permissions();
select private.install_notification_permissions(id)from public.organizations;

create table public.notification_templates(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,
 key text not null check(key~'^[a-z][a-z0-9_]{0,79}$'),name text not null check(char_length(btrim(name))between 1 and 120),
 source text not null check(source in('workflow','system','inventory','appointment','approval','billing','ai_recommendation')),
 channel text not null check(channel in('in_app','email','sms','messenger','viber','push')),
 subject_template text check(subject_template is null or char_length(subject_template)between 1 and 200),body_template text not null check(char_length(body_template)between 1 and 4000),
 deep_link_template text check(deep_link_template is null or(deep_link_template like '/%'and char_length(deep_link_template)<=500)),variable_keys text[]not null default'{}',
 is_active boolean not null default true,created_by uuid references auth.users(id),updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,organization_id),unique(organization_id,key,channel),check(cardinality(variable_keys)<=30)
);
create trigger set_updated_at before update on public.notification_templates for each row execute function private.set_updated_at();

create table public.notification_preferences(
 organization_id uuid not null references public.organizations(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,
 source text not null check(source in('workflow','system','inventory','appointment','approval','billing','ai_recommendation')),
 channel text not null check(channel in('in_app','email','sms','messenger','viber','push')),is_enabled boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,user_id,source,channel)
);
create trigger set_updated_at before update on public.notification_preferences for each row execute function private.set_updated_at();

create table public.notifications(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id)on delete cascade,recipient_user_id uuid not null references auth.users(id)on delete cascade,
 source text not null check(source in('workflow','system','inventory','appointment','approval','billing','ai_recommendation')),template_id uuid,
 title text not null check(char_length(btrim(title))between 1 and 200),body text not null check(char_length(body)between 1 and 4000),
 deep_link text check(deep_link is null or(deep_link like '/%'and char_length(deep_link)<=500)),priority text not null default'normal'check(priority in('low','normal','high','urgent')),
 data jsonb not null default'{}'check(jsonb_typeof(data)='object'),idempotency_key text not null check(char_length(btrim(idempotency_key))between 8 and 180),
 actor_id uuid references auth.users(id),read_at timestamptz,created_at timestamptz not null default clock_timestamp(),
 foreign key(template_id,organization_id)references public.notification_templates(id,organization_id)on delete set null,unique(id,organization_id),unique(organization_id,recipient_user_id,idempotency_key)
);
create index notifications_recipient_inbox_idx on public.notifications(organization_id,recipient_user_id,created_at desc,id);
create index notifications_recipient_unread_idx on public.notifications(organization_id,recipient_user_id,created_at desc)where read_at is null;

create table public.notification_deliveries(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,notification_id uuid not null,
 channel text not null check(channel in('in_app','email','sms','messenger','viber','push')),destination text,
 status text not null check(status in('pending','processing','sent','failed','skipped')),attempt_count integer not null default 0 check(attempt_count between 0 and 25),
 provider text,provider_message_id text,last_error text check(last_error is null or char_length(last_error)<=1000),next_attempt_at timestamptz,sent_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(notification_id,channel),
 foreign key(notification_id,organization_id)references public.notifications(id,organization_id)on delete cascade
);
create index notification_deliveries_outbox_idx on public.notification_deliveries(channel,next_attempt_at,created_at)where status in('pending','failed');
create trigger set_updated_at before update on public.notification_deliveries for each row execute function private.set_updated_at();

create function private.notification_channel_enabled(requested_organization_id uuid,requested_user_id uuid,requested_source text,requested_channel text)returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select preference.is_enabled from public.notification_preferences preference where preference.organization_id=requested_organization_id and preference.user_id=requested_user_id and preference.source=requested_source and preference.channel=requested_channel),requested_channel in('in_app','email'))
$$;
create function private.notification_recipient_users(requested_organization_id uuid,requested_user_id uuid,requested_role_key text)returns setof uuid language sql stable security definer set search_path='' as $$
 select distinct membership.user_id from public.organization_memberships membership
 where membership.organization_id=requested_organization_id and membership.status='active'and(
  (requested_user_id is not null and membership.user_id=requested_user_id)or
  (requested_role_key is not null and exists(select 1 from public.membership_roles assignment join public.roles role on role.id=assignment.role_id where assignment.membership_id=membership.id and role.organization_id=requested_organization_id and role.key=requested_role_key)))
$$;
create function private.enqueue_notifications(requested_organization_id uuid,requested_source text,requested_recipient_user_id uuid,requested_recipient_role_key text,requested_title text,requested_body text,requested_deep_link text,requested_priority text,requested_data jsonb,requested_idempotency_key text,requested_actor_id uuid default null,requested_template_id uuid default null)returns uuid[] language plpgsql security definer set search_path='' as $$
declare recipient uuid;notification_key uuid;created_ids uuid[]:='{}'::uuid[];email_address text;in_app_enabled boolean;email_enabled boolean;
begin
 if requested_source not in('workflow','system','inventory','appointment','approval','billing','ai_recommendation')or(requested_recipient_user_id is null)=(requested_recipient_role_key is null)or jsonb_typeof(requested_data)<>'object'or char_length(btrim(requested_idempotency_key))not between 8 and 180 then raise exception'Invalid notification.'using errcode='22023';end if;
 if requested_deep_link is not null and requested_deep_link<>('/business/'||requested_organization_id)and requested_deep_link not like('/business/'||requested_organization_id||'/%')then raise exception'Invalid notification deep link.'using errcode='22023';end if;
 for recipient in select*from private.notification_recipient_users(requested_organization_id,requested_recipient_user_id,requested_recipient_role_key)loop
  in_app_enabled:=private.notification_channel_enabled(requested_organization_id,recipient,requested_source,'in_app');email_enabled:=private.notification_channel_enabled(requested_organization_id,recipient,requested_source,'email');
  if in_app_enabled or email_enabled then
   insert into public.notifications(organization_id,recipient_user_id,source,template_id,title,body,deep_link,priority,data,idempotency_key,actor_id)
   values(requested_organization_id,recipient,requested_source,requested_template_id,btrim(requested_title),requested_body,requested_deep_link,requested_priority,requested_data,btrim(requested_idempotency_key),requested_actor_id)
   on conflict(organization_id,recipient_user_id,idempotency_key)do update set idempotency_key=excluded.idempotency_key returning id into notification_key;
   created_ids:=array_append(created_ids,notification_key);
   if in_app_enabled then insert into public.notification_deliveries(organization_id,notification_id,channel,status,sent_at)values(requested_organization_id,notification_key,'in_app','sent',clock_timestamp())on conflict(notification_id,channel)do nothing;end if;
   if email_enabled then select email into email_address from auth.users where id=recipient;insert into public.notification_deliveries(organization_id,notification_id,channel,destination,status,next_attempt_at)values(requested_organization_id,notification_key,'email',email_address,case when email_address is null then'skipped'else'pending'end,case when email_address is null then null else clock_timestamp()end)on conflict(notification_id,channel)do nothing;end if;
  end if;
 end loop;
 return created_ids;
end$$;

create function private.mirror_workflow_notification()returns trigger language plpgsql security definer set search_path='' as $$begin
 perform private.enqueue_notifications(new.organization_id,'workflow',new.recipient_user_id,new.recipient_role_key,new.title,new.message,'/business/'||new.organization_id||'/workflows','normal',jsonb_build_object('workflowNotificationId',new.id,'executionStepId',new.execution_step_id),'workflow:'||new.execution_step_id,null,null);return new;
end$$;
create trigger mirror_workflow_notification_to_platform after insert on public.workflow_notifications for each row execute function private.mirror_workflow_notification();

create function private.notify_pending_approval_step()returns trigger language plpgsql security definer set search_path='' as $$declare request_title text;begin if new.status='pending'and(tg_op='INSERT'or old.status is distinct from new.status)then select title into request_title from public.approval_requests where id=new.approval_request_id and organization_id=new.organization_id;perform private.enqueue_notifications(new.organization_id,'approval',new.approver_user_id,new.approver_role_key,'Approval required',request_title,'/business/'||new.organization_id||'/approvals/'||new.approval_request_id,'high',jsonb_build_object('approvalRequestId',new.approval_request_id,'approvalStepId',new.id),'approval-step:'||new.id,null,null);end if;return new;end$$;
create trigger notify_pending_approval_step after insert or update of status on public.approval_steps for each row execute function private.notify_pending_approval_step();

create function private.notify_ai_recommendation()returns trigger language plpgsql security definer set search_path='' as $$begin
 perform private.enqueue_notifications(new.organization_id,'ai_recommendation',new.created_by,null,'New business recommendation',new.title,'/business/'||new.organization_id||'/recommendations',case when new.priority in('high','critical')then'high'else'normal'end,jsonb_build_object('recommendationId',new.id,'recommendationType',new.recommendation_type),'ai-recommendation:'||new.id,new.created_by,null);return new;
end$$;
create trigger notify_ai_recommendation after insert on public.ai_recommendations for each row execute function private.notify_ai_recommendation();

create function private.notify_billing_event()returns trigger language plpgsql security definer set search_path='' as $$declare notification_title text;notification_priority text:='normal';begin
 if new.event_type not in('payment_failed','payment_recovered','subscription_activated','plan_changed','renewed','canceled','expired')then return new;end if;
 notification_title:=case new.event_type when'payment_failed'then'Payment needs attention'when'payment_recovered'then'Payment recovered'when'expired'then'Subscription expired'when'canceled'then'Subscription canceled'when'plan_changed'then'Plan changed'when'renewed'then'Subscription renewed'else'Subscription activated'end;
 if new.event_type in('payment_failed','expired','canceled')then notification_priority:='high';end if;
 perform private.enqueue_notifications(new.organization_id,'billing',null,'owner',notification_title,'Review the latest subscription update.','/business/'||new.organization_id||'/billing',notification_priority,jsonb_build_object('billingEventId',new.id,'eventType',new.event_type),'billing-event:'||new.id,new.actor_id,null);return new;
end$$;
create trigger notify_billing_event after insert on public.billing_events for each row execute function private.notify_billing_event();

create function public.mark_notification_read(requested_organization_id uuid,requested_notification_id uuid,requested_read boolean default true)returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception'Permission denied.'using errcode='42501';end if;update public.notifications set read_at=case when requested_read then clock_timestamp()else null end where id=requested_notification_id and organization_id=requested_organization_id and recipient_user_id=auth.uid();if not found then raise exception'Notification not found.'using errcode='P0002';end if;
end$$;
create function public.mark_all_notifications_read(requested_organization_id uuid)returns bigint language plpgsql security definer set search_path='' as $$declare affected bigint;begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'notification.read',null)then raise exception'Permission denied.'using errcode='42501';end if;update public.notifications set read_at=clock_timestamp()where organization_id=requested_organization_id and recipient_user_id=auth.uid()and read_at is null;get diagnostics affected=row_count;return affected;
end$$;
create function public.save_notification_preference(requested_organization_id uuid,requested_source text,requested_channel text,requested_enabled boolean)returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'notification.read',null)or requested_source not in('workflow','system','inventory','appointment','approval','billing','ai_recommendation')or requested_channel not in('in_app','email')then raise exception'Permission denied.'using errcode='42501';end if;
 insert into public.notification_preferences(organization_id,user_id,source,channel,is_enabled)values(requested_organization_id,auth.uid(),requested_source,requested_channel,requested_enabled)on conflict(organization_id,user_id,source,channel)do update set is_enabled=excluded.is_enabled,updated_at=now();
end$$;
create function public.dispatch_business_notification(requested_organization_id uuid,requested_source text,requested_recipient_user_id uuid,requested_recipient_role_key text,requested_title text,requested_body text,requested_deep_link text,requested_priority text,requested_data jsonb,requested_idempotency_key text)returns uuid[] language plpgsql security definer set search_path='' as $$begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'notification.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;return private.enqueue_notifications(requested_organization_id,requested_source,requested_recipient_user_id,requested_recipient_role_key,requested_title,requested_body,requested_deep_link,requested_priority,requested_data,requested_idempotency_key,auth.uid(),null);
end$$;
create function public.save_notification_template(requested_organization_id uuid,requested_template_id uuid,requested_key text,requested_name text,requested_source text,requested_channel text,requested_subject_template text,requested_body_template text,requested_deep_link_template text,requested_variable_keys text[],requested_is_active boolean)returns uuid language plpgsql security definer set search_path='' as $$declare result_id uuid;begin
 if auth.uid()is null or not private.can_business_permission(requested_organization_id,'notification.manage',null)then raise exception'Permission denied.'using errcode='42501';end if;
 if requested_channel not in('in_app','email')or requested_source not in('workflow','system','inventory','appointment','approval','billing','ai_recommendation')or(requested_deep_link_template is not null and requested_deep_link_template not like('/business/'||requested_organization_id||'%'))then raise exception'Invalid notification template.'using errcode='22023';end if;
 if requested_template_id is null then insert into public.notification_templates(organization_id,key,name,source,channel,subject_template,body_template,deep_link_template,variable_keys,is_active,created_by,updated_by)values(requested_organization_id,requested_key,requested_name,requested_source,requested_channel,requested_subject_template,requested_body_template,requested_deep_link_template,requested_variable_keys,requested_is_active,auth.uid(),auth.uid())returning id into result_id;
 else update public.notification_templates set key=requested_key,name=requested_name,source=requested_source,channel=requested_channel,subject_template=requested_subject_template,body_template=requested_body_template,deep_link_template=requested_deep_link_template,variable_keys=requested_variable_keys,is_active=requested_is_active,updated_by=auth.uid()where id=requested_template_id and organization_id=requested_organization_id returning id into result_id;if result_id is null then raise exception'Notification template not found.'using errcode='P0002';end if;end if;return result_id;
end$$;

alter table public.notification_templates enable row level security;alter table public.notification_preferences enable row level security;alter table public.notifications enable row level security;alter table public.notification_deliveries enable row level security;
create policy notification_templates_read on public.notification_templates for select to authenticated using(private.can_business_permission(organization_id,'notification.read',null)or private.can_business_permission(organization_id,'notification.manage',null));
create policy notification_preferences_own_read on public.notification_preferences for select to authenticated using(user_id=(select auth.uid())and private.can_business_permission(organization_id,'notification.read',null));
create policy notifications_recipient_read on public.notifications for select to authenticated using(recipient_user_id=(select auth.uid())and private.can_business_permission(organization_id,'notification.read',null));
create policy notification_deliveries_recipient_read on public.notification_deliveries for select to authenticated using(exists(select 1 from public.notifications notification where notification.id=notification_deliveries.notification_id and notification.organization_id=notification_deliveries.organization_id and notification.recipient_user_id=(select auth.uid())));
revoke all on public.notification_templates,public.notification_preferences,public.notifications,public.notification_deliveries from public,anon,authenticated;
grant select on public.notification_templates,public.notification_preferences,public.notifications,public.notification_deliveries to authenticated;
grant select on public.notification_templates,public.notifications,public.notification_deliveries to service_role;grant update on public.notification_deliveries to service_role;
revoke all on function private.install_notification_permissions(uuid),private.handle_main_branch_notification_permissions(),private.notification_channel_enabled(uuid,uuid,text,text),private.notification_recipient_users(uuid,uuid,text),private.enqueue_notifications(uuid,text,uuid,text,text,text,text,text,jsonb,text,uuid,uuid),private.mirror_workflow_notification(),private.notify_pending_approval_step(),private.notify_ai_recommendation(),private.notify_billing_event()from public,anon,authenticated;
revoke all on function public.mark_notification_read(uuid,uuid,boolean),public.mark_all_notifications_read(uuid),public.save_notification_preference(uuid,text,text,boolean),public.dispatch_business_notification(uuid,text,uuid,text,text,text,text,text,jsonb,text),public.save_notification_template(uuid,uuid,text,text,text,text,text,text,text,text[],boolean)from public,anon,authenticated;
grant execute on function public.mark_notification_read(uuid,uuid,boolean),public.mark_all_notifications_read(uuid),public.save_notification_preference(uuid,text,text,boolean),public.dispatch_business_notification(uuid,text,uuid,text,text,text,text,text,jsonb,text),public.save_notification_template(uuid,uuid,text,text,text,text,text,text,text,text[],boolean)to authenticated;

do $$begin alter publication supabase_realtime add table public.notifications;exception when duplicate_object then null;end$$;
comment on table public.notifications is'Logical, recipient-owned notifications with read state and tenant-relative deep links.';
comment on table public.notification_deliveries is'Provider-neutral channel outbox. In-app is delivered synchronously; email is queued for a configured adapter.';
