# NegosyoOS — Product, Technical, Operations, and Commercial Knowledge Base

**Snapshot date:** 22 October 2026 (Asia/Manila)  
**Purpose:** Preserve the product we have built, its operating principles, implementation details, recent decisions, and commercialization direction in one reusable reference.  
**Repository:** `C:\Users\USER\negosyoOS`  
**GitHub:** https://github.com/abs0914/negosyoos — connected as `origin` on 22 October 2026; initial source baseline prepared for publication.  
**Configured public origin:** `https://negosyoos.com` (from deployment configuration; live availability was not checked for this document).

## 1. How to use this document

This is a consolidation of the local repository, existing project documents, and the accessible chat **“Review NegosyoOS audit findings”**. It is not a fresh production audit or a claim that every previous conversation has been recovered. Where older documentation conflicts with newer implementation evidence, the newer, more specific evidence is identified below.

Read status words carefully:

| Status | Meaning |
| --- | --- |
| Implemented / repository evidence | Source, migrations, or interfaces exist locally. This does not establish deployment or customer acceptance. |
| Historically tested | An identified earlier report records passing checks. They were not rerun merely to write this document. |
| Discussed direction | A recommendation or decision preserved from the accessible conversation. Operational execution may still be pending. |
| Pending validation | Browser, provider, production, professional, or customer evidence is still required. |
| Proposed operating detail | A practical way to execute the direction, not a claim that the team already adopted or completed it. |

No credentials, private keys, live customer records, or production environment values are included. This document records knowledge; it does not change application settings, trial lengths, prices, or deployments.

## 2. Product identity and purpose

NegosyoOS is a configurable, multi-tenant business operating system for Philippine small and medium businesses, especially brick-and-mortar operators. It brings records and daily work that are scattered across notebooks, spreadsheets, messages, and separate apps into one business workspace.

The broad vision discussed is an **AI-powered SME business operating system** covering sales, inventory, customer management, financial operations, payroll, accounting integrations, and useful business insights. The research brief on Philippine business opportunities for 2026–2030 supplied this direction; it did not prove market demand or product readiness.

The immediate product promise is narrower and practical:

> Track sales, manage stock, and understand what needs attention—with help getting started.

The current homepage headline is **“Know what your business needs next.”** Its entry offer is a free business health assessment, described as taking about five minutes with no credit card. These are existing marketing statements, not independently measured completion-time results.

The core customer loop is:

```text
Assess needs → configure a business workspace → record daily operations
→ understand results → receive a supported recommendation
→ approve an action → execute and measure the result
```

The final recommendation-to-action loop is a delivery objective; a complete production-validated loop has not yet been established in the reviewed evidence.

### Product principles

- Use owner-friendly language and practical next steps.
- Start with the modules the business needs and expand deliberately.
- Keep each business isolated and every action permission-aware.
- Explain figures with records, scope, dates, and limitations.
- Require authorization and approval for important changes.
- Treat configuration as validated data, never executable AI-generated code.
- Improve the existing application rather than rebuild or migrate to a different app builder.
- Let pilot usage and willingness to pay guide expansion.

## 3. Target audience and positioning

### Initial customer segment

The discussed launch focus is **single-branch Philippine retailers**. It fits the existing catalog, inventory, POS, sales, purchasing, and reporting work. It remains a market hypothesis until pilot outcomes confirm fit.

| Audience | Need | Role in adoption |
| --- | --- | --- |
| Store owner / owner-manager | Know sales, stock, outstanding balances, and the next useful action | Main buyer and pilot decision-maker |
| Cashier | Record transactions and payments reliably | Frequent operational user |
| Store manager / inventory staff | Maintain products, receive stock, investigate discrepancies | Setup and operating user |
| Bookkeeper / accountant | Understand and reconcile records | Influencer; complete exports/integrations still need validation |

Likely problems to validate in owner interviews include scattered records, uncertainty about stock, repeated manual work, slow reporting, and difficulty separating sales from profit or cash. These are product hypotheses and existing positioning themes, not quantified research findings.

Suitable pilot participants can provide a small real catalog, nominate an owner and operator, commit to regular use and feedback, and accept assisted onboarding. No specific city, business-size threshold, or revenue band was finalized in the recovered discussion.

### Broader audience represented in the product

The landing page addresses retail and hardware, food and restaurants, salons and services, repair and laundry, professional services, and wholesale/distribution. The assessment has industry categories for retail/hardware, food/restaurant, salon/service, professional services, repair services, wholesale/distribution, and other businesses.

