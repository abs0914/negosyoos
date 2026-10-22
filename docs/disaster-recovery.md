# Disaster recovery runbook

## Objectives and ownership

- Recovery point objective: 15 minutes or better through Supabase PITR.
- Recovery time objective: two hours from incident declaration to validated application recovery.
- Incident commander: Operations lead. Owns severity, timeline, customer communication, and final go/no-go.
- Restore operator: Platform engineer. Owns the isolated restore, credentials, DNS/configuration, and evidence bundle.
- Data validator: Engineering lead. Owns validation queries and post-restore reconciliation.
- Customer liaison: Support lead. Owns status notices and affected-Business follow-up.

PITR and sufficient compute must be enabled and funded before the offline feature flag can be enabled. Database backups include Storage metadata but not stored objects. Maintain a separate, encrypted, versioned object backup before operational documents are placed in Supabase Storage.

## Incident procedure

1. Declare the incident, freeze non-essential deployments, record the suspected first-bad time, and preserve logs.
2. Select the newest recovery point before the fault while staying within the RPO. Restore into an isolated Supabase project; never overwrite the only recoverable environment.
3. Rotate database, service-role, signing, webhook, and deployment credentials that may have been exposed. Update the recovery environment through the normal secret store.
4. Run migrations only when the restored schema is older than the application release. Record every command and operator.
5. Execute the validation checklist below. Any unexplained mismatch blocks cutover.
6. Put synchronization into controlled drain mode. Re-submit only commands whose UUID and payload hash do not already have an authoritative command receipt.
7. Switch application configuration to the validated environment, perform smoke tests, and monitor queue age, failures, and reconciliation cases.
8. Publish customer communication with the affected window, current status, and any required register action. Do not speculate about loss before validation.
9. Complete post-restore reconciliation and a written incident review. Keep the evidence bundle according to the audit-retention policy.

## Validation checklist

- Compare Business, Branch, member, register, and open-session counts with the last known metrics.
- Reconcile sale line totals, payment totals/statuses, register expected cash, actual cash, and variance by Business and Branch.
- Prove each stock balance equals the sum of its movement ledger, including accepted negative-stock exceptions.
- Confirm canonical document sequences are at or above every committed document number and that voided/cancelled identities remain traceable.
- Confirm every POS command UUID maps to at most one payload hash and one stored result.
- Confirm audit rows are append-only and command/request correlation is intact.
- Exercise RLS with two tenants and verify cross-tenant reads and mutations fail.
- Verify pending payments and unresolved reconciliation cases are visible in the operations console.
- Start the production build, authenticate, load a 20,000-item catalog projection, post a test sale, and close a test register.
- Verify Storage object inventory and checksums independently from database Storage metadata.

## Quarterly drill

Run an isolated restore every quarter. Record start/finish times, selected recovery point, achieved RPO/RTO, validation output, object-backup checks, owners, failures, and remediation due dates. A missed recovery point, failed drill, audit/reconciliation backlog, storage-pressure alert, or material query regression blocks expansion of the offline pilot.
