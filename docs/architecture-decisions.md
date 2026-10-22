# Initial architecture decisions

## ADR-001: Modular monolith first

NegosyoOS starts as a modular monolith. Domain boundaries are explicit in code and schema, while one deployable Next.js application and one PostgreSQL database keep transactions, operations, and iteration simple. A domain can be extracted only when measured scaling or ownership pressure justifies the distributed-system cost.

## ADR-002: Organization is the security tenant

Organizations are the hard tenant boundary. Branches remain children so a business can report and manage access across locations without duplicating subscriptions, templates, or configuration. PostgreSQL RLS is mandatory on every exposed table and application authorization is defense in depth.

## ADR-003: RBAC with stable permission keys

Roles are organization-owned and map to a global, code-reviewed permission catalog. Application code checks permission keys, never role names. This allows each SME to customize roles without changing authorization logic. The creator bootstrap rule prevents an unmanageable organization before initial role assignment.

## ADR-004: Metadata stores definitions, not arbitrary SQL

Object, field, workflow, report, and dashboard tables store validated JSON configuration. They do not store executable SQL or provider secrets. Runtime engines must compile these definitions into allow-listed operations, enforce tenant predicates, version published definitions, and maintain audit trails.

## ADR-005: Server-first data access

Server Components and Server Actions are the default. TanStack Query is reserved for client-owned interaction requiring caching, polling, optimistic updates, or invalidation. This reduces shipped JavaScript and avoids duplicating the server cache model.

## ADR-006: Provider-neutral AI and billing boundaries

Organization AI rows store model policy/feature configuration, not credentials. Provider secrets remain server-only. Subscription rows mirror provider state but do not make browser callbacks authoritative; signed webhooks and idempotency will be designed with the billing integration.

## ADR-007: AI proposes configuration, never implementation

AI output is limited to strict, versioned configuration operations owned by `@negosyo-os/configuration`. The AI has no schema migration, SQL execution, source-file write, or direct production database capability. Unknown output properties are rejected. A deterministic engine previews and applies authorized change sets with optimistic revision checks and an audit trail. The future OpenAI integration is an adapter behind this contract, not a privileged application runtime.

## ADR-008: Workspace modular monolith

The repository uses npm workspaces with one deployable web application and bounded packages for database, auth, UI, core, configuration, modules, templates, workflow, and AI. Cross-package access occurs through explicit exports. No microservice, message broker, Redis, or monorepo build framework is introduced until a measured requirement exists.

## ADR-009: PWA before native mobile

The web application publishes an installable manifest and security headers now. Offline mutation queues, push notifications, and background synchronization are deferred until their tenant isolation, conflict resolution, and delivery guarantees are designed. Native mobile is considered only after the PWA exposes a proven capability gap.

## ADR-010: Supabase Auth with server-verified identity

Supabase Auth owns password credentials and session rotation. Next.js Proxy refreshes cookies and may perform optimistic route redirects, but every Server Component, Server Action, and Route Handler that handles protected data verifies signed claims again. Application code exposes a minimal identity and authorizes tenant operations from database membership and permission records, never client state or editable user metadata. Email verification uses token-hash exchange; PKCE callback infrastructure is shared by password recovery and future Google/Facebook providers. Mobile OTP and social providers remain explicit, disabled extension points until their operational configuration is approved.

## ADR-011: Business is the product tenant; organization_id is the persistence key

Product and TypeScript APIs use Business terminology while PostgreSQL retains `organizations`, `organization_memberships`, and `organization_id`. Renaming the established platform-wide foreign key would create migration risk without improving the security model. An atomic, tightly granted `create_business` RPC bootstraps the owner membership, RBAC, settings, and main branch. After bootstrap, `created_by` is audit-only: active membership and explicit permission assignments are the sole access path. Route layouts perform server tenant guards, all single-tenant queries include the tenant predicate, and PostgreSQL RLS is the authoritative backstop. Tenant-key reassignment is rejected by database triggers.

## ADR-012: Capability RBAC with optional Branch context

Authorization is based on stable permission keys, not role names or client claims. Roles are Business-owned permission sets and members may hold multiple roles. The six default roles are immutable platform baselines; custom roles remain editable. Branch scope is modeled separately on membership as either all Branches or selected Branch grants, allowing the same role to be reused across locations. `can(user, permission, context)` verifies the current server identity and delegates the final decision to PostgreSQL. UI visibility is a usability concern only; Server Actions, atomic RPCs, and RLS repeat authorization at their own trust boundaries.

## ADR-013: Platform-owned Module Registry with declarative configuration