These categories describe the broader platform direction. They do not establish that every vertical is launch-ready. Additional industries and complex multi-branch operations should follow retail pilot evidence.

### Differentiation to demonstrate

- A Philippine small-business focus and practical owner language.
- A health assessment that leads into setup and operating tools.
- Reusable modules and industry configurations within one workspace.
- Sales, inventory, customers, and guidance connected to actual records.
- Owner-controlled changes and evidence-backed answers.
- PWA delivery and a designed offline POS path, subject to explicit release gates.

No verified competitor ranking, market-size estimate, customer count, revenue figure, or proven ROI is available in the sources reviewed for this document.

## 4. What has been built

### Capability inventory

| Area | Repository evidence / purpose | Readiness qualification |
| --- | --- | --- |
| Identity and business workspaces | Supabase authentication, business creation, memberships, branches, settings | Full signup, confirmation, recovery, and tenant-switch browser journey pending |
| Roles and permissions | Six baseline roles, custom roles, capability catalog, branch access | Database suites exist; pilot personas still need walkthroughs |
| Module registry | Activation, configuration, dependencies, plan restrictions, derived navigation | Registry membership alone does not establish a complete operational module |
| Industry templates | Versioned Business OS definitions, preview/install services, terminology and module selections | Validate selected retail template end to end |
| Dynamic objects | Metadata-defined entities, fields, relations, shared records | Implemented configuration foundation |
| Forms and views | Declarative forms, conditions, table/cards/kanban definitions | Implemented foundation; validate actual customer configurations |
| Catalog and imports | Product/service records and catalog import route | Realistic CSV, duplicate, invalid-row, and retry testing required |
| Inventory | Stock ledger, opening balances, purchasing-related movements | Reconcile real operating scenarios; catalog creation is not stock receipt |
| POS and sales | Transactions, payments, receipts, returns, daily summaries | Browser, concurrent use, offline, and reconciliation gates remain |
| Purchasing | Supplier and purchase-request surfaces/services | Complete recommendation-to-approved-purchase flow remains a milestone |
| Expenses | Expense records and recurring-expense UI | Include only demonstrated workflows in pilot scope |
| Invoices / receivables / quotations | Document editors, operations, balances, and supporting services | Do not infer statutory certification from document generation |
| CRM | Customers, history, segmentation | Validate usability and permissions with pilot users |
| Appointments / job orders / delivery | Domain packages and operating interfaces | Broader scope; not the initial retail promise |
| Employees / attendance / loyalty | Packages and/or registry/database foundations | Availability and completeness must be checked per customer workflow |
| Accounting / PH compliance / payroll | Migrations and registered capabilities | Not yet evidence of complete payroll or accounting integrations |
| Analytics | Approved metrics/query infrastructure | Some sales definitions still differ across interfaces |
| Business Advisor | Supported intent matching and evidence-backed answers | Deterministic implementation, not general conversational LLM chat |
| Recommendations | Recommendation services, evidence, workflow/approval foundations | One complete approved action still needs validation |
| AI interview / builder | Contracts, services, configuration proposals and UI | Do not equate builder screens with a verified external model integration |
| Negosyo Coach | Setup playbooks and progress from business records | Progress is role/module scoped, not a business-readiness certification |
| Assessment / trial | Health scoring, trial lifecycle, milestones and value-report surfaces | Current database trial definition is 45 days |
| Billing | Plan/limit contracts and PayMongo hosted checkout | Provider sandbox and deployed entitlement checks remain |
| Notifications / audit / administration | Dedicated packages and administration interfaces | Validate external delivery and privileged workflows separately |

The corrected registry baseline lists 18 published modules: accounting, appointments, attendance, compliance, CRM, delivery, employees, expenses, inventory, invoicing, job orders, loyalty, payroll, POS, product catalog, purchasing, quotations, and sales.

### Recent completed improvement batch

The 19 October audit records these changes:

1. Daily receipt totals no longer stop at the 20-row recent-activity preview. The summary reads all accessible completed receipts for the day through ordered pages.
2. Daily receipt labels clarify that totals include tax and are before returns/refunds.
3. Unavailable data no longer produces misleading “All clear,” “Nothing overdue,” or “No sales recorded” conclusions.
4. Retail onboarding includes opening stock before checkout and derives progress from positive opening/purchase ledger entries.
5. Completed setup points the owner toward reviewing recorded results.
6. README Advisor claims and the stale module-registry test expectation were corrected.

These were local changes. The recorded implementation batch did not deploy them.

## 5. Customer and operating processes

### Assessment to setup

