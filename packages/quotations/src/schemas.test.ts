import { describe, expect, it } from "vitest";
import { SaveQuotationSchema, ShareQuotationSchema } from "./schemas";

const id = "10000000-0000-4000-8000-000000000001";
describe("quotation schemas", () => {
  it("coerces quotation amounts", () => expect(SaveQuotationSchema.parse({ branchId: id, customerId: id, salespersonId: id, validUntil: "2026-09-30", lines: [{ productVariantId: id, quantity: "2", unitPrice: "100", discountAmount: "10" }] }).lines[0]?.quantity).toBe(2));
  it("requires an email recipient for email shares", () => expect(() => ShareQuotationSchema.parse({ quotationId: id, channel: "email", recipient: "not-email" })).toThrow());
});
