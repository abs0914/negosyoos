# Business World pilot

Implemented as an optional route at `/business/[businessId]/world`. The dashboard remains the default unless a user chooses World for business selection. On 10 November 2026, deployed as an allowlisted production pilot for Sampaguita Test Store; see [production release verification](2026-11-10-production-release.md).

## Local preview and rollout

- Preview: `http://127.0.0.1:3137/business/caf9a6e0-79e0-43c7-bce9-5a550d9cdc46/world`.
- Enable explicitly with server-only `BUSINESS_WORLD_ENABLED_IDS`, a comma-separated list of business UUIDs. An empty value disables the route, API, and navigation. The local environment enables only Sampaguita Test Store.
- Apply `20261109124859_business_world.sql` using the repository Supabase migration workflow before enabling other environments. It adds configuration, personal preferences, private Broadcast authorization, and empty invalidation triggers. It changes no operational tables' columns or metric definitions.
- Shared configuration requires `settings.manage`; personal landing view, branch, representation, and motion are separate. Unknown configuration versions are preserved and cannot be overwritten by this client.
- Industry presets include retail, food, salon, repair/laundry, wholesale, professional services, and mixed. Enabled tools and domain permissions determine functional zones. The retail pilot is the initial validation target; other industries require representative populated-business validation before rollout.

## Implementation map

- `apps/web/src/features/business-world/model.ts`: validated public contracts, suggestions, deterministic placement, industry names, currency formatting.
- `server.ts`: membership and domain authorization, module-aware snapshot, explicit scope, isolated failures.
- `actions.ts`: validated configuration and preference persistence.
- `use-world.ts`: private invalidation subscriptions, initial subscription reconciliation, 350ms coalescing, reconnect handling, 30-second reconciliation/polling, abort and unsubscribe while hidden.
- `world-scene.tsx`: lazy R3F renderer, orthographic bounded controls, shared low-poly geometry/materials, instanced stock boxes, adaptive pixel density, limited mobile decoration, on-demand rendering with an explicit animation driver while motion is enabled. Decorative walkers and a delivery-status-driven truck bring the miniature to life. Alert zones have red beacon posts and ground rings that breathe every 2.4 seconds. Paused/reduced-motion/hidden views stop the driver; static alerts and keyboard-operated attention shortcuts remain available.
- `world-view.tsx`: dropdown preview, accessible area buttons, details panel/mobile sheet, focus restoration, 2D fallback, freshness state.
- Service worker never caches snapshots and excludes renderer/Three.js chunks from eager precaching. Only World imports the renderer.

## Metric meanings and limits

- Receipt totals reuse Sales: original completed receipts including tax, before returns/refunds. They are not net sales, profit, or cash flow. Day boundaries use Asia/Manila.
- Sales, stock, customers, delivery, appointments, jobs, and employees support branch scope. Purchasing and receivables are unavailable under a selected branch; the UI directs users to the business overview. No aggregate is relabeled as a branch figure.
- Inventory uses the existing item/location-pair definition for low/out-of-stock. Location units are grouped, with at most six locations displayed in the panel. Existing Inventory pages provide the complete history and locations.
- Inventory pagination rejects incomplete/changing-count reads; purchasing dashboard counts are computed by the database. These corrections also benefit existing pages.
- Empty is different from unavailable. Failed domain values are omitted, never replaced by zero. Failed snapshot authorization clears all protected metrics. No customer names, order rows, or amounts are broadcast.
- People are decorative. A truck's short movement represents recorded delivery state, not GPS. World actions navigate to the existing forms.

## Validation recorded on 2026-11-09

- Unit tests cover deterministic placement, configuration compatibility, mixed industries, omitted permissions, branch scoping, partial failures, domain-service parity, and complete inventory pagination.
- 15 transactional pgTAP checks pass for tenant isolation, owner/viewer restrictions, private preferences, future schema rejection, disabled/malformed/foreign channels, and revoked membership.
- Tested a committed no-op update to the existing local sample customer: private CRM invalidation arrived in 211ms. Payload contained only a transport-generated ID, no operational row or metric. This measures notification delivery, not an end-to-end production freshness guarantee.
- Browser: authenticated live connection; 3D rendering; checkout and customer metrics; Escape/focus restoration; saved dropdown preview; branch-scoped unavailable receivables; 360px layout with no horizontal overflow; mobile details sheet; 2D switch.
- Scene uses zero downloaded model/texture bytes. Build inspection measured about 249KB gzip in the renderer chunk (JavaScript, separate from the scene-asset budget); the chunk was absent from the service-worker precache.
- Application tests: 59 files / 227 checks passed. The entire transactional database suite passed: 42 files / 925 pgTAP checks, including the 15 new World checks. TypeScript and production build passed; lint is checked with zero warnings permitted.

## Required gates before wider release

These checks require real devices, populated pilot businesses, or participants and are not claimed as completed:

1. Agree a mid-range Android device and measure cold load over simulated 4G: usable overview <=3 seconds; interaction >=30 FPS. Measure desktop against the 60 FPS target. Dev-mode screenshots are not performance evidence.
2. Validate populated sales/refunds, purchases/partial receipts, stock transfers, customer activity, delivery status/overdue work, appointments/jobs/staff, mixed industries, and multiple branches against their source pages.
3. Exercise reconnects, missed signals, network loss, permission revocation during an open session, WebGL context loss, screen readers, touch rotation/pinch, reduced motion, and hidden-tab lifecycle on target browsers. Unit/database checks do not replace these device checks.
4. Recruit at least five representative owners. Randomize dashboard/World task order: identify a shortage, find today's receipt total, locate a delivery needing attention. Record completion, time, errors, device, and feedback; do not record business amounts or customer details. Require >=90% completion and median time no worse than dashboard before considering any default change.
5. Consume the `negosyo:world-telemetry` browser event in the application's approved analytics sink. It emits event category and optional duration only (`load`, `render_failure`, `freshness`, `zone_action`, `fallback`). It currently has no external destination. Validate collection before an opt-in pilot.

Rollback: remove business UUIDs from the allowlist. Keep the additive tables/migration; ordinary dashboard and domain routes continue to function.