1. Visitor opens the free assessment and chooses an industry.
2. The assessment collects answers about sales, profitability, cash flow, inventory, customers, operations, employees, digital readiness, marketing, and record keeping.
3. Deterministic scoring maps answers onto 0–100 scores, strengths, and priorities. This is a self-reported assessment, not an audited business valuation or financial diagnosis.
4. The user creates or enters a business workspace and reviews the recommended Business OS configuration.
5. The owner installs the relevant template/modules and follows Negosyo Coach setup guidance.
6. For retail, the owner adds/imports the catalog, records opening stock, and completes the first sale.
7. The owner checks the receipt, inventory movement, and reported result, then asks a supported Advisor question.

This sequence is the intended verified first-value journey. Full authenticated acceptance remains a release gate.

### Daily retail operation

The target routine is to verify products/prices and opening stock, record sales/payments, maintain customers as needed, receive purchases, record expenses, handle permitted returns or corrections, and review receipts and stock at day end. Operators should investigate pending payments and reconciliation cases rather than interpret every successful sale entry as collected cash.

The minimum pilot reconciliation example is: receive 10 units, sell 2, verify 8 remain, verify one receipt, and verify the corresponding payment state. Repeat with more than 20 daily receipts, midnight boundaries, suspended sales, returns, and failed queries.

### Configuration changes

```text
Owner request → proposal → strict schema validation → deterministic preview
→ permission and approval checks → revision check → atomic application
→ versioned configuration and audit history
```

The example “Add contractor name to quotations” becomes an `add_field` configuration operation. It never authorizes generated source files, SQL, database migrations, or per-tenant tables.

### Workflow and approval model

Definitions use **Trigger → Conditions → Actions**, with allow-listed schemas. Initial triggers include record creation, record update, status change, schedule, and manual execution. Runs retain execution and step logs, idempotency keys, retry state, and safe failures. Tests validate behavior without applying effects. Record saves dispatch after commit; scheduled execution has a dispatcher boundary, with distributed scheduling/queue operation still requiring an operational decision.

The discussed next complete automation is: stock recommendation → draft purchase request → owner review/approval → one execution → audit trail. Retry behavior must not duplicate the business action.

### Support and operating ownership

The current contact page directs signed-in users to Negosyo Coach and business-support/partnership inquiries to PhilVirtualOffice's official website. This does not establish a staffed support SLA or a legal ownership structure.

The pilot discussion calls for initial setup/import assistance and weekly check-ins. Named support owners, support hours, escalation paths, response commitments, and export/retention terms still need to be finalized.

Proposed pilot operating record: business, owner, branch, onboarding date, first-value date, current blocker, support owner, next check-in, trial end, applicable price, and continuation decision. Track defects separately with reproduction steps and affected records, without copying unnecessary personal data.

## 6. Technical architecture

### Stack and deployment shape

| Layer | Current repository choice |
| --- | --- |
| Application | Next.js 16.3.2 App Router; React 19.2.8 |
| Language / validation | TypeScript 5.9.3 in strict mode; Zod 4.4.3 |
| UI | Tailwind CSS 4.3.3; shared shadcn/ui-style source components |
| Client asynchronous state | TanStack Query 5.102.3 where client ownership is useful |
| Backend | PostgreSQL through Supabase Database, Auth, and Storage; optional Realtime direction |
| PWA | Serwist 9.5.12, manifest and service-worker build |
| Runtime | Node.js 22 or later; Node 22 Debian slim Docker image |
| Repository | npm workspaces, one web app, bounded domain packages |
| Tests | Vitest 4.1.11; Supabase SQL tests; PGlite billing integration tests |
| Hosting configuration | Standalone Next build, Docker Compose, Caddy network/proxy configuration |

Versions above are read from package manifests, not recommendations to upgrade. The lockfile is the reproducible dependency source.

This is a **modular monolith**: one web deployment and one PostgreSQL database. Package boundaries provide structure without introducing microservices, a message broker, or Redis prematurely.

The architectural progression is:

```text
Core Platform → Reusable Modules → Industry OS Templates
→ Configuration Engine → AI Builder → AI Business Advisor
```

Server Components and Server Actions are the default delivery/data-access approach. Route handlers serve API boundaries. Client query caching is reserved for interactive cases that need it.

### Repository map