Reusable capabilities are published as global `ModuleDefinition` records, while each tenant owns only its `BusinessModule` activation and validated configuration. Dependencies are normalized edges rather than duplicated JSON so PostgreSQL can enforce activation and deactivation invariants transactionally. Configuration uses a deliberately small, non-executable schema language that compiles to Zod in application code and is checked again at the database mutation boundary. Module state writes flow through one capability-protected atomic function, and direct table mutations are not granted to authenticated clients. Enabled-module navigation is derived from the registry, leaving Phase 3 free to attach real operational screens without modifying the platform shell for every module.

## ADR-014: Shared JSONB records with indexed system fields

Dynamic objects never produce tenant-specific DDL. Object and field definitions are metadata, while all runtime records share an `object_records` table partitioned logically by `organization_id` and protected by RLS. Stable system columns cover tenancy, object identity, Branch scope, display text, lifecycle, actors, and timestamps; configurable attributes live in strict JSONB. Active-list, Branch, display, and GIN containment indexes serve known access patterns. Dynamic uniqueness is enforced through a normalized private projection table rather than runtime index creation. Zod provides early application feedback, but capability-protected database functions repeat structural and referential validation and update records plus unique projections atomically.

## ADR-015: Forms are declarative projections of object metadata

Forms do not own field types or record validation. A FormDefinition selects one ObjectDefinition and one create/edit mode; its FormLayout orders existing FieldDefinitions into versioned sections and adds presentation or stronger constraints. Conditional visibility uses a small allow-listed rule AST whose references must point backward in layout order. Executable JavaScript, arbitrary expressions, and unknown JSON properties are invalid. The browser evaluates rules for responsiveness, while the server reloads authoritative form/field metadata and evaluates them again before calling the Object Builder mutation boundary. PostgreSQL independently validates layout structure, tenant ownership, field defaults, condition operands, required create fields, capabilities, and RLS.

## ADR-016: Views are metadata interpreted by one runtime

Object list screens use `ViewDefinition` metadata instead of object-specific React components. Table, cards, and kanban layouts consume the same filtered, sorted, grouped, Branch-scoped, and paginated runtime result. Column and filter references are stable Object field keys plus a small set of system keys. Filters and saved filters use a strict allow-listed operator AST; arbitrary code and SQL are invalid. A personal definition is owner-visible, while shared definitions follow record-read visibility and require metadata-management permission to mutate. PostgreSQL RLS remains authoritative for every record loaded by the runtime.

## ADR-017: Workflows are bounded state machines, not scripts

Workflow definitions contain only allow-listed triggers, condition operators, actions, value sources, and retry settings. The runtime interprets that metadata and delegates record mutations back to the Object Builder boundary; definitions can never store or execute JavaScript, SQL, or arbitrary expressions. Executions and steps use explicit state transitions, a database-enforced idempotency key, bounded attempts, durable errors, and immutable audit events. Test mode follows the same trigger and condition path while substituting validated no-op action results. The in-process dispatcher is the initial adapter; its interface and due-time index allow a queue worker to be introduced without changing definitions.

## ADR-018: Offline POS is a leased command log

Offline POS is a versioned, append-only command log rather than a client-side copy of the database. An enrolled register receives an opaque, hashed, Business/Branch/register/user-scoped lease for at most 24 hours. The browser stores no Supabase service credential. Each device assigns a monotonic local sequence and a globally unique provisional receipt reference; only the authoritative PostgreSQL command processor assigns the canonical receipt number during commit.

Online and synchronized commands use the same database function, validation rules, payload hash, idempotency key, deterministic inventory locks, and immutable audit evidence. A matching replay returns its original result; an altered replay is rejected and audited. Commands are uploaded in device order, but each command commits independently so one terminal conflict cannot roll back valid neighbors. Client stock balances are never merged into the server.

An offline sale that was durably completed for the customer remains a financial fact. If authoritative stock is insufficient on replay, the server accepts the sale, records the resulting negative balance, and opens a stock reconciliation case. Offline digital payments remain pending until verified. Formal invoices, receivables, refunds, voids, inventory adjustments, and configuration changes stay online-only in v1.

Foreground synchronization is authoritative. Background Sync may accelerate delivery on supporting browsers, but the product does not promise background execution on iOS. Expired, tampered, cross-tenant, wrong-Branch, malformed, or payload-mismatched commands become terminal exceptions and remain visible for manager review. Acknowledged local payloads are retained for seven days before sensitive fields are purged; unresolved commands remain until reconciled or explicitly cleared by an authorized manager.

## Deferred decisions

- Version publication and migration rules for Business OS templates
- Workflow execution queue and idempotency model
- Report compiler and safe query representation
- AI provider selection, data residency, and consent controls
- Billing provider and Philippine tax/invoicing integration

Each deferred item requires its own ADR before implementation.
