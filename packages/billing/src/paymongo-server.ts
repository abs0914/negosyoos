import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@negosyo-os/database";
import type { PlanKey } from "./index";
import { createHostedCheckout, parsePaidCheckout, paymentConfiguration, PaymongoError, verifySignature } from "./paymongo";
import { checkoutQuote, type BillingInterval } from "./pricing";

function adminClient() {
  paymentConfiguration();
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Call only after the session client has checked subscription.manage for this business.
export async function beginPaymongoCheckout(businessId: string, plan: PlanKey, name: string, interval: BillingInterval, branches: number) {
  const config = paymentConfiguration();
  const { amount, branchLimit } = checkoutQuote(plan, interval, branches);
  const admin = adminClient();
  const { data: existing, error: lookupError } = await admin.from("payment_checkouts").select("id,plan_key,checkout_url,livemode,billing_interval,branch_limit")
    .eq("organization_id", businessId).in("status", ["creating", "open"]).maybeSingle();
  if (lookupError) throw new PaymongoError("Checkout is temporarily unavailable.", 503);
  if (existing) {
    if (existing.plan_key !== plan || existing.livemode !== config.live || existing.billing_interval !== interval || existing.branch_limit !== branchLimit)
      throw new PaymongoError("An unfinished checkout exists. Resume that plan’s checkout or contact support to change it.", 409);
    if (existing.checkout_url) return existing.checkout_url;
    throw new PaymongoError("Checkout is being prepared. If this persists, contact support before paying again.", 409);
  }
  const id = crypto.randomUUID();
  const { error } = await admin.from("payment_checkouts").insert({
    id, organization_id: businessId, plan_key: plan, amount_centavos: amount, livemode: config.live,
    billing_interval: interval, branch_limit: branchLimit,
  });
  if (error) throw new PaymongoError("Another checkout may be in progress. Refresh billing and try again.", 409);
  // Keep an uncertain request reserved: retrying a timed-out create can produce two payable sessions.
  const session = await createHostedCheckout({ id, businessId, plan, name, amount, interval, branchLimit }, config);
  const { error: saveError } = await admin.from("payment_checkouts").update({
    provider_session_id: session.sessionId, checkout_url: session.url, status: "open",
  }).eq("id", id).eq("status", "creating");
  if (saveError) throw new PaymongoError("Checkout could not be saved. Please contact support before paying.", 503);
  return session.url;
}

export async function receivePaymongoWebhook(body: string, signature: string | null) {
  const config = paymentConfiguration();
  verifySignature(body, signature, config.webhookSecret, config.live);
  const paid = parsePaidCheckout(body, config.live);
  if (!paid) return;
  const { error } = await adminClient().rpc("settle_paymongo_checkout", {
    requested_checkout_id: paid.checkoutId, requested_session_id: paid.sessionId,
    requested_payment_id: paid.paymentId, requested_amount: paid.amount,
    requested_currency: paid.currency, requested_livemode: paid.live,
  });
  if (error) throw new PaymongoError("Payment confirmation could not be saved.", 503);
}