| Location | Responsibility |
| --- | --- |
| `apps/web` | Pages, layouts, Server Actions, API routes, business UI, marketing pages, PWA |
| `packages/core`, `auth`, `business`, `rbac` | Common contracts/errors, identity, tenant context, capabilities |
| `packages/database` | Supabase migrations/config/tests and generated database types |
| `packages/configuration`, `modules`, `templates` | Safe configuration language, activations, industry definitions |
| `packages/objects`, `forms`, `views` | Metadata and dynamic record interfaces |
| `packages/catalog`, `inventory`, `sales`, `pos-sync` | Retail and POS domain logic |
| `packages/purchasing`, `expenses`, `invoices`, `quotations` | Purchasing and commercial records |
| `packages/crm`, `appointments`, `job-orders`, `delivery`, `employees`, `loyalty` | Additional operational domains |
| `packages/ai`, `analytics`, `onboarding` | Assessment, builder/Advisor/recommendations, metrics, Coach |
| `packages/workflow`, `approvals`, `notifications`, `audit` | Controlled automation and evidence |
| `packages/billing`, `platform-admin`, `ui` | Subscription operations, privileged administration, shared UI |
| `docs` | Decisions, audits, payment/recovery runbooks, UAT plan, this reference |
| `deploy`, `Dockerfile`, `compose.production.yml` | Deployment configuration |

Cross-package imports should use public package exports. Circular dependencies and importing another package's internal `src` paths violate the documented architecture.

### Data model and tenant security

Product language is **User → Business → Branch**. Database terminology retains `organizations` and `organization_id`; the organization identifier is the hard tenant boundary. Branches belong to a business.

Business creation atomically bootstraps the business, active owner membership, role/permission assignments, settings, and main branch. `created_by` is audit information, not an independent authorization grant.

Authorization combines verified identity, active membership, capability permission, and branch scope where applicable. The six immutable baseline roles are Owner, Administrator, Manager, Cashier, Staff, and Viewer; custom roles use the code-reviewed permission catalog. Application checks use keys such as `sales.create`, not role names.

Documented security invariants include:

- Verify signed identity with `auth.getClaims()`; do not trust user-editable metadata for permissions.
- Enforce server authorization and PostgreSQL row-level security independently.
- Include tenant predicates in scoped server queries.
- Treat the active-business cookie as navigation state only.
- Prevent tenant foreign-key reassignment.
- Validate inputs with strict schemas and repeat critical checks in atomic database functions.
- Use both `USING` and `WITH CHECK` for tenant update policies.
- Restrict privileged helper functions, grants, and search paths.
- Prefix private Storage paths with the business UUID and enforce access policies.
- Never expose provider or service-role secrets to the browser.

These are architecture requirements, not a blanket assertion about current deployed policies. The known local RLS discrepancy is listed under release risks.

### Metadata and configuration engine

Objects and fields are tenant metadata. Dynamic records share an RLS-protected table with indexed system columns and validated JSONB attributes; the platform does not create a physical table for every business entity. A normalized internal projection enforces dynamic uniqueness. Active lists use keyset pagination.

Fields support text, long text, numbers, decimal/currency/percentage, booleans, dates/times, email/phone/URL, selections, status, users, branches, relations, and attachments. Keys remain stable; labels can change. Relations must resolve within the same business. Archived fields retain historical values.

Forms project object metadata into versioned layouts and constrained visibility conditions. The server reloads authoritative metadata and rejects hidden/read-only injection. Views interpret shared definitions for table, cards, and kanban presentation, filters, sorting, grouping, search, and branch scope.

Module activation validates permission, subscription eligibility, dependencies, and configuration. Dependent modules prevent unsafe deactivation. Database transactions and per-business locking serialize competing state changes.

### API and observability contracts

API responses use `{ ok, data|error, meta.requestId }` and `x-request-id`. Expected failures use `AppError`; unexpected failures return generic errors. Structured logs redact password, token, secret, cookie, authorization, and API-key fields. Stable request/business/entity identifiers support diagnosis without logging raw request bodies or credentials.

### Deployment and environment

The Docker build installs with `npm ci`, runs the application build, and copies standalone output, static assets, and public assets into a non-root runtime image. Compose exposes port 3000 internally, uses an external Caddy network, restarts unless stopped, and checks `/api/health`.

