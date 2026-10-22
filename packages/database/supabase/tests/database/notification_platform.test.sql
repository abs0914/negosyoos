begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)values
('00000000-0000-0000-0000-000000000000','93600000-0000-4000-8000-000000000001','authenticated','authenticated','notify-owner@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93600000-0000-4000-8000-000000000002','authenticated','authenticated','notify-manager@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93600000-0000-4000-8000-000000000003','authenticated','authenticated','notify-outsider@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('notification-platform','Notification Platform Inc','Notification Platform','corporation','services','{"city":"Makati"}');
select set_config('test.notify_org',(select id::text from public.organizations where slug='notification-platform'),true);
select is(public.can_business_permission(current_setting('test.notify_org')::uuid,'notification.read'),true,'Owner receives notification read permission');
select is(public.can_business_permission(current_setting('test.notify_org')::uuid,'notification.manage'),true,'Owner receives notification manage permission');

reset role;
insert into public.organization_memberships(organization_id,user_id,status,joined_at)values(current_setting('test.notify_org')::uuid,'93600000-0000-4000-8000-000000000002','active',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_member_access(current_setting('test.notify_org')::uuid,(select id from public.organization_memberships where organization_id=current_setting('test.notify_org')::uuid and user_id='93600000-0000-4000-8000-000000000002'),array[(select id from public.roles where organization_id=current_setting('test.notify_org')::uuid and key='manager')],'all','{}'::uuid[]);
select results_eq($$select permission.key from public.roles role join public.role_permissions rp on rp.role_id=role.id join public.permissions permission on permission.id=rp.permission_id where role.organization_id=current_setting('test.notify_org')::uuid and role.key='manager'and permission.key like'notification.%'order by permission.key$$,$$select unnest(array['notification.manage'::text,'notification.read'::text])$$,'Managers receive notification read and management permissions');

select lives_ok($$select public.dispatch_business_notification(current_setting('test.notify_org')::uuid,'system',null,'manager','Store update','Please review today''s opening checklist','/business/'||current_setting('test.notify_org')||'/settings','normal','{}','system-checklist-0001')$$,'A manager notification can be dispatched through a role');
reset role;
select results_eq($$select recipient_user_id,source,title,read_at is null from public.notifications where organization_id=current_setting('test.notify_org')::uuid$$,$$select '93600000-0000-4000-8000-000000000002'::uuid,'system'::text,'Store update'::text,true$$,'Role dispatch resolves to an active member-owned notification');
select results_eq($$select channel,status from public.notification_deliveries where organization_id=current_setting('test.notify_org')::uuid order by channel$$,$$select*from(values('email'::text,'pending'::text),('in_app'::text,'sent'::text))as expected(channel,status)$$,'Initial in-app and email channels produce separate deliveries');
select results_eq($$select destination from public.notification_deliveries where organization_id=current_setting('test.notify_org')::uuid and channel='email'$$,$$select 'notify-manager@example.test'::text$$,'The email outbox resolves the authenticated user email privately');
set local role authenticated;
select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.dispatch_business_notification(current_setting('test.notify_org')::uuid,'system',null,'manager','Changed title','Replay must not overwrite','/business/'||current_setting('test.notify_org')||'/billing','urgent','{}','system-checklist-0001')$$,'Dispatch replay is safe');
reset role;
select results_eq($$select count(*)from public.notifications where organization_id=current_setting('test.notify_org')::uuid$$,$$values (1::bigint)$$,'A replay cannot duplicate recipient notifications');
set local role authenticated;
select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select results_eq($$select count(*)from public.notifications$$,$$values (0::bigint)$$,'Recipient RLS hides the manager notification from the owner');
select throws_ok($$select public.dispatch_business_notification(current_setting('test.notify_org')::uuid,'billing',null,'manager','Unsafe','Link','https://example.com','normal','{}','unsafe-link-0001')$$,'22023','Invalid notification deep link.','Deep links cannot leave the current Business');

select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select results_eq($$select title from public.notifications$$,$$values ('Store update'::text)$$,'The recipient can read their own notification');
select lives_ok($$select public.mark_notification_read(current_setting('test.notify_org')::uuid,(select id from public.notifications limit 1),true)$$,'A recipient can mark a notification read');
select results_eq($$select read_at is not null from public.notifications$$,$$values (true)$$,'Read state is timestamped');
select lives_ok($$select public.mark_notification_read(current_setting('test.notify_org')::uuid,(select id from public.notifications limit 1),false)$$,'A recipient can restore unread state');
select results_eq($$select public.mark_all_notifications_read(current_setting('test.notify_org')::uuid)$$,$$values (1::bigint)$$,'Mark all read returns the affected count');
select lives_ok($$select public.save_notification_preference(current_setting('test.notify_org')::uuid,'inventory','email',false)$$,'A member can disable inventory email');

select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.dispatch_business_notification(current_setting('test.notify_org')::uuid,'inventory','93600000-0000-4000-8000-000000000002',null,'Low stock','Five items need attention','/business/'||current_setting('test.notify_org')||'/inventory','high','{"lowStockCount":5}','inventory-low-0001')$$,'Inventory can dispatch to a specific user');
reset role;
select results_eq($$select channel from public.notification_deliveries delivery join public.notifications notification on notification.id=delivery.notification_id where notification.idempotency_key='inventory-low-0001'$$,$$values ('in_app'::text)$$,'A disabled email preference suppresses only the email delivery');

