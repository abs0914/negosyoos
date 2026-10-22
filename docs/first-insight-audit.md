# First business to first useful insight

Reviewed 19 October 2026. Scope: local source, local Supabase, existing automated tests, and a first implementation batch. This is not certification of the deployed service or a completed customer pilot.

## Release objective

A single-branch retailer can register, create a business, apply its template, add or import products, enter opening stock, complete a sale, and reconcile the resulting receipt and inventory movement. The owner can then ask a supported Advisor question and inspect its evidence. No replacement application, duplicate Advisor, or additional accounting engine is needed.

## Evidence and disposition

| Journey / foundation | Evidence in this repository | Disposition |
| --- | --- | --- |
| Register and create business | `apps/web/src/app/(auth)/actions.ts`, `packages/business/src/server.ts`; tenant-isolation and roles database suites | Keep. Finish a browser walkthrough of email confirmation, recovery, business creation, and tenant switching. |
| Configure retailer | `packages/templates`, `packages/modules`, `packages/onboarding`; retail-template and coach database suites | Keep. Fixed the missing opening-stock step and linked completed setup to results. |
| Import catalog and stock | `packages/catalog/src/server.ts`, catalog import route, `packages/inventory/src/server.ts`; catalog and inventory/POS database suites | Keep. Validate a realistic CSV, errors, duplicates, and opening stock in a browser. A catalog row alone is not stock. |
| Record sale and see daily results | `packages/sales/src/server.ts`, business dashboard, sales page | Fixed daily totals being limited to a 20-row recent-sales preview. Totals now page across the day's accessible completed receipts. |
| Honest data availability | Business dashboard and its view model | Fixed false “All clear,” “Nothing overdue,” and “No sales recorded” implications when data was absent or unavailable. |
| Evidence-backed Advisor | `packages/ai/src/advisor.ts`, `advisor-server.ts`, `packages/analytics/src/server.ts`; Advisor and semantic-layer database suites | Keep. Supported questions use deterministic intent matching and approved queries, not a general LLM. Finish terminology/date reconciliation and language coverage before expanding capabilities. |
| Recommendations and approvals | `packages/ai/src/recommendations-server.ts`, `packages/workflow/src/runtime.ts`, approvals package; recommendations, approval, workflow database suites | Keep foundations. Trace a specific reorder recommendation through draft creation, approval, execution, and retries before advertising this as a complete workflow. |
| Subscription checkout | `packages/billing/src/paymongo-server.ts`, webhook route; authorization, provider, settlement, and subscription tests | Keep. Finish provider sandbox checks for payment, duplicate delivery, delayed callbacks, and access changes. Automated fixtures do not establish live-provider readiness. |
| Accounting / payroll / compliance | Existing migrations and registered modules | Preserve. Postpone expanding these for the retail pilot; do not claim regulatory completeness from schema presence. |

## Implemented in this batch

1. **Daily receipt accuracy:** separate daily summary queries from the recent 20-row activity preview. Filter by completion time in Asia/Manila, preserve authenticated tenant/RLS access, use exact counts and ordered pages, accumulate centavos, and reject failed/truncated/changing-count results rather than return a partial total.
2. **Metric meaning:** label the result as today's receipt totals, including tax, before returns/refunds. This is not net sales, profit, or cash collected. Returned/refunded receipts remain in the original receipt total by design; suspended and voided receipts do not.
3. **Honest dashboard:** show an incomplete-summary state when expected data cannot load, avoid asserting zero overdue receivables without a successful result, and distinguish unavailable history from a successfully queried empty list.
4. **Retail onboarding:** expose catalog/import entry, add opening-stock guidance before checkout, and derive stock progress from positive opening/purchase ledger entries so later sales do not undo completion. This proves an opening receipt exists, not that every SKU is configured or has current stock.
5. **Setup to insight:** direct the owner to the current setup action; after available tasks are complete, offer a review of recorded results. Completion is role/module scoped, not a whole-business readiness certification.
6. **Documentation and test maintenance:** replace obsolete README claims that no Advisor exists. Update the registry assertion to verify the actual 18 published module keys instead of the stale count of 15.

## Ordered improvement backlog

