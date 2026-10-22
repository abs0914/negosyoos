# NegosyoOS UAT Execution Report

**Execution date:** 2 September 2026  
**Environment:** Local production build (`http://localhost:3000`), local Supabase stack  
**Plan:** `docs/NegosyoOS-Complete-UAT-Plan.docx` version 1.0  
**Decision:** **REJECT / NEW RELEASE CANDIDATE REQUIRED**

## Executive result

The complete UAT cycle could not validly enter full execution. The plan requires lint, typecheck, build, Vitest, and the local Supabase/RLS suite to pass, and it requires ten representative personas, two unrelated Businesses, multiple Branches, plan variants, and seeded operational data.

Two automated entry gates failed. The local database also contains zero users, Businesses, Branches, and memberships, so all authenticated end-to-end journeys and most detailed domain cases are blocked rather than failed. Public, signed-out, health, assessment, boundary, and responsive checks were still executed to identify independent product defects.

The catalog contains **139 planned acceptance items**: 12 end-to-end journeys, 115 detailed scenarios, and 12 non-functional checks.

## Entry-gate results

| Gate | Result | Evidence |
|---|---:|---|
| Unit/integration tests | PASS | 52 files, 171 tests passed (`npm test`). |
| TypeScript/type generation | PASS | Next route types and both TypeScript checks passed (`npm run typecheck`). |
| Production build | PASS | Next.js 16.3.2 compiled; 23 static pages generated; Serwist precached 87 URLs / 1.94 MB (`npm run build`). |
| Lint, zero warnings | **FAIL** | `apps/web/public/sw.js`: 1 error and 88 warnings; generated service worker is included in lint scope (`npm run lint`). |
| Database/RLS suite | **FAIL** | 41 files / 910 checks executed; 1 failure in `module_registry.test.sql`: expected 15 published modules, observed 18 (`npm run test:db`). |
| UAT personas and seed pack | **BLOCKED** | Database observation: `users=0`, `businesses=0`, `branches=0`, `memberships=0`. |
| Production-like environment | **BLOCKED** | Local HTTP only; no prepared multi-browser/device matrix, production email/PKCE, subscription, AI provider, outbound notification, or recovery baseline supplied. |

## Defects

### UAT-001 — Generated service worker breaks the mandatory lint gate

- **Severity:** Sev 2 — release/entry blocker
- **Affected gate:** UAT entry criterion; build-quality evidence
- **Reproduction:** Run `npm run build`, then `npm run lint`.
- **Actual:** ESLint scans `apps/web/public/sw.js` and reports 1 `@typescript-eslint/no-this-alias` error plus 88 warnings. With `--max-warnings=0`, lint exits 1.
- **Expected:** Generated build artifacts are excluded from application-source linting, or the generated artifact passes configured rules.
- **Impact:** The release candidate cannot meet the plan's zero-warning lint entry gate. The failure is reproducible after a successful production build.

### UAT-002 — Module-registry database acceptance assertion is stale

- **Severity:** Sev 2 — release/entry blocker
- **Affected gate:** Database/RLS suite; module registry coverage
- **Reproduction:** Start local Supabase and run `npm run test:db`.
- **Actual:** `module_registry.test.sql` expects 15 published modules; the migrated registry contains 18: accounting, appointments, attendance, compliance, CRM, delivery, employees, expenses, inventory, invoicing, job orders, loyalty, payroll, POS, product catalog, purchasing, quotations, and sales.
- **Expected:** The test and the approved registry baseline agree.
- **Impact:** 1 of 910 database checks fails. This appears to be test-baseline drift after Accounting, PH Compliance, and Payroll were added, but it remains a failed release gate until reconciled.

### UAT-003 — Signed-out platform-admin request renders the global error page

- **Severity:** Sev 2 — authorization-boundary UX and error-handling defect
- **Affected cases:** AUTH-004, SEC-008, SEC-010
- **Reproduction:** In a signed-out browser, open `http://localhost:3000/platform-admin`.
- **Actual:** The page shows “Unexpected error / This page could not be loaded.” Browser console records React error #441; the server logs an exposed `AUTHENTICATION_REQUIRED` AppError with status 401.
- **Expected:** Redirect to `/login?next=...`, return a deliberate 401/403/404-safe page, or otherwise deny without invoking the global route error boundary.
- **Impact:** Users see a system-failure screen for a routine authorization state. Other protected routes tested (`/dashboard`, `/account`, and Business routes) redirect correctly.

## Acceptance execution matrix