Browser-safe configuration includes the Supabase URL/publishable key and site origin. Server-only payment configuration includes `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, and the restricted billing use of `SUPABASE_SERVICE_ROLE_KEY`. `APP_URL` controls the canonical application origin. Never copy actual values from local or production secret files into documentation.

Older README language broadly says not to add a service-role key to the web application. The newer PayMongo integration explicitly requires a server-only privileged key for its settlement boundary. Preserve that narrow boundary; it is not permission to bypass tenant controls throughout the app.

## 7. AI and analytics: actual behavior and future direction

The current Business Advisor plans supported questions deterministically and composes answers from approved metrics and queries. It is not a general-purpose LLM chatbot. The application also has interview, system-builder, recommendation, and evidence structures; these do not prove that an external AI provider is configured in production.

Future natural-language support should improve Filipino/English interpretation while preserving approved data access, tenant scope, authorization, and evidence. AI may propose configuration or an action, but it must not write production code/SQL or silently perform privileged changes.

Every meaningful answer should identify its business/branch scope, date range, metric definition, sources, and limitations. Unsupported questions should prompt clarification. Missing cost data must not become a confident profit claim.

### Known metric distinction

| Measure | Current meaning / issue |
| --- | --- |
| Dashboard daily receipt total | Completion-date basis in Asia/Manila; includes tax; before refunds/returns |
| Advisor `sales_today` | Creation-date basis, less refunds recorded in the period, per the audit |
| Profit | Requires trustworthy cost and expense definitions; cannot be inferred from receipt total |
| Cash collected | Requires payment/collection timing and status; not synonymous with sales |

Reconcile suspended-then-completed sales, prior-day refunds, voids, and offline sync before presenting these as interchangeable numbers. Current paged receipt aggregation detects changing counts but is not one transactionally consistent snapshot; equal-count edits between pages remain a limitation.

## 8. Offline POS and reliability design

ADR-018 defines offline POS as a leased command log, not a browser replica of the database. Older blanket deferrals of offline mutation queues are superseded by this later design and implementation work, but production readiness still requires the reliability gates.

- An enrolled register receives an opaque, hashed lease scoped to business, branch, register, and user, lasting at most 24 hours.
- Devices allocate monotonic local sequences and provisional receipt references; PostgreSQL assigns canonical receipt numbers on commit.
- Online and synchronized commands share validation, payload hashing, idempotency, inventory locks, and audit evidence.
- An identical replay returns the original result; altered payload replays are rejected and audited.
- Commands upload in device order and commit independently.
- A durably completed offline sale remains a financial fact. Insufficient authoritative stock creates a negative balance/reconciliation case instead of silently dropping the sale.
- Offline digital payment remains pending until verified.
- Foreground synchronization is authoritative; background execution is not promised on iOS.
- Formal invoices, receivables, refunds, voids, inventory adjustments, and configuration changes remain online-only in v1.
- Acknowledged local payloads have a documented seven-day retention before sensitive-field purge; unresolved commands remain for reconciliation or authorized clearing.

Reliability objectives in the runbook include 25 branches, five registers per branch, 20,000 catalog items, and 2,000 sales per branch/day; p95 online command time at most one second; cached search at most 100 ms; offline durable commit at most 150 ms. These are validation targets, not achieved benchmarks.

The offline-specific staged pilot calls for two or three branches over four weeks. This is distinct from the commercial recruitment target of three to five single-branch businesses. Expansion requires no duplicate financial transactions or lost acknowledged sales, attributable exceptions, and at least 99.9% synchronization without manual action.

## 9. Pricing, billing, and trial policy

### Prices currently represented in code

| Plan | Monthly PHP | Annual PHP | Included branches |
| --- | ---: | ---: | ---: |
| Free assessment | No payment | No payment | Assessment entry; not a promise of full free operations |
| Starter | 499 | 4,990 | 1 |
| Pro | 1,299 | 12,990 | 1 |
| Growth | 2,499 | 24,990 | 3 |
| Multi-branch | 4,999 | 49,990 | 3 |

Multi-branch extras are PHP 1,250 per month or PHP 12,500 per year per extra branch. Checkout supports up to 100 total branches; this is a billing limit, not evidence of validated operating capacity. Annual prices represent ten monthly payments. Exact feature/user/transaction entitlements must be checked against the deployed plan configuration before promising them.

Amounts are stored/sent as integer PHP centavos. `packages/billing/src/pricing.ts` is the price source of truth shared by the UI and server.

### PayMongo process

1. An authorized member with `subscription.manage` requests a checkout.
2. The server calculates plan, interval, amount, and allowed branch capacity.
3. PayMongo Hosted Checkout v2 collects prepaid payment.
4. A signed `checkout_session.payment.paid` webhook is verified against the raw body, signature mode, timestamp, persisted amount, PHP currency, and session.
5. One database transaction deduplicates settlement and updates subscription, capacity, audit evidence, and checkout state.
6. Browser return URLs do not grant paid access.

This is **prepaid monthly/annual access**, not automatic recurring debit. Same-plan/same-capacity renewal extends paid time; plan or capacity changes start immediately at full price without proration or unused-time credit. The integration does not implement automatic refunds, dunning, automatic session cancellation, or recurring debits.

QR Ph is the default configured method. Card, GCash, Maya/PayMaya, and GrabPay depend on merchant availability and enabled settings. Only one payable checkout is allowed per business. Canceled navigation may leave a resumable remote checkout. Operators must confirm remote state before voiding a stuck local reservation.

### 45-day implementation versus 30-day pilot decision

The existing trial migration enforces 45 days, with milestones at days 1, 7, 15, 30, 40, and 45. The later discussion recommends testing a **30-day free assisted pilot** for new recruits while retaining the free assessment entry point.

The user agreed to moving forward with marketing/promotion in that context. No evidence in this task establishes that the 30-day policy has been implemented or deployed.

Before publishing a 30-day offer:

- Verify production settings and align database constraints, lifecycle logic, milestones, reminders, UI, and terms for the new cohort.
- Preserve any existing 45-day commitments.
- Verify signup through first sale.
- State scope, assistance, price afterward, end-of-trial access, and export/data terms clearly.
- Present an explicit paid continuation choice.

An earlier recommendation proposed charging for a pilot once acceptance passed. The later, more specific discussion changed the immediate experiment to a free 30-day assisted pilot with paid continuation. Do not present both as the same current offer.

## 10. Marketing, promotion, and pilot acquisition

### Direction already discussed

Begin customer recruitment now while continuing focused reliability work. Promote the demonstrated retail journey and assisted onboarding. Substantial advertising spend should wait until customer response, activation, repeated use, and willingness to pay are understood.

Initial acquisition channels are direct outreach, referrals, demonstrations, and existing business relationships. The discussed targets are **10–15 owner interviews** and **3–5 pilot businesses**; these are recruitment goals, not completed activity.

The launch message is:

> Track sales, manage stock, and understand what needs attention—with help getting started.

The website already provides a free-assessment call to action, product preview, explanation of the assessment/setup process, industry labels, About, Contact, Privacy, and Terms pages. The homepage's broader claims should be checked against the narrower pilot scope before promotion.

### Thirty-day assisted pilot structure

| Period | Discussed customer objective |
| --- | --- |
| Days 1–3 | Configure one business/branch, import products, record opening stock and first sale |
| Days 4–14 | Build regular use, resolve operating problems, and check data accuracy |
| Days 15–23 | Review stock, sales, and supported insights together |
| Days 24–30 | Review demonstrated value and request paid continuation |

Included capabilities should be limited to verified sales, inventory, customer management, and supported insights, with expenses included when demonstrated. Provide setup/import help and weekly check-ins. Show the applicable paid plan price before participation.

### Proposed execution details for the agreed direction

These details make the discussion actionable; they are not completed campaigns or separately approved commitments:

1. Maintain a short prospect list of qualified single-branch retailers and referral sources.
2. Interview owners about existing records, stock discrepancies, reporting needs, staff responsibilities, and current software spending.
3. Demonstrate one real workflow: catalog → opening stock → sale → receipt/stock reconciliation → supported insight.
4. Offer the aligned pilot with a written scope, assistance schedule, trial end, and continuation price.
5. Record onboarding blockers and support time each week.
6. Request permission before using a participant's name, testimonial, screenshots, or results publicly.
7. Refine the offer from observed usage before expanding channels or paid acquisition.

Useful future promotional material could show a short verified retail walkthrough, explain the difference between sales and cash, or demonstrate opening-stock setup. No social calendar, paid-ad budget, CAC target, influencer agreement, referral commission, or launched campaign was established in the recovered discussion.

### Claims discipline

Promote only capabilities that can be demonstrated in the relevant release. Do not claim full payroll readiness, working external accounting integrations, general-purpose AI conversation, guaranteed profit improvements, regulatory certification, proven offline reliability, or market leadership from the current evidence. Evidence from local tests should not be described as production/customer validation.

## 11. Measurement and commercial learning

The discussed outcome measures are time to first useful result, weekly active businesses, reconciliation discrepancies, recommendations acted on, support effort, and willingness to pay. Targets beyond recruitment volume have not been validated.

Proposed definitions for a pilot tracking sheet:

| Metric | Suggested definition |
| --- | --- |
| Interview-to-demo rate | Qualified interviewed owners who attend a demo / qualified owners interviewed |
| Demo-to-pilot rate | Businesses that start the agreed pilot / businesses completing a demo |
| Activation | Catalog + opening stock + first completed sale + reconciled result |
| Time to first value | Elapsed time from onboarding start to the first verified useful result |
| Weekly active business | Pilot business performing the agreed meaningful operating activity in the week |
| Reconciliation accuracy | Receipt, payment, and stock comparisons with no unexplained difference |
| Action adoption | Reviewed recommendations that lead to a completed, authorized action |
| Support cost | Staff time per business, categorized by setup, training, defects, and questions |
| Paid conversion | Businesses choosing and completing paid continuation / eligible completed pilots |

These definitions are proposed instrumentation, not proof that analytics already collects them. Agree the meaningful activity threshold with the pilot cohort. No revenue forecast or unit-economics model has been validated.

## 12. Quality, release process, and known gaps

### Recorded validation history

| Evidence date | Result and limits |
| --- | --- |
| 2 September 2026 UAT report | Rejected release candidate; 139 planned acceptance items. Tests/build/typecheck passed, but lint and one database assertion failed; missing personas/data blocked authenticated UAT. |
| 19 October 2026 first-insight audit | 56 application test files / 211 tests passed; 41 database files / 910 checks passed; lint, typecheck, production build, and service-worker generation passed. |
| 22 October 2026 documentation snapshot | Source/docs/chat reviewed. No new runtime test suite, production audit, deployment, or payment executed for this knowledge document. |

The later passing automated gates supersede the earlier failed lint/registry gate status for that tested local revision. They do not close every earlier browser defect. In particular, the historical signed-out `/platform-admin` global-error behavior needs explicit retesting before closure.

### Prioritized outstanding work

| Priority | Work | Required evidence |
| --- | --- | --- |
| P0 | Establish source-control/deployment baseline | Reviewed commit and remote; identify deployed source revision and migrations; exclude secrets/generated outputs |
| P0 | Resolve counter-table RLS drift | Verify all grants and policies, apply the existing migration through the proper deployment process, rerun adversarial access checks |
| P0 | Complete authenticated retail browser journey | Confirmation/recovery → business/template → import → stock → sale → reconciliation → Advisor; repeat as cashier and unrelated tenant |
| P0 | Reconcile metric definitions | Tests for completion/creation dates, returns, voids, midnight boundaries, and offline timing |
| P0 before offer publication | Align the 30-day cohort offer | Correct lifecycle/settings/terms while preserving existing promises |
| P1 | Complete owner reporting | Sales, costs, expenses, receivables, and cash definitions reconcile to source records |
| P1 | Validate commercial operation | Provider sandbox evidence, expiry/limits, support path, monitoring, recovery drill |
| P1 | Validate one approved action | Recommendation → draft purchase → approval → single execution with safe retry |
| P1 | Improve Advisor coverage | Supported Filipino/English paraphrases, clear dates/scope, honest missing-data behavior |
| P1 | Improve aggregate consistency/performance | Authorized database aggregate when needed; measured latency and restricted-role diagnostics |
| P2 | Expand industries, financial scope, and AI | Repeated customer use and willingness to pay justify expansion |

The audit found six local internal counter tables with RLS disabled despite an existing enabling migration. Checked anon/authenticated read and authenticated update grants were absent, so this was not proof of public exposure. Full grants and deployed state still require verification. Do not convert this local discrepancy into an unsupported assertion that production is compromised or secure.

The audit recorded no committed baseline or remote; this documentation session also observed the project files as untracked. A backup directory is not a substitute for reviewed source history. Avoid bulk-adding the workspace without inspecting secret files and generated artifacts.

### Local development and change validation

Use the repository scripts for local development:

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
npm run db:start
npm run db:reset
npm run dev
```

