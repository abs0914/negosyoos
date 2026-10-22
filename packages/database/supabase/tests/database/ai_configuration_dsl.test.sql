begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','92500000-0000-4000-8000-000000000001','authenticated','authenticated','ai-owner@example.test','',now(),now(),now()),
('00000000-0000-0000-0000-000000000000','92500000-0000-4000-8000-000000000002','authenticated','authenticated','ai-outsider@example.test','',now(),now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','92500000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"92500000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('ai-dsl-test','AI DSL Test','AI DSL Test','corporation','retail','{"city":"Manila"}');
select set_config('test.ai_org',(select id::text from public.organizations where slug='ai-dsl-test'),true);

select is(public.can_business_permission(current_setting('test.ai_org')::uuid,'ai.manage'),true,'Owner can manage AI configuration proposals');
select throws_ok($$select public.submit_ai_configuration_proposal(current_setting('test.ai_org')::uuid,'Unsafe SQL','Must fail','[{"operation":"add_object","object":{"key":"x"},"sql":"drop table users"}]',0)$$,'22023','Invalid AI configuration proposal.','SQL-bearing proposals are rejected');
select throws_ok($$select public.submit_ai_configuration_proposal(current_setting('test.ai_org')::uuid,'Unknown','Must fail','[{"operation":"execute_code","command":"whoami"}]',0)$$,'22023','Invalid AI configuration proposal.','Unknown executable operations are rejected');
select set_config('test.ai_proposal',(select public.submit_ai_configuration_proposal(current_setting('test.ai_org')::uuid,'Rename customers','Use client terminology','[{"operation":"rename_entity","entityKey":"customer","singularLabel":"Client","pluralLabel":"Clients"}]',0,'[]')::text),true);
select ok(current_setting('test.ai_proposal')::uuid is not null,'A safe declarative proposal is stored');
select is((select status||':'||base_revision||':'||target_revision from public.configuration_change_sets where id=current_setting('test.ai_proposal')::uuid),'validated:0:1','Proposal is validated against its base revision');
select is((select count(*)from public.configuration_change_set_events where change_set_id=current_setting('test.ai_proposal')::uuid),2::bigint,'Proposal and validation events are immutable audit records');
select is((select validation_result->>'schema' from public.configuration_change_sets where id=current_setting('test.ai_proposal')::uuid),'passed','Schema validation result is recorded');
select is((select validation_result->>'tenantAuthorization' from public.configuration_change_sets where id=current_setting('test.ai_proposal')::uuid),'passed','Tenant authorization result is recorded');
select throws_ok($$update public.configuration_change_sets set status='applied'where id=current_setting('test.ai_proposal')::uuid$$,'42501','permission denied for table configuration_change_sets','Clients cannot bypass the lifecycle RPCs');
select throws_ok($$select public.review_ai_configuration_proposal(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid,'maybe')$$,'22023','Invalid review decision.','Only explicit approve or reject decisions are accepted');
select lives_ok($$select public.review_ai_configuration_proposal(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid,'approved')$$,'A human can approve the preview');
select is((select status||':'||(approved_by is not null)::text||':'||(reviewed_at is not null)::text from public.configuration_change_sets where id=current_setting('test.ai_proposal')::uuid),'approved:true:true','Approval records reviewer and timestamp without applying');
select throws_ok($$select public.review_ai_configuration_proposal(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid,'approved')$$,'P0001','Proposal is not awaiting review.','A proposal cannot be reviewed twice');
select is(jsonb_array_length((select public.begin_ai_configuration_apply(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid)->'operations')),1,'Apply returns only the reviewed declarative operations');
select is((select status from public.configuration_change_sets where id=current_setting('test.ai_proposal')::uuid),'applying','Apply has an explicit in-progress state');
select lives_ok($$select public.complete_ai_configuration_apply(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid,'[{"kind":"entity_label","entityKey":"customer","before":null}]')$$,'Apply stores a rollback snapshot atomically with revision advancement');
select is((select revision from public.organization_configuration_revisions where organization_id=current_setting('test.ai_org')::uuid),1::bigint,'Successful apply advances the tenant revision');
select is((select array_agg(event order by created_at,event)::text[] from public.configuration_change_set_events where change_set_id=current_setting('test.ai_proposal')::uuid),array['applied','apply_started','approved','proposed','validated']::text[],'Full apply lifecycle is audited');
select is(jsonb_array_length(public.begin_ai_configuration_rollback(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid)),1,'Rollback returns the stored snapshot only for the latest applied revision');
select lives_ok($$select public.complete_ai_configuration_rollback(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid)$$,'Rollback completion is audited');
select is((select status||':'||rollback_revision from public.configuration_change_sets where id=current_setting('test.ai_proposal')::uuid),'rolled_back:2','Rollback has a final state and its own revision');
select is((select revision from public.organization_configuration_revisions where organization_id=current_setting('test.ai_org')::uuid),2::bigint,'Rollback advances rather than rewinds the optimistic revision');
select throws_ok($$select public.begin_ai_configuration_rollback(current_setting('test.ai_org')::uuid,current_setting('test.ai_proposal')::uuid)$$,'P0001','Only the latest applied proposal can be rolled back.','A rolled-back proposal cannot be replayed');
select throws_ok($$select public.submit_ai_configuration_proposal(current_setting('test.ai_org')::uuid,'Stale','Must refresh','[{"operation":"rename_entity","entityKey":"customer","singularLabel":"Buyer","pluralLabel":"Buyers"}]',0)$$,'P0001','Configuration revision changed; preview again.','Stale proposals are rejected');

select set_config('request.jwt.claim.sub','92500000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"92500000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.submit_ai_configuration_proposal(current_setting('test.ai_org')::uuid,'Cross tenant','No access','[{"operation":"disable_module","moduleKey":"sales"}]',2)$$,'42501','Permission denied.','An outsider cannot propose changes for another tenant');
select * from finish();
rollback;
