# Production release — 10 November 2026

Application revision: `ba5d605` (`main`, pushed to GitHub).
Production origin: `https://negosyoos.com`.
Supabase project: `pswjcwlaufupexaojuif`.

## Authorized demo copy

The user requested deployment and copying the local `preview.test@negosyo.example` business to the existing production account `test@hardware.com`. The destination account was confirmed and had no memberships; production had no organizations before the copy. Its password and Auth identity were not changed.

Business UUID is preserved: `caf9a6e0-79e0-43c7-bce9-5a550d9cdc46`.

Copied 1,094 rows across 73 tables, including business setup, tenant roles/permissions, enabled modules, products, inventory, sales, purchasing, customers, invoices/payments, deliveries, quotations, expenses, approval history, trial state, and World configuration. Existing production global definitions were matched by stable keys and template versions. The local owner UUID was mapped to the existing production user UUID.

Preserved original dates and records; this is not a regenerated sales day. The 32 receipts totaling **₱18,967** are dated **9 November 2026**. On 10 November, today's receipt total is correctly zero. Receivables total **₱19,950**, and inventory value is **₱226,242**. The existing trial ends **24 December 2026**; this import does not create a paid subscription or charge.

Excluded Auth credentials/sessions, offline leases, POS device/session state, general local diagnostic audit events, and accounting integration queue entries. No external messages, supplier orders, courier bookings, or billing transactions were sent. A production `demo.imported` audit event records the operation and source checksum.

Source export SHA-256: `3F7F358D2908E76CD4408D42326B3A6FE071DD8E0A7D1F0A47A25CF4772E1566`.

## Database changes and checks

- Applied repository migrations `paymongo_checkout` and `business_world` through the Supabase migration tool. Production previously lacked both; no existing migration was replayed by filename because production uses different historical timestamps.
- Import was rehearsed in a rolled-back transaction before commit, guarded against a nonempty destination.
- Transaction-local restore mode prevented duplicate business triggers and notifications; every foreign key on imported tables was explicitly checked before commit. Normal trigger mode was restored, and RLS policies were unchanged.
- Checked row insertion counts, receipt totals, receivables, and stock values.
- Verified the destination owner can read all 32 sales and 13 customers, manage settings, discover the ten enabled modules, and subscribe to the authorized World topic.
- Verified an unrelated authenticated identity sees no businesses or sales and cannot subscribe to the demo World topic.
- Local lint, type checks, 227 application tests, and all 42 transactional database test files passed.

## Deployment and recovery

- Release directory: `/opt/negosyoos-releases/ba5d605`.
- Previous source/environment remains in `/opt/negosyoos`.
- Previous image retained as `negosyoos-web:rollback-20261110`.
- World runtime allowlist contains only the demo business UUID. No general World rollout.
- Source export and guarded import SQL are in ignored local `output/`; they contain fictional demo data and are not shipped in the application image.

## Completed production verification

- Docker production build and service-worker generation passed. Container `negosyoos` is healthy, running image `sha256:bd90ec9b5ef65161604a0f3157c7052188246b5db5b75113100b8e0b51d61c63` from the release directory.
- `https://negosyoos.com/api/health` returns HTTP 200. The World API returns HTTP 401 without authentication.
- The user signed in with the existing production account. Verified the redesigned dashboard and World navigation in that session.
- World displays **Live**, seven connected areas, and four attention areas. Clicked stock details (3 low / 1 out) and accounts details (₱19,950 receivables / ₱11,500 overdue). The 3D scene, red beacons, alert labels, and existing action links render successfully in production.
- Production screenshot: `C:/Users/USER/AppData/Local/Temp/negosyoos-production-world.png`.
- No mobile performance benchmark or representative owner study was performed as part of deployment; the World remains an allowlisted pilot.

The Supabase security advisor also reports existing platform-level notices (including the `pg_net` extension location and disabled leaked-password protection). These were recorded without changing unrelated platform settings. Authenticated security-definer RPC notices require interpreting their internal permission checks; they are not themselves proof of exposed tenant data.