Docker Desktop is required for the documented local Supabase stack. `db:reset` resets the local database and is appropriate only when its local data can be discarded. Configure environment values through local secret handling, not this knowledge file.

Standard implementation checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

After intentional local migration changes, regenerate database types with `npm run db:types`. Create migrations with the Supabase migration command rather than inventing timestamps. Before writing Next.js code, read relevant installed guides under `node_modules/next/dist/docs/`, as required by AGENTS.md.

Release acceptance should record exact revision/environment, automated results, authenticated journey evidence, migration status, payment checks, unresolved blockers, and recovery readiness. Passing a production build alone is not release approval.

## 13. Recovery and operational resilience

The disaster-recovery runbook sets a target recovery point of 15 minutes or better through PITR and a target recovery time of two hours. These are objectives, not demonstrated service commitments. PITR/compute must be enabled and funded before offline activation. Storage objects require a separate encrypted/versioned backup; database backup metadata is insufficient.

Roles in the runbook are incident commander (Operations), restore operator (Platform Engineering), data validator (Engineering), and customer liaison (Support). Named people remain to be assigned.

Recovery proceeds through incident declaration, log preservation, isolated restore, credential rotation if exposed, schema alignment, financial/inventory/tenant validation, controlled synchronization drain, validated cutover, monitoring, and incident review. Do not overwrite the only recoverable environment. Quarterly drills should capture achieved RPO/RTO, object checks, failures, and remediation owners.

