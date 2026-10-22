# PayMongo subscription payments

NegosyoOS uses PayMongo Hosted Checkout v2 for prepaid monthly/annual access. It does **not** enroll customers in automatic recurring charges. Same-plan/same-capacity renewals extend existing paid time. Plan or capacity changes start immediately at full price, with no proration or unused-time credit; billing explains this before checkout.

## Prices

The server and billing UI share `packages/billing/src/pricing.ts`. All API amounts are integer PHP centavos.

| Plan | Monthly | Annual | Branches included |
| --- | ---: | ---: | ---: |
| Starter | ₱499 | ₱4,990 | 1 |
| Pro | ₱1,299 | ₱12,990 | 1 |
| Growth | ₱2,499 | ₱24,990 | 3 |
| Multi-branch | ₱4,999 | ₱49,990 | 3 |

Multi-branch extras cost ₱1,250/month each. Annual extras use the same two-month discount: ₱12,500/year each. A checkout supports up to 100 total branches. The database prevents purchasing less capacity than the business currently uses and prevents adding branches beyond paid or pending capacity. Other existing plan limits remain as configured.

## Enable test payments

1. Apply `packages/database/supabase/migrations/20260916063707_paymongo_checkout.sql` using your normal migration process before deploying the new billing page. Regenerate database types against the migrated Supabase database when available.
2. Configure these **server-only** values in `apps/web/.env.local` locally or the production deployment secret store:

   ```dotenv
   PAYMONGO_SECRET_KEY=sk_test_...
   PAYMONGO_WEBHOOK_SECRET=...
   SUPABASE_SERVICE_ROLE_KEY=...
   PAYMONGO_PAYMENT_METHODS=qrph
   APP_URL=https://your-public-app-domain
   ```

   The existing `NEXT_PUBLIC_SUPABASE_URL` points at the same database as the service-role key. No PayMongo public key is needed. Never put a secret in a `NEXT_PUBLIC_` variable or commit actual secrets. Docker Compose forwards these values at runtime.

3. In PayMongo's dashboard, register `https://your-public-app-domain/api/webhooks/paymongo` for **`checkout_session.payment.paid`**. Copy that endpoint's signing secret into `PAYMONGO_WEBHOOK_SECRET`. For local testing, use a public HTTPS tunnel and set `APP_URL` to its origin.
4. Enable only methods available to the merchant account: comma-separated `qrph`, `card`, `gcash`, `paymaya`, `grab_pay`. QR Ph is the default. Method availability is ultimately controlled by PayMongo.
5. Restart the app. Sign in as a business member with `subscription.manage`, open Billing, and complete a test checkout. Verify the payment history says Paid and the correct plan, period, and branch capacity appear.
6. Replay the signed webhook through PayMongo's tooling: a duplicate must not add a second paid period. Browser return URLs alone must never activate a subscription. Confirm a failed/canceled payment leaves the prior subscription unchanged.

## Production

Use the live secret key and the signing secret from the live webhook endpoint together. Keep test and live deployments/databases separate so test payments cannot grant access in the production database. Register the production HTTPS webhook URL and enabled methods, deploy the migration, then verify a live transaction through the merchant's normal launch process. Never switch a database with test entitlements into production without cleaning up those test businesses/subscriptions.

The webhook verifies the raw body using HMAC-SHA256, constant-time comparison, the mode-specific `te`/`li` signature, and a five-minute timestamp tolerance. Keep the server clock synchronized. It supports current and legacy event envelopes, requires one paid PHP payment, and checks the persisted amount, session, currency, and mode. The database transaction deduplicates payments and updates subscription, branch allowance, audit event, and checkout together. Non-2xx database responses allow provider retries.

## Unfinished checkout recovery

Only one payable checkout is allowed per business. Returning via Cancel does not expire the PayMongo session; Billing offers Resume. A timeout while creating a session deliberately keeps the reservation, because blindly retrying could create two payable sessions.

For a stuck `creating` checkout, an operator should look up its `reference_number` (the checkout UUID) in PayMongo. If a session was created, reconcile `provider_session_id`, `checkout_url`, and status `open` on that row, then let the customer resume. If it was already paid, redeliver its webhook. If there is no session, or the existing session has been confirmed expired/unpayable by PayMongo, mark the reservation `void` through a trusted database operator and let the customer start again. **Never void a locally pending row while its remote session is still payable.** No browser action has write access to these fields.

Paid branch capacity is enforced at the database boundary. Expiry is evaluated when subscription features/limits/dashboard are checked. This integration does not implement automatic debits, refunds, dunning, proration, or automated session cancellation.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

`paymongo.test.ts` verifies quotes, request construction, signatures, and event parsing. `paymongo-database.test.ts` executes the real migration and existing settlement function in embedded PostgreSQL (PGlite), with isolated auth/tenant fixtures. It covers settlement atomicity, duplicates, mode/amount/session matching, annual renewals, branch capacity, expiration, RLS and service-role restrictions. This supplements the full Supabase database suite; it does not replace a merchant test-mode transaction or testing against the deployed Supabase schema.

References: [PayMongo hosted checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), [webhook signature verification](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management).
