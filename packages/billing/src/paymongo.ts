import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { PlanKey } from "./index";
import type { BillingInterval } from "./pricing";

type Environment = Record<string, string | undefined>;
const methodSchema = z.enum(["card", "gcash", "paymaya", "qrph", "grab_pay"]);
export class PaymongoError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = "PaymongoError"; }
}

export function paymentConfiguration(env: Environment = process.env) {
  const secretKey = env.PAYMONGO_SECRET_KEY;
  const webhookSecret = env.PAYMONGO_WEBHOOK_SECRET;
  const methods = z.array(methodSchema).min(1).safeParse(
    (env.PAYMONGO_PAYMENT_METHODS || "qrph").split(",").map(value => value.trim()),
  );
  const url = z.url().safeParse(env.APP_URL);
  const appUrl = url.success ? new URL(url.data) : null;
  const safeOrigin = appUrl && !appUrl.username && !appUrl.password &&
    (appUrl.protocol === "https:" || (appUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(appUrl.hostname)));
  if (!secretKey || !/^sk_(test|live)_\S+$/.test(secretKey) || !webhookSecret ||
      !env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL || !safeOrigin || !methods.success) {
    throw new PaymongoError("Payments are not configured yet.", 503);
  }
  return { secretKey, webhookSecret, live: secretKey.startsWith("sk_live_"), appUrl: appUrl.origin, methods: methods.data };
}

export function checkoutAvailability(env: Environment = process.env) {
  try { paymentConfiguration(env); return true; } catch { return false; }
}

export function verifySignature(body: string, header: string | null, secret: string, live: boolean, now = Date.now()) {
  const parts = new Map((header ?? "").split(",").map(part => {
    const [key, value] = part.trim().split("=");
    return [key, value] as const;
  }));
  const timestamp = parts.get("t");
  const signature = parts.get(live ? "li" : "te");
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 ||
      !signature || !/^[a-fA-F0-9]{64}$/.test(signature)) {
    throw new PaymongoError("Invalid webhook signature.");
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) throw new PaymongoError("Invalid webhook signature.");
}

const sessionSchema = z.object({
  id: z.string().startsWith("cs_"),
  attributes: z.object({
    reference_number: z.uuid(),
    payments: z.array(z.object({
      id: z.string().startsWith("pay_"),
      attributes: z.object({ amount: z.number().int().positive(), currency: z.literal("PHP"), status: z.string() }),
    })),
  }),
});

// Accept both the current v2 event envelope and the legacy webhook envelope.
export function parsePaidCheckout(body: string, live: boolean) {
  const envelope = z.object({ data: z.object({
    type: z.string(), livemode: z.boolean().optional(), data: z.unknown().optional(),
    attributes: z.object({ type: z.string(), livemode: z.boolean(), data: z.unknown() }).optional(),
  }) }).parse(JSON.parse(body));
  const event = envelope.data.type === "event" ? envelope.data.attributes : envelope.data;
  if (!event || event.livemode !== live) throw new PaymongoError("Webhook mode mismatch.");
  if (event.type !== "checkout_session.payment.paid") return null;
  const session = sessionSchema.parse(event.data);
  const payments = session.attributes.payments.filter(payment => payment.attributes.status === "paid");
  if (payments.length !== 1) throw new PaymongoError("Expected one successful payment.");
  const payment = payments[0]!;
  return { checkoutId: session.attributes.reference_number, sessionId: session.id,
    paymentId: payment.id, amount: payment.attributes.amount, currency: payment.attributes.currency, live };
}

export async function createHostedCheckout(input: {
  id: string; businessId: string; plan: PlanKey; name: string; amount: number; interval: BillingInterval; branchLimit: number;
}, config: ReturnType<typeof paymentConfiguration>, fetcher: typeof fetch = fetch) {
  const path = `/business/${input.businessId}/billing`;
  const response = await fetcher("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { attributes: {
      line_items: [{ name: `NegosyoOS ${input.name} — ${input.interval === "annual" ? "one year" : "one month"}${input.plan === "multi_branch" ? `, ${input.branchLimit} branches` : ""}`, amount: input.amount, currency: "PHP", quantity: 1 }],
      payment_method_types: config.methods, reference_number: input.id, send_email_receipt: true,
      success_url: `${config.appUrl}${path}?checkout=${input.id}`,
      cancel_url: `${config.appUrl}${path}?checkout=${input.id}&canceled=1`,
      metadata: { checkout_id: input.id, business_id: input.businessId, plan_key: input.plan },
    } } }),
  });
  // Do not expose provider responses, which can contain customer or credential details.
  if (!response.ok) throw new PaymongoError("Checkout could not be created. Please contact support before trying again.", 502);
  const parsed = z.object({ data: z.object({ id: z.string().startsWith("cs_"), attributes: z.object({
    checkout_url: z.url(), livemode: z.boolean(),
  }) }) }).parse(await response.json());
  const url = new URL(parsed.data.attributes.checkout_url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.paymongo.com" || url.username || url.password ||
      parsed.data.attributes.livemode !== config.live) throw new PaymongoError("Invalid checkout response.", 502);
  return { sessionId: parsed.data.id, url: url.href };
}