## 14. Product roadmap and decision record

### Release sequence discussed

1. **Retail pilot:** dependable sales, inventory, customers, expenses where verified, and evidence-backed business insights.
2. **Financial operations:** reconciled reporting, accountant-ready exports or an actual accounting integration, and professionally validated payroll workflows.
3. **AI-assisted action:** better Filipino/English conversation, explanations grounded in records, and prepared business actions subject to owner approval.

Additional industries, advanced forecasting, a marketplace, native mobile, and distributed infrastructure remain later directions rather than immediate pilot scope.

### Decisions to preserve

| Topic | Preserved direction |
| --- | --- |
| Rebuild versus improve | Improve the existing Codex/Supabase application |
| Breadth versus first value | Complete one retailer's first-business-to-first-insight journey |
| Build versus market | Run targeted recruitment alongside reliability development |
| Initial segment | Single-branch Philippine retailers |
| Initial cohort | Recruit 3–5 businesses; interview 10–15 owners |
| Offer | Free assessment plus a proposed 30-day assisted pilot for new recruits, after alignment |
| Existing trial promises | Preserve 45-day commitments already made |
| Acquisition | Direct relationships, referrals, and demos before substantial ad spend |
| AI | Evidence-backed answers and approved actions; no arbitrary production code or SQL |
| Product expansion | Follow customer usage, support evidence, and willingness to pay |

