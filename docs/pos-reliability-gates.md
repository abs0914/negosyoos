# POS reliability and release gates

## Capacity and service objectives

Validate 25 Branches, five concurrent registers per Branch, 20,000 catalog items, and 2,000 sales per Branch per day.

- Online command processing: p95 at most 1 second; p99 at most 2 seconds.
- Warm POS startup: at most 1.5 seconds; cold startup on typical 4G: at most 3 seconds.
- Cached 20,000-item search: at most 100 milliseconds.
- Offline durable command commit: at most 150 milliseconds.
- Non-business online transaction failures: below 0.1%.

Measure command latency, database duration, sync delay, queue depth, conflict reason, reconciliation age, and service-worker/client failures. Telemetry must exclude payment references, lease tokens, and customer PII.

## Release gates

1. Online correctness: concurrency, altered replay, retry, rollback, stock contention, sequence allocation, payment transitions, refunds, voids, register close, and reconciliation tests pass with no unexplained mismatch.
2. Dependability: query plans use the POS projection indexes; 125-register load, 20,000-item search, end-of-day close, reconnect storm, and audit export meet the objectives.
3. Recovery: PITR is enabled, the latest quarterly isolated restore meets RPO/RTO, object backup is verified, and database/security advisors have no unresolved release blocker.
4. Pilot: enable Business, Branch, and register flags for two or three Branches for four weeks.
5. Expansion: zero duplicate financial transactions or lost acknowledged sales; every valid queued command reaches a terminal state; at least 99.9% sync without manual action; no unexplained payment, register, numbering, or stock variance; every exception is attributable and resolvable.

Keep offline refunds, voids, inventory adjustments, receivables, statutory invoices, and configuration changes disabled until separate correctness and Philippine legal/BIR reviews approve them.
