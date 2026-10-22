begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000001','authenticated','authenticated','workflow-owner@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('workflow-test','Workflow Test Legal','Workflow Test','corporation','retail','{"city":"Manila"}'::jsonb);
select set_config('test.workflow_org',(select id::text from public.organizations where slug='workflow-test'),true);
select public.create_dynamic_object(current_setting('test.workflow_org')::uuid,'quotation','Quotation','Quotations','');
select set_config('test.workflow_object',(select id::text from public.object_definitions where organization_id=current_setting('test.workflow_org')::uuid and key='quotation'),true);
select public.upsert_object_field(current_setting('test.workflow_org')::uuid,current_setting('test.workflow_object')::uuid,'discount_percentage','Discount percentage','percentage',false,false,'{"options":[],"validation":{},"visibility":"visible","readOnly":false}'::jsonb);

select is(public.can_business_permission(current_setting('test.workflow_org')::uuid,'workflow.manage'),true,'Owner can manage workflows');
select set_config('test.workflow_id',(select public.save_workflow_definition(
  current_setting('test.workflow_org')::uuid,'approve_large_discount','Approve large discount','',
  jsonb_build_object('type','record.updated','objectDefinitionId',current_setting('test.workflow_object')),
  '{"logic":"all","conditions":[{"fieldKey":"discount_percentage","operator":"greater_than","value":10}]}'::jsonb,
  '[{"key":"manager_approval","name":"Store Manager approval","type":"request_approval","continueOnFailure":false,"approverRoleKey":"manager","title":"Approve quotation discount"}]'::jsonb,
  '{"maxAttempts":3,"backoffSeconds":60}'::jsonb,'active')::text),true);
select pass('A declarative approval workflow can be saved');
select results_eq($$select name,status,version from public.workflow_definitions where id=current_setting('test.workflow_id')::uuid$$,$$values ('Approve large discount'::text,'active'::text,1)$$,'Definition stores versioned trigger, conditions, and actions');
select results_eq($$select event,version from public.workflow_audit_history where workflow_definition_id=current_setting('test.workflow_id')::uuid$$,$$values ('created'::text,1)$$,'Creation writes immutable audit history');
select throws_ok($$update public.workflow_definitions set name='Tampered' where id=current_setting('test.workflow_id')::uuid$$,'42501','permission denied for table workflow_definitions','Direct definition mutation is denied');
select throws_ok($$select public.save_workflow_definition(current_setting('test.workflow_org')::uuid,'unsafe','Unsafe','',jsonb_build_object('type','manual'),'{"logic":"all","conditions":[]}'::jsonb,'[{"key":"bad","name":"Bad","type":"create_task","continueOnFailure":false,"title":"Bad","javascript":"eval(input)"}]'::jsonb,'{"maxAttempts":1,"backoffSeconds":0}'::jsonb,'active')$$,'22023','Invalid workflow definition.','Unknown executable action properties are rejected');
select throws_ok($$select public.save_workflow_definition(current_setting('test.workflow_org')::uuid,'duplicate','Duplicate','',jsonb_build_object('type','manual'),'{"logic":"all","conditions":[]}'::jsonb,'[{"key":"same","name":"One","type":"create_task","continueOnFailure":false,"title":"One"},{"key":"same","name":"Two","type":"create_task","continueOnFailure":false,"title":"Two"}]'::jsonb,'{"maxAttempts":1,"backoffSeconds":0}'::jsonb,'active')$$,'22023','Invalid workflow definition.','Action keys must be unique');
select lives_ok($$select public.save_workflow_definition(current_setting('test.workflow_org')::uuid,'approve_large_discount','Approve large discount','',jsonb_build_object('type','record.updated','objectDefinitionId',current_setting('test.workflow_object')),'{"logic":"all","conditions":[{"fieldKey":"discount_percentage","operator":"greater_than","value":10}]}'::jsonb,'[{"key":"manager_approval","name":"Store Manager approval","type":"request_approval","continueOnFailure":false,"approverRoleKey":"manager","title":"Approve quotation discount"}]'::jsonb,'{"maxAttempts":3,"backoffSeconds":60}'::jsonb,'disabled',current_setting('test.workflow_id')::uuid)$$,'Workflow can be disabled');
select results_eq($$select status,version from public.workflow_definitions where id=current_setting('test.workflow_id')::uuid$$,$$values ('disabled'::text,2)$$,'Disabling increments the version');
select results_eq($$select event from public.workflow_audit_history where workflow_definition_id=current_setting('test.workflow_id')::uuid order by version desc limit 1$$,$$values ('disabled'::text)$$,'Disable is audited');

insert into public.workflow_executions (organization_id,workflow_definition_id,workflow_version,trigger_type,idempotency_key,status,attempt,max_attempts,test_run,initiated_by)
values (current_setting('test.workflow_org')::uuid,current_setting('test.workflow_id')::uuid,2,'manual','test:one','running',1,3,true,'71000000-0000-4000-8000-000000000001');
select pass('Execution logs accept bounded lifecycle states');
select throws_ok($$insert into public.workflow_executions (organization_id,workflow_definition_id,workflow_version,trigger_type,idempotency_key,attempt,max_attempts,initiated_by) values (current_setting('test.workflow_org')::uuid,current_setting('test.workflow_id')::uuid,2,'manual','test:one',1,3,'71000000-0000-4000-8000-000000000001')$$,'23505',null,'Idempotency prevents duplicate execution');
select set_config('test.execution_id',(select id::text from public.workflow_executions where idempotency_key='test:one'),true);
insert into public.workflow_execution_steps (organization_id,execution_id,action_key,action_type,position,status,attempt)
values (current_setting('test.workflow_org')::uuid,current_setting('test.execution_id')::uuid,'manager_approval','request_approval',0,'failed',1);
select results_eq($$select status,attempt from public.workflow_execution_steps where execution_id=current_setting('test.execution_id')::uuid$$,$$values ('failed'::text,1)$$,'Failure state and attempt are logged per step');
select ok(exists(select 1 from pg_indexes where indexname='workflow_executions_retry_idx'),'Retry queue has a partial due-time index');
select ok(exists(select 1 from pg_indexes where tablename='workflow_executions' and indexdef like '%(organization_id, workflow_definition_id, idempotency_key)%'),'Execution idempotency is database-enforced');
select throws_ok($$insert into public.workflow_execution_steps (organization_id,execution_id,action_key,action_type,position,status,attempt) values (current_setting('test.workflow_org')::uuid,current_setting('test.execution_id')::uuid,'code','eval',1,'running',1)$$,'23514',null,'Only allow-listed action types can execute');

select * from finish();
rollback;
