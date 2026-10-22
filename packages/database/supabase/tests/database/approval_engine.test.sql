begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000001','authenticated','authenticated','approval-owner@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('approval-test','Approval Test Legal','Approval Test','corporation','retail','{"city":"Manila"}'::jsonb);
select set_config('test.approval_org',(select id::text from public.organizations where slug='approval-test'),true);

select is(public.can_business_permission(current_setting('test.approval_org')::uuid,'approval.manage'),true,'Owner can manage approvals');
select results_eq($$select count(*) from public.roles role join public.role_permissions rp on rp.role_id=role.id join public.permissions permission on permission.id=rp.permission_id where role.organization_id=current_setting('test.approval_org')::uuid and role.key='manager' and permission.key in ('approval.read','approval.request','approval.decide')$$,$$values (3::bigint)$$,'Manager receives approval routing permissions');

select set_config('test.approval_id',public.create_approval_request(current_setting('test.approval_org')::uuid,'purchase','Purchase approval','Approve a supplier purchase',null,null,null,
  '[{"key":"manager_review","name":"Manager review","approverRoleKey":"manager"},{"key":"owner_review","name":"Owner review","approverUserId":"81000000-0000-4000-8000-000000000001"}]'::jsonb)::text,true);
select results_eq($$select status,current_step_position,total_steps from public.approval_requests where id=current_setting('test.approval_id')::uuid$$,$$values ('pending'::text,0,2)$$,'A multi-step request starts at its first step');
select results_eq($$select status from public.approval_steps where approval_request_id=current_setting('test.approval_id')::uuid order by position$$,$$values ('pending'::text),('waiting'::text)$$,'Only the first approval step is active');
select throws_ok($$insert into public.approval_decisions (organization_id,approval_request_id,approval_step_id,decision,decided_by) select organization_id,approval_request_id,id,'approved','81000000-0000-4000-8000-000000000001' from public.approval_steps where approval_request_id=current_setting('test.approval_id')::uuid limit 1$$,'42501','permission denied for table approval_decisions','Direct decisions are denied');

select public.decide_approval(current_setting('test.approval_org')::uuid,current_setting('test.approval_id')::uuid,(select id from public.approval_steps where approval_request_id=current_setting('test.approval_id')::uuid and position=0),'approved','Within budget');
select results_eq($$select status,current_step_position from public.approval_requests where id=current_setting('test.approval_id')::uuid$$,$$values ('pending'::text,1)$$,'Approving an intermediate step advances the request');
select results_eq($$select status from public.approval_steps where approval_request_id=current_setting('test.approval_id')::uuid order by position$$,$$values ('approved'::text),('pending'::text)$$,'The next sequential step is activated');

select public.decide_approval(current_setting('test.approval_org')::uuid,current_setting('test.approval_id')::uuid,(select id from public.approval_steps where approval_request_id=current_setting('test.approval_id')::uuid and position=1),'approved','Approved');
select results_eq($$select status,completed_at is not null from public.approval_requests where id=current_setting('test.approval_id')::uuid$$,$$values ('approved'::text,true)$$,'The final approval completes the request');
select results_eq($$select count(*) from public.approval_decisions where approval_request_id=current_setting('test.approval_id')::uuid$$,$$values (2::bigint)$$,'Each step has one immutable decision');
select results_eq($$select count(*) from public.approval_audit_history where approval_request_id=current_setting('test.approval_id')::uuid$$,$$values (6::bigint)$$,'Request, activation, step, and terminal actions are audited');
select throws_ok($$select public.decide_approval(current_setting('test.approval_org')::uuid,current_setting('test.approval_id')::uuid,(select id from public.approval_steps where approval_request_id=current_setting('test.approval_id')::uuid and position=1),'approved','Again')$$,'P0001','Approval step is no longer pending.','Terminal decisions cannot be replayed');

select set_config('test.cancel_id',public.create_approval_request(current_setting('test.approval_org')::uuid,'refund','Refund approval','',null,null,null,'[{"key":"owner","name":"Owner","approverRoleKey":"owner"}]'::jsonb)::text,true);
select public.cancel_approval(current_setting('test.approval_org')::uuid,current_setting('test.cancel_id')::uuid,'Customer withdrew the request');
select results_eq($$select status,cancellation_reason from public.approval_requests where id=current_setting('test.cancel_id')::uuid$$,$$values ('cancelled'::text,'Customer withdrew the request'::text)$$,'A pending request can be cancelled with a reason');
select results_eq($$select event from public.approval_audit_history where approval_request_id=current_setting('test.cancel_id')::uuid order by created_at desc limit 1$$,$$values ('cancelled'::text)$$,'Cancellation generates an audit record');
select throws_ok($$update public.approval_audit_history set details='{}' where approval_request_id=current_setting('test.cancel_id')::uuid$$,'42501','permission denied for table approval_audit_history','Audit history is immutable to clients');

select * from finish();
rollback;