`PARTIAL` means only the stated slice was executed; it is not counted as a plan-level pass.

| Case/check | Result | Executed evidence / remaining gap |
|---|---:|---|
| AUTH-001 public pages | PASS | Home, About, Contact, Privacy, and Terms rendered; meaningful headings, internal navigation, and responsive public layouts were present with no private data. |
| AUTH-003 invalid registration/input | PARTIAL | Required and malformed email behavior inspected; full duplicate-email, weak/mismatched signup, and unexpected-field tests require a controlled account fixture. |
| AUTH-004 login and signed-out protection | **PARTIAL / FAIL** | Invalid login failed generically; dashboard, account, and Business routes redirected without leakage. `/platform-admin` failed as UAT-003. Correct/unconfirmed login was blocked by missing accounts. |
| AUTH-005 recovery | PARTIAL | Nonexistent synthetic address produced the same generic success response. PKCE callback, password change, old/new credential, and replay checks were blocked. |
| AUTH-007 APIs and health | PARTIAL | Signed-out `/api/v1/me` returned a stable error envelope and request ID; `/api/health` returned a stable success envelope and request ID with no secrets. Session expiry and stale mutation were blocked. |
| SEC-004 direct protected routes | PARTIAL | Signed-out direct Business URLs, including a syntactically invalid Business ID, redirected to login without entity data. Crafted posts, stale tabs, and privileged-role attempts were blocked. |
| SEC-008 platform admin | **PARTIAL / FAIL** | Signed-out boundary failed as UAT-003; authorized/ordinary-owner administration was blocked. |
| INT-004 health | PARTIAL | Healthy state passed; five local checks completed in approximately 5–12 ms and returned request IDs without configuration secrets. Unavailable-dependency state was not configured. |
| NFR-03 responsive | PARTIAL | Home, login, and assessment had no horizontal overflow at 360, 390, 768, 1024, or 1440 px. Authenticated P0 journeys, real devices/orientation, and 200% zoom remain blocked/not run. |
| NFR-05 performance | PARTIAL | Health and signed-out boundary checks were comfortably below plan targets locally; realistic authenticated data and network percentiles were not available. |
| NFR-07 security | PARTIAL | Basic security headers (`nosniff`, `DENY`, referrer and permissions policies), signed-out boundaries, and generic auth errors were observed. Full OWASP, CSRF, XSS, upload, rate/abuse, and authenticated IDOR work remains blocked. |
| NFR-10 PWA/resilience | PARTIAL | Manifest is valid and includes standalone display, 512×512 any/maskable icons, start URL, scope, and shortcut; offline mutation/read, installation, and reconnect behavior were not run. |
| Exploratory: public health assessment | PASS | Retail/Hardware path completed all 10 sections (20 questions); all-4 inputs produced a deterministic overall score of 100 and 100 for every area, with a signup handoff that preserved assessment context in the URL. |

## Blocked scope

All 12 end-to-end journeys and the authenticated portions of AUTH, BUS, SEC, CFG, OPS, FIN, FUL, ADM, META, AI, INT, and NFR scenarios require the plan's missing personas and seed data. They are **Blocked / Not Run**, not passed. In particular, no valid claims can be made yet about:

- cross-tenant and Branch isolation between two real Businesses;
- money, stock, receivables, loyalty, payroll, and accounting reconciliation;
- role/capability revocation and multi-session behavior;
- module/template/trial/subscription workflows;
- PDFs, uploads, signed URLs, CSVs, or recovery;
- dynamic objects/forms/views/workflows and configuration restore;
- AI proposal, approval, advisor, privacy, and rollback boundaries;
- concurrency, browser/device coverage, accessibility tooling, localization boundaries, or provider failure behavior.

## Release decision and retest order

The release candidate does not satisfy UAT entry or exit criteria. Prepare a new release candidate after:

1. Excluding or correctly handling generated `public/sw.js` in lint, then recording a clean lint run.
2. Reconciling the approved 18-module registry with the database test and recording a clean 910-check (or updated) database/RLS run.
3. Correcting the signed-out `/platform-admin` boundary and retesting all protected top-level routes.
4. Provisioning the ten plan personas, two unrelated Businesses, Branch grants, plan variants, and the full synthetic seed pack in an isolated UAT database.
5. Documenting enabled provider adapters, browser/device coverage, evidence repository, reset/snapshot procedure, and build identifier.
6. Re-running all P0 cases first, then P1, followed by the minimum regression pack and formal sign-off.

