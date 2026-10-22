import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { checkoutAvailability, createHostedCheckout, parsePaidCheckout, paymentConfiguration, verifySignature } from "./paymongo";
import { checkoutQuote } from "./pricing";

const id = "10000000-0000-4000-8000-000000000001";
const config = { secretKey: "sk_test_example", webhookSecret: "whsec_example", live: false, appUrl: "https://example.test", methods: ["qrph" as const] };
const session = { id: "cs_example", attributes: { reference_number: id, payments: [{ id: "pay_example", attributes: { amount: 49900, currency: "PHP", status: "paid" } }] } };
const event = JSON.stringify({ data: { type: "checkout_session.payment.paid", livemode: false, data: session } });
const timestamp = 1800000000;
const sign = (body = event, mode = "te") => `t=${timestamp},${mode}=${createHmac("sha256", config.webhookSecret).update(`${timestamp}.${body}`).digest("hex")}`;

describe("PayMongo webhook verification", () => {
  it("authenticates the exact raw request body", () => {
    expect(() => verifySignature(event, sign(), config.webhookSecret, false, timestamp * 1000)).not.toThrow();
    expect(() => verifySignature(`${event} `, sign(), config.webhookSecret, false, timestamp * 1000)).toThrow();
  });
  it("rejects missing, malformed, stale, future and wrong-mode signatures", () => {
    for (const header of [null, "", "t=bad,te=abcd", sign(event, "li")]) {
      expect(() => verifySignature(event, header, config.webhookSecret, false, timestamp * 1000)).toThrow();
    }
    for (const offset of [-301000, 301000]) expect(() => verifySignature(event, sign(), config.webhookSecret, false, timestamp * 1000 + offset)).toThrow();
  });
  it("accepts live signatures only in live mode", () => {
    expect(() => verifySignature(event, sign(event, "li"), config.webhookSecret, true, timestamp * 1000)).not.toThrow();
    expect(() => parsePaidCheckout(event, true)).toThrow();
  });
  it("handles current and legacy event envelopes", () => {
    const expected = { checkoutId: id, sessionId: "cs_example", paymentId: "pay_example", amount: 49900, currency: "PHP", live: false };
    expect(parsePaidCheckout(event, false)).toEqual(expected);
    expect(parsePaidCheckout(JSON.stringify({ data: { type: "event", attributes: { type: "checkout_session.payment.paid", livemode: false, data: session } } }), false)).toEqual(expected);
  });
  it("ignores unrelated events and rejects unpaid sessions", () => {
    expect(parsePaidCheckout(JSON.stringify({ data: { type: "payment.failed", livemode: false } }), false)).toBeNull();
    expect(() => parsePaidCheckout(event.replace('"paid"', '"pending"'), false)).toThrow();
    expect(() => parsePaidCheckout(event.replace('"PHP"', '"USD"'), false)).toThrow();
  });
});

describe("approved commercial prices", () => {
  it.each([
    ["starter", 49900, 499000], ["pro", 129900, 1299000], ["growth", 249900, 2499000], ["multi_branch", 499900, 4999000],
  ] as const)("quotes %s in centavos", (plan, monthly, annual) => {
    expect(checkoutQuote(plan, "monthly").amount).toBe(monthly);
    expect(checkoutQuote(plan, "annual").amount).toBe(annual);
  });
  it("charges extra branches and rejects invalid capacity", () => {
    expect(checkoutQuote("multi_branch", "monthly", 5)).toMatchObject({ amount: 749900, branchLimit: 5 });
    expect(checkoutQuote("multi_branch", "annual", 5)).toMatchObject({ amount: 7499000, branchLimit: 5 });
    for (const count of [2, 3.5, NaN, 101]) expect(() => checkoutQuote("multi_branch", "monthly", count)).toThrow();
    expect(() => checkoutQuote("free_assessment", "monthly")).toThrow();
    expect(checkoutQuote("starter", "monthly", 100).branchLimit).toBe(1);
  });
});

describe("hosted checkout", () => {
  const input = { id, businessId: id, plan: "starter" as const, name: "Starter", amount: 49900, interval: "monthly" as const, branchLimit: 1 };
  it("sends server-priced checkout v2 with a persisted reference and trusted return URLs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: { id: "cs_example", attributes: { checkout_url: "https://checkout.paymongo.com/example", livemode: false } } }));
    expect(await createHostedCheckout(input, config, fetcher)).toEqual({ sessionId: "cs_example", url: "https://checkout.paymongo.com/example" });
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.paymongo.com/v2/checkout_sessions");
    const attributes = JSON.parse(String(request!.body)).data.attributes;
    expect(attributes.line_items[0]).toMatchObject({ amount: 49900, currency: "PHP", quantity: 1 });
    expect(attributes.reference_number).toBe(id);
    expect(attributes.success_url).toBe(`https://example.test/business/${id}/billing?checkout=${id}`);
    expect(attributes.pass_on_fees).toBeUndefined();
  });
  it("rejects provider errors and unexpected redirect hosts", async () => {
    const error = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ errors: [{ detail: "private details" }] }, { status: 422 }));
    await expect(createHostedCheckout(input, config, error)).rejects.toThrow("Checkout could not be created");
    const wrongHost = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: { id: "cs_example", attributes: { checkout_url: "https://attacker.test", livemode: false } } }));
    await expect(createHostedCheckout(input, config, wrongHost)).rejects.toThrow("Invalid checkout response");
  });
  it("keeps checkout disabled until server credentials are configured", () => {
    expect(checkoutAvailability({})).toBe(false);
    expect(() => paymentConfiguration({ PAYMONGO_SECRET_KEY: "pk_test_public" })).toThrow();
  });
});