| Priority | Action | Acceptance evidence |
| --- | --- | --- |
| P0 | Establish source control and compare deployment/migration state | Reviewed initial commit excludes credentials/generated artifacts; configured remote; deployed revision and applied migrations identified. This checkout currently has no commits or remote. Original edited files were copied to `tmp/first-insight-baseline` for this batch; this is not a substitute for Git history. |
| P0 | Resolve local counter-table RLS drift and check deployed state | Six internal counter tables have RLS disabled locally although `20260902011136_secure_internal_counter_tables.sql` enables it. Read-only checks found anon SELECT, authenticated SELECT, and authenticated UPDATE grants absent for all six, so the CLI's blanket claim of exposure is not supported by those checks. Verify all grants and apply the existing migration through the deployment process; then rerun access checks. No production assessment has been made. |
| P0 | Complete a browser journey in a controlled test business | Signup/confirmation → business → retail template → import → opening stock → sale → dashboard/receipt/stock reconciliation → Advisor evidence. Repeat with a cashier and an unrelated business user. |
| P0 | Reconcile analytical definitions | Advisor `sales_today` currently uses transaction creation date less refunds recorded in-period; the receipt dashboard uses completion date before refunds. Specify and test suspended-then-completed sales, prior-day refunds, voids, and offline sync. Keep labels distinct until a shared metric is implemented. |
| P1 | Replace paged totals with a single database aggregate at measured scale | One authorized snapshot returns count and total without per-page round trips. Current paging detects count changes but is not a transactionally consistent database snapshot; equal-count edits can still occur between requests. |
| P1 | Review dashboard permissions, latency, and diagnostics | Cashier/restricted-role views distinguish unavailable permissions from disabled modules. Failed loaders produce safe diagnostics; no silent data loss or exposure of other branches. |
| P1 | Complete owner reporting | Sales, refunds, expenses, receivables, and inventory reconcile to source records; missing cost data blocks unsupported profit claims; cash movement is separately defined. |
| P1 | Improve Advisor coverage | English and Filipino paraphrases map correctly; unsupported time ranges request clarification rather than answering a different period. Every result shows scope, period, and evidence; missing data does not become a confident recommendation. |
| P1 | Complete one approved action | Reorder recommendation → draft purchase request → owner approval → one execution, with audit history and retry tests. |
| P1 | Verify commercial operation | Provider sandbox evidence, limits/expiry behavior, support contact, error monitoring, and a demonstrated restore procedure. |
| P2 | Expand scope after pilot evidence | Additional industries, general LLM interaction, advanced forecasting, and expanded accounting only after repeated use and willingness to pay are demonstrated. |

## Pilot acceptance scenario

Use test records, not live customer transactions:

- Import a small catalog with known costs and prices, including an invalid row and a duplicate SKU. Verify clear errors and intended retry behavior.
- Record 10 opening units of a tracked product. Sell 2 units and verify 8 remain, one receipt exists, and payment agrees with the receipt.
- Complete more than 20 sales in a day. Confirm the summary includes all of them even though recent activity is limited. Check Philippine midnight boundaries.
- Suspend a sale on one day and complete it the next; then process a return. Confirm each report states its date basis and treatment of refunds.
- Simulate a failed data request. The dashboard must show unavailable information rather than zero or “all clear.”
- Ask the Advisor about recorded sales and stock. Inspect source evidence and explain any difference between receipt totals and net-sales metrics.
- Repeat access attempts as another tenant, a restricted staff member, and an expired subscription.

Record time to first useful result, weekly active businesses, reconciliation discrepancies, recommendations acted on, support effort, and willingness to pay. Targets should be agreed with pilot customers; they are not yet validated.

## Validation

- Baseline application tests: 55 files, 203 tests passed.
- After changes: 56 files, 211 tests passed. New regression coverage includes more than 20 receipts, API page caps, Philippine-day boundaries in query filters, authorization denial, failed/empty later pages, changing counts, honest empty states, and opening-stock task ordering.
- Local database tests: 41 files, 910 checks passed after correcting the stale registry expectation. These include tenant isolation, role permissions, catalog, POS/inventory atomicity, Advisor, workflow, and subscription behavior.
- Type checking and lint passed.
- Production build passed, including route compilation and service-worker generation.
- No schema migration, production deployment, external payment, or live customer-data modification was performed. Local database tests use transactional fixtures. Authenticated browser and provider-sandbox validation remain release gates.

## Changed files

- `README.md`
- `docs/first-insight-audit.md`
- `packages/sales/src/server.ts`
- `packages/sales/src/dashboard.test.ts`
- `packages/onboarding/src/index.ts`
- `packages/onboarding/src/server.ts`
- `packages/onboarding/src/index.test.ts`
- `apps/web/src/app/(platform)/business/[businessId]/page.tsx`
- `apps/web/src/app/(platform)/business/[businessId]/sales/page.tsx`
- `apps/web/src/app/(platform)/business/[businessId]/coach/page.tsx`
- `apps/web/src/app/(platform)/business/[businessId]/business-dashboard.ts`
- `apps/web/src/app/(platform)/business/[businessId]/business-dashboard.test.ts`
- `packages/database/supabase/tests/database/module_registry.test.sql`