set local role authenticated;
select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.save_notification_preference(current_setting('test.notify_org')::uuid,'inventory','in_app',false)$$,'A member can disable inventory in-app notifications');
select lives_ok($$select public.save_notification_template(current_setting('test.notify_org')::uuid,null,'approval_required','Approval required','approval','email','Please review {{record_name}}','{{record_name}} needs approval.','/business/'||current_setting('test.notify_org')||'/approvals',array['record_name'],true)$$,'A manager can create a safe metadata template');
select results_eq($$select key,channel,variable_keys from public.notification_templates$$,$$values ('approval_required'::text,'email'::text,array['record_name']::text[])$$,'NotificationTemplate stores channel and declarative variables');
select throws_ok($$insert into public.notifications(organization_id,recipient_user_id,source,title,body,idempotency_key)values(current_setting('test.notify_org')::uuid,'93600000-0000-4000-8000-000000000002','system','Bypass','Bypass','direct-bypass-0001')$$,'42501','permission denied for table notifications','Clients cannot bypass notification dispatch');

select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.notify_approval',public.create_approval_request(current_setting('test.notify_org')::uuid,'discount','Discount approval','Review discount',null,null,null,'[{"key":"manager","name":"Manager","approverRoleKey":"manager"}]')::text,true);
reset role;
select results_eq($$select source,title,deep_link from public.notifications where idempotency_key like'approval-step:%'$$,$$values ('approval'::text,'Approval required'::text,'/business/'||current_setting('test.notify_org')||'/approvals/'||current_setting('test.notify_approval'))$$,'A pending approval step automatically creates a deep-linked notification');
insert into public.billing_events(organization_id,event_type,idempotency_key,actor_id,from_plan_key,to_plan_key)values(current_setting('test.notify_org')::uuid,'expired','notification-billing-event-0001','93600000-0000-4000-8000-000000000001','starter','starter');
select results_eq($$select source,title from public.notifications where idempotency_key like'billing-event:%'$$,$$values ('billing'::text,'Subscription expired'::text)$$,'Billing lifecycle events notify the Business owner');
insert into public.ai_recommendations(organization_id,rule_key,recommendation_type,title,summary,reason,supporting_metrics,required_permissions,priority,potential_action,evidence_fingerprint,created_by)values(current_setting('test.notify_org')::uuid,'notify_test','operations','Review opening checklist','Summary','Reason','[{"key":"sales_today","source":"metric","label":"Sales","formattedValue":"PHP 0","data":{"metricKey":"sales_today"}}]','{sales.read}','high','Review checklist',repeat('0',64),'93600000-0000-4000-8000-000000000001');
select results_eq($$select source,title from public.notifications where idempotency_key like'ai-recommendation:%'$$,$$values ('ai_recommendation'::text,'New business recommendation'::text)$$,'AI recommendation creation notifies the user who generated it');

set local role authenticated;
select set_config('request.jwt.claim.sub','93600000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"93600000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select results_eq($$select count(*)from public.notifications$$,$$values (0::bigint)$$,'An outsider cannot read another Business notification inbox');
select throws_ok($$select public.save_notification_preference(current_setting('test.notify_org')::uuid,'system','email',false)$$,'42501','Permission denied.','An outsider cannot change Business notification preferences');
select throws_ok($$select public.mark_notification_read(current_setting('test.notify_org')::uuid,(select id from public.notifications limit 1),true)$$,'P0002','Notification not found.','An outsider cannot mutate another recipient notification');

select *from finish();rollback;
