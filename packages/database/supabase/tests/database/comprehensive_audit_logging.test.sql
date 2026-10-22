begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)values
('00000000-0000-0000-0000-000000000000','93700000-0000-4000-8000-000000000001','authenticated','authenticated','audit-owner@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93700000-0000-4000-8000-000000000002','authenticated','authenticated','audit-admin@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93700000-0000-4000-8000-000000000003','authenticated','authenticated','audit-manager@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','93700000-0000-4000-8000-000000000004','authenticated','authenticated','audit-outsider@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','93700000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93700000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('audit-logging','Audit Logging Inc','Audit Logging','corporation','services','{"city":"Makati"}');
select set_config('test.audit_org',(select id::text from public.organizations where slug='audit-logging'),true);
select set_config('test.audit_branch',(select id::text from public.branches where organization_id=current_setting('test.audit_org')::uuid and code='main'),true);
select is(public.can_business_permission(current_setting('test.audit_org')::uuid,'audit.read'),true,'Owner receives audit read permission');

reset role;
insert into public.organization_memberships(organization_id,user_id,status,joined_at)values
(current_setting('test.audit_org')::uuid,'93700000-0000-4000-8000-000000000002','active',now()),
(current_setting('test.audit_org')::uuid,'93700000-0000-4000-8000-000000000003','active',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','93700000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"93700000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_member_access(current_setting('test.audit_org')::uuid,(select id from public.organization_memberships where organization_id=current_setting('test.audit_org')::uuid and user_id='93700000-0000-4000-8000-000000000002'),array[(select id from public.roles where organization_id=current_setting('test.audit_org')::uuid and key='administrator')],'all','{}'::uuid[]);
select public.assign_member_access(current_setting('test.audit_org')::uuid,(select id from public.organization_memberships where organization_id=current_setting('test.audit_org')::uuid and user_id='93700000-0000-4000-8000-000000000003'),array[(select id from public.roles where organization_id=current_setting('test.audit_org')::uuid and key='manager')],'all','{}'::uuid[]);
select ok(exists(select 1 from public.roles role join public.role_permissions assignment on assignment.role_id=role.id join public.permissions permission on permission.id=assignment.permission_id where role.organization_id=current_setting('test.audit_org')::uuid and role.key='owner'and permission.key='audit.read'),'Owner role stores the administrator audit permission');

select set_config('request.headers','{"x-forwarded-for":"203.0.113.7, 10.0.0.1","user-agent":"Audit Browser/1.0","x-request-id":"audit-request-1","authorization":"Bearer never-copy"}',true);
update public.branches set name='Renamed Main Branch'where id=current_setting('test.audit_branch')::uuid;
select is((select jsonb_build_array(action,entity_type,entity_id,source,actor_user_id)from public.audit_events where organization_id=current_setting('test.audit_org')::uuid and entity_type='branches'and entity_id=current_setting('test.audit_branch')order by occurred_at desc limit 1),jsonb_build_array('updated','branches',current_setting('test.audit_branch'),'user','93700000-0000-4000-8000-000000000001'),'A normal business mutation captures action, entity, actor and source');
select is((select jsonb_build_array(before_data->>'name',after_data->>'name')from public.audit_events where organization_id=current_setting('test.audit_org')::uuid and entity_type='branches'and entity_id=current_setting('test.audit_branch')order by occurred_at desc limit 1),jsonb_build_array('Main Branch','Renamed Main Branch'),'Update events preserve before and after snapshots');
select is((select jsonb_build_array(ip_metadata->>'ipAddress',ip_metadata->>'userAgent',ip_metadata->>'requestId',ip_metadata?'authorization')from public.audit_events where organization_id=current_setting('test.audit_org')::uuid and entity_type='branches'and entity_id=current_setting('test.audit_branch')order by occurred_at desc limit 1),jsonb_build_array('203.0.113.7','Audit Browser/1.0','audit-request-1',false),'Only allowlisted IP request metadata is retained');

reset role;
select private.write_audit_event(current_setting('test.audit_org')::uuid,current_setting('test.audit_branch')::uuid,'93700000-0000-4000-8000-000000000001','credentials_checked','integration',null,'{"password":"old","nested":{"apiKey":"abc","safe":"visible"},"items":[{"card_number":"4111111111111111"}]}'::jsonb,'{"refresh_token":"new","accountNumber":"123","safe":"after"}'::jsonb,'api','{"requestId":"api-1","authorization":"do-not-store"}'::jsonb);
select is((select jsonb_build_array(before_data->>'password',before_data#>>'{nested,apiKey}',before_data#>>'{nested,safe}',before_data#>>'{items,0,card_number}',after_data->>'refresh_token',after_data->>'accountNumber')from public.audit_events where organization_id=current_setting('test.audit_org')::uuid and action='credentials_checked'),jsonb_build_array('[REDACTED]','[REDACTED]','visible','[REDACTED]','[REDACTED]','[REDACTED]'),'Sensitive values are recursively redacted before storage');
select is((select jsonb_build_array(source,ip_metadata->>'requestId',ip_metadata->>'authorization')from public.audit_events where organization_id=current_setting('test.audit_org')::uuid and action='credentials_checked'),jsonb_build_array('api','api-1','[REDACTED]'),'Controlled writers can record API source and sanitized metadata');
select is(private.audit_source_for_table('ai_recommendations','{}'::jsonb),'ai','AI activity is classified');
select is(private.audit_source_for_table('configuration_versions','{"source":"ai"}'::jsonb),'ai','AI configuration versions retain their AI source');
select is(private.audit_source_for_table('workflow_execution_steps','{}'::jsonb),'workflow','Workflow activity is classified');

set local role authenticated;
select set_config('request.jwt.claim.sub','93700000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"93700000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.can_business_permission(current_setting('test.audit_org')::uuid,'audit.read'),true,'Administrator receives audit read permission');
select ok((select count(*)>0 from public.audit_events where organization_id=current_setting('test.audit_org')::uuid),'Administrator can read business audit events');

select set_config('request.jwt.claim.sub','93700000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"93700000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is(public.can_business_permission(current_setting('test.audit_org')::uuid,'audit.read'),false,'Manager does not receive administrator audit access');
select is((select count(*)from public.audit_events where organization_id=current_setting('test.audit_org')::uuid),0::bigint,'RLS hides audit events from a manager without permission');
select throws_ok($$insert into public.audit_events(organization_id,action,entity_type,source)values(current_setting('test.audit_org')::uuid,'forged','test','user')$$,'42501',null,'Authenticated users cannot directly forge audit events');
select throws_ok($$update public.audit_events set action='forged'where organization_id=current_setting('test.audit_org')::uuid$$,'42501',null,'Authenticated users cannot alter audit events');
select throws_ok($$delete from public.audit_events where organization_id=current_setting('test.audit_org')::uuid$$,'42501',null,'Authenticated users cannot delete audit events');

select set_config('request.jwt.claim.sub','93700000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"93700000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select is((select count(*)from public.audit_events where organization_id=current_setting('test.audit_org')::uuid),0::bigint,'Tenant isolation hides logs from an outsider');

reset role;
select throws_ok($$update public.audit_events set action='forged'where organization_id=current_setting('test.audit_org')::uuid$$,'P0001','Audit events are immutable.','Even privileged normal SQL cannot update immutable audit rows');
select throws_ok($$delete from public.audit_events where organization_id=current_setting('test.audit_org')::uuid$$,'P0001','Audit events are immutable.','Even privileged normal SQL cannot delete immutable audit rows');
select throws_ok($$select private.write_audit_event(current_setting('test.audit_org')::uuid,null,null,'Bad Action','test',null,null,'{}','system',null)$$,'22023','Invalid audit event.','Controlled writers reject invalid actions');
select throws_ok($$select private.write_audit_event(current_setting('test.audit_org')::uuid,'93700000-0000-4000-8000-000000000099',null,'created','test',null,null,'{}','system',null)$$,'22023','Invalid audit scope.','Controlled writers reject a foreign branch scope');
select has_index('public','audit_events','audit_events_business_time_idx','Audit timeline has a tenant and time index');
select has_trigger('public','audit_events','audit_events_immutable','The canonical audit table has an immutable trigger');
select ok((select count(*)>5 from pg_trigger trigger join pg_class relation on relation.oid=trigger.tgrelid join pg_namespace namespace on namespace.oid=relation.relnamespace where namespace.nspname='public'and trigger.tgname='capture_business_audit_event'and not trigger.tgisinternal),'Current tenant tables are connected to comprehensive capture');

select*from finish();
rollback;
