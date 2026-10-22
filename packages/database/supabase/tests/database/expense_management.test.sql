begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)values('00000000-0000-0000-0000-000000000000','94000000-0000-4000-8000-000000000001','authenticated','authenticated','expense-owner@example.test','',now(),now(),now());
set local role authenticated;select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_business('expense-test','Expense Test Legal','Expense Test','sole_proprietorship','retail','{"city":"Manila"}');
select set_config('test.expense_org',(select id::text from public.organizations where slug='expense-test'),true);select set_config('test.expense_branch',(select id::text from public.branches where organization_id=current_setting('test.expense_org')::uuid and code='main'),true);

select is(public.can_business_permission(current_setting('test.expense_org')::uuid,'expenses.manage'),true,'Owner receives expense management permission');
select throws_ok($$select public.save_expense_category(current_setting('test.expense_org')::uuid,null,'Custom','','true')$$,'42501','Permission denied.','Expense mutations require the enabled module');
select lives_ok($$select public.set_business_module_state(current_setting('test.expense_org')::uuid,'expenses',true,'{"approval_threshold":1000}')$$,'Expenses module activates with approval threshold');
select results_eq($$select count(*)from public.expense_categories where organization_id=current_setting('test.expense_org')::uuid$$,$$select 9::bigint$$,'A new Business receives configurable default categories');
select set_config('test.expense_category',public.save_expense_category(current_setting('test.expense_org')::uuid,null,'Internet','Connectivity',true)::text,true);
select results_eq($$select name,description,is_active from public.expense_categories where id=current_setting('test.expense_category')::uuid$$,$$select 'Internet'::text,'Connectivity'::text,true$$,'Custom category is saved');

select set_config('test.expense_draft',public.save_expense(current_setting('test.expense_org')::uuid,null,'2026-08-01',current_setting('test.expense_category')::uuid,current_setting('test.expense_branch')::uuid,'ISP',900,'bank_transfer','August internet',false,'expense-draft-001')::text,true);
select results_eq($$select expense_number,approval_status,created_by from public.expenses where id=current_setting('test.expense_draft')::uuid$$,$$select 'EXP-2026-000001'::text,'draft'::text,'94000000-0000-4000-8000-000000000001'::uuid$$,'Draft captures number, status, and creator');
select set_config('test.expense_auto',public.save_expense(current_setting('test.expense_org')::uuid,null,'2026-08-02',current_setting('test.expense_category')::uuid,current_setting('test.expense_branch')::uuid,'ISP',800,'digital_wallet','Top-up',true,'expense-auto-001')::text,true);
select results_eq($$select expense_number,approval_status from public.expenses where id=current_setting('test.expense_auto')::uuid$$,$$select 'EXP-2026-000002'::text,'approved'::text$$,'Expense at or below threshold auto-approves');
select results_eq($$select count(*)from public.expense_approval_links where expense_id=current_setting('test.expense_auto')::uuid$$,$$select 0::bigint$$,'Auto-approved expense creates no approval request');

select set_config('test.expense_pending',public.save_expense(current_setting('test.expense_org')::uuid,null,'2026-08-03',current_setting('test.expense_category')::uuid,current_setting('test.expense_branch')::uuid,'PLDT',2500,'card','Router and service',true,'expense-pending-001')::text,true);
select results_eq($$select approval_status from public.expenses where id=current_setting('test.expense_pending')::uuid$$,$$select 'pending'::text$$,'Expense above threshold waits for approval');
select results_eq($$select count(*)from public.expense_approval_links link join public.approval_requests request on request.id=link.approval_request_id where link.expense_id=current_setting('test.expense_pending')::uuid and request.category='expense'and request.status='pending'$$,$$select 1::bigint$$,'Expense integrates with Approval Engine');
select public.decide_approval(current_setting('test.expense_org')::uuid,(select approval_request_id from public.expense_approval_links where expense_id=current_setting('test.expense_pending')::uuid),(select step.id from public.approval_steps step join public.expense_approval_links link on link.approval_request_id=step.approval_request_id where link.expense_id=current_setting('test.expense_pending')::uuid),'approved','Approved expense');
select results_eq($$select approval_status from public.expenses where id=current_setting('test.expense_pending')::uuid$$,$$select 'approved'::text$$,'Approval decision synchronizes expense status');
select results_eq($$select count(*)from public.expense_audit_events where specific_expense_id=current_setting('test.expense_pending')::uuid and event in('created','submitted','approved')$$,$$select 3::bigint$$,'Expense and approval lifecycle is audited');
select throws_ok($$update public.expense_audit_events set details='{}'where specific_expense_id=current_setting('test.expense_pending')::uuid$$,'42501','permission denied for table expense_audit_events','Expense audit is immutable to clients');

select results_eq($$select (public.expense_summary(current_setting('test.expense_org')::uuid,'2026-08-01','2026-08-31')->>'total')::numeric$$,$$select 3300::numeric$$,'Monthly summary includes approved expenses only');
select results_eq($$select (public.expense_summary(current_setting('test.expense_org')::uuid,'2026-08-01','2026-08-31')->'byCategory'->0->>'category')$$,$$select 'Internet'::text$$,'Summary groups expense by category');
select results_eq($$select (public.expense_summary(current_setting('test.expense_org')::uuid,'2026-08-01','2026-08-31')->'byBranch'->0->>'branch')$$,$$select 'Main Branch'::text$$,'Summary groups expense by Branch');
select results_eq($$select public.save_expense(current_setting('test.expense_org')::uuid,null,'2026-08-03',current_setting('test.expense_category')::uuid,current_setting('test.expense_branch')::uuid,'PLDT',2500,'card','Replay',true,'expense-pending-001')$$,$$select current_setting('test.expense_pending')::uuid$$,'Expense idempotency returns the existing record');
select results_eq($$select count(*)from public.expenses where idempotency_key='expense-pending-001'$$,$$select 1::bigint$$,'Expense replay cannot duplicate records');

select set_config('test.recurring',public.save_recurring_expense(current_setting('test.expense_org')::uuid,null,'Monthly internet',current_setting('test.expense_category')::uuid,current_setting('test.expense_branch')::uuid,'ISP',800,'bank_transfer','Monthly service','monthly','2026-09-01','2026-12-01',true)::text,true);
select set_config('test.generated',public.generate_recurring_expense(current_setting('test.expense_org')::uuid,current_setting('test.recurring')::uuid,'2026-09-01','recurring-expense-001')::text,true);
select results_eq($$select next_due_date,last_generated_at is not null from public.recurring_expense_definitions where id=current_setting('test.recurring')::uuid$$,$$select '2026-10-01'::date,true$$,'Recurring generation advances schedule safely');
select results_eq($$select count(*)from public.recurring_expense_occurrences where recurring_expense_id=current_setting('test.recurring')::uuid$$,$$select 1::bigint$$,'Recurring occurrence is recorded once');
select results_eq($$select public.generate_recurring_expense(current_setting('test.expense_org')::uuid,current_setting('test.recurring')::uuid,'2026-09-01','recurring-expense-001')$$,$$select current_setting('test.generated')::uuid$$,'Recurring occurrence replay is idempotent');
set local role postgres;
select results_eq($$select allowed_mime_types from storage.buckets where id='expense-receipts'$$,$$select array['image/jpeg','image/png','image/webp','application/pdf']::text[]$$,'Private receipt bucket restricts file types');
set local role authenticated;
select ok(exists(select 1 from pg_policies where schemaname='storage'and tablename='objects'and policyname='expense_receipts_insert'),'Receipt uploads are protected by a storage RLS policy');

select*from finish();rollback;
