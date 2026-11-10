# Sampaguita Test Store marketing dataset

Populated in the **local Supabase** database on **9 November 2026 (Asia/Manila)**. All newly created entities are fictional. Existing business settings, memberships, and the original design-review customer were preserved. No external supplier orders, messages, payments, or courier bookings were sent.

Business: `caf9a6e0-79e0-43c7-bce9-5a550d9cdc46`

Preview: http://127.0.0.1:3137/business/caf9a6e0-79e0-43c7-bce9-5a550d9cdc46/world

## Demo story

A neighborhood hardware store has a busy checkout, stock available in its warehouse, incoming supplies, and a few tasks for its owner to resolve.

| Area | Seeded records and verified totals |
| --- | --- |
| Catalog | 24 products in 6 categories; identifiable `DEMO-` SKUs |
| Inventory | Main Branch Stock plus Demo warehouse; 2,317 total stock units; ₱226,242 inventory value |
| Checkout | 32 completed, fully paid receipts; ₱18,967 total; ₱592.72 average receipt; cash and digital payments |
| Stock alerts | 3 low-stock item/location pairs and 1 out-of-stock pair, all in the store; warehouse has replenishment stock |
| Customers | 12 fictional customers added; 13 total including the original design-review customer; all 32 sales linked to customers |
| Suppliers | 4 fictional suppliers |
| Purchasing | 5 purchase requests; 4 purchase orders: 2 issued, 1 partially received, 1 received; 1 request awaiting approval; 2 goods receipts and 2 supplier invoices |
| Receivables | 5 invoices: 2 overdue, 1 issued, 1 partially paid, 1 paid; 3 recorded payments; ₱19,950 outstanding, including ₱11,500 overdue |
| Delivery | 5 sale-linked records: 1 pending, 1 overdue scheduled, 1 out for delivery, 2 failed |
| Quotations | 2 drafts and 1 discount quotation awaiting approval |
| Expenses | 6 records totaling ₱24,625: 4 approved (₱22,800), 2 pending (₱1,825) |
| Approvals | 4 pending: 1 purchase request, 1 quotation, 2 expenses |

## Suggested walkthrough

1. Open **Numbers**: show receipt totals, receivables, and four stock alerts.
2. Switch to **3D World** and select **Storefront & checkout**: show the same receipt total and transaction count.
3. Select **Shop shelves**: claw hammer has 4 units, measuring tape 3, silicone sealant 2; adjustable wrench is sold out at the store.
4. Select **Stock storage**: show that warehouse stock can replenish the store using the existing transfer workflow.
5. Select **Supplier bay**: review an incoming order and a partial receipt.
6. Select **Delivery area**: find the overdue scheduled delivery or failed attempt.
7. Select **Accounts desk**: review overdue balances and a partially paid invoice.

The invoices represent **historical opening trade balances**, separate from today's fully paid POS transactions. They do not represent another dispatch of today's stock. Receipt totals are not profit or cash flow. Product taxes are explicitly set to exempt for this sample dataset; this is not tax guidance or a real business tax configuration.

Delivery completion was intentionally not fabricated: the business requires proof of delivery, so the fixture contains active and failed deliveries without fake proof files. Product photos and actual delivery proofs are not included.

## Date behavior

The 32 receipts were recorded on 9 November 2026, with actual creation/completion timestamps. They will remain in sales history, but **Today's receipt totals will change after midnight**. For later recordings, use the appropriate historical date filter in Sales or record a new demo sales day through the normal POS workflow. Do not rewrite immutable sales or inventory history to make screenshots look current.

## Reproduction and verification

`sampaguita-demo.sql` uses public domain RPCs under the existing test owner's authenticated identity. It executes as one transaction, checks the exact target business, and refuses to run when its catalog is already populated. No RLS or approval rules are disabled, and no operational tables are directly patched.

PowerShell, from the repository root, against the local Docker container only:

```powershell
# Validate on an empty local demo catalog; rollback is the default.
Get-Content docs/testing/sampaguita-demo.sql -Raw |
  docker exec -i supabase_db_negosyo-os psql -X -U postgres -d postgres -v ON_ERROR_STOP=1

# Explicitly persist after validation, only when provisioning an empty local demo.
Get-Content docs/testing/sampaguita-demo.sql -Raw |
  docker exec -i supabase_db_negosyo-os psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -v commit_demo=true
```

Verified: transactional dry run, successful commit, store stock reconciliation against sold quantities, nonnegative stock, receipt payment reconciliation, exact receivable/overdue balances, expense approval transitions, and duplicate-run rejection. Confirmed populated Numbers dashboard and live World checkout metrics in the browser. No application source changes were needed for this fixture.