### Decisions still open

- Exact pilot plan/features, support owner/hours, geographic recruitment focus, and launch date.
- Implementation and deployment of cohort-specific trial duration and expiry/export terms.
- Verified production revision, applied migrations, and operational/provider settings.
- Accounting export format/integration partner and payroll validation scope.
- External AI provider/model policy, consent/data handling, language acceptance criteria, and operating cost.
- Final support SLA, analytics targets, marketing budget, and proof required for broader launch.

## 15. Source index and maintenance

Primary internal references, relative to this document:

- [Repository overview](../README.md)
- [Architecture decisions](architecture-decisions.md)
- [First-insight audit and backlog — 19 October 2026](first-insight-audit.md)
- [PayMongo behavior and setup](paymongo.md)
- [POS reliability and release gates](pos-reliability-gates.md)
- [Disaster recovery runbook](disaster-recovery.md)
- [Complete UAT plan](NegosyoOS-Complete-UAT-Plan.docx)
- [Historical UAT execution report — 2 September 2026](../output/NegosyoOS-UAT-Execution-Report-2026-09-02.md)
- [Root scripts and versions](../package.json), [web dependencies](../apps/web/package.json)
- [Pricing source](../packages/billing/src/pricing.ts)
- [Trial migration](../packages/database/supabase/migrations/20260827232827_trial_engine.sql)
- [Assessment/scoring source](../packages/ai/src/health-assessment.ts)
- [Onboarding/Coach definitions](../packages/onboarding/src/index.ts)
- [Deployment configuration](../compose.production.yml), [container build](../Dockerfile)
- [Homepage](../apps/web/src/app/page.tsx), [About](../apps/web/src/app/about/page.tsx), [Contact](../apps/web/src/app/contact/page.tsx)

Conversation source: **“Review NegosyoOS audit findings”**, chat ID `01a14ecf-0576-7452-be44-86139f295f61`, including the audit review, first-insight improvements, product-vision discussion, marketing decision, and 30-day pilot discussion. Earlier unrelated business-system conversations were not merged without evidence that they describe this app.

Maintain this file whenever a product decision, validated capability, public offer, price, deployment, or pilot finding changes. Record the date and evidence; move an item from planned to implemented only when its actual status supports it. Keep production verification separate from code presence and preserve superseded customer commitments.

### Change log

| Date | Change |
| --- | --- |
| 22 October 2026 | Initial consolidated knowledge base from repository, project runbooks/audits, and accessible NegosyoOS discussion. |
| 22 October 2026 | Connected `origin` to `abs0914/negosyoos` and prepared the initial source baseline, excluding local secrets, temporary renders, and deployment exports. Earlier no-remote/no-commit observations above describe the pre-baseline audit state. |
