import { describe, expect, it } from "vitest";
import { PosCommandEnvelopeSchema, PosSalePaymentSchema, SyncBatchRequestSchema } from "./index";

const base = {
  businessId: "94000000-0000-4000-8000-000000000001", commandId: "94000000-0000-4000-8000-000000000002", schemaVersion: 1 as const,
  registerId: "94000000-0000-4000-8000-000000000003", sessionId: "94000000-0000-4000-8000-000000000004", occurredAt: "2026-08-31T08:00:00+08:00", mode: "offline" as const,
  payload: { type: "sale.complete" as const, branchId: "94000000-0000-4000-8000-000000000005", inventoryLocationId: "94000000-0000-4000-8000-000000000006", customerId: null,
    provisionalReceiptNumber: "OFF-MAIN-R-94000000-000001", lines: [{ productVariantId: "94000000-0000-4000-8000-000000000007", quantity: 1, discountAmount: 0 }],
    payments: [{ method: "cash" as const, amount: 100, reference: "" }] },
};

describe("POS sync contracts", () => {
  it("requires a lease for offline commands", () => {
    expect(PosCommandEnvelopeSchema.safeParse(base).success).toBe(false);
    expect(PosCommandEnvelopeSchema.safeParse({ ...base, leaseToken: "a".repeat(64) }).success).toBe(true);
  });
  it("requires references for manually recorded digital payments", () => {
    expect(PosSalePaymentSchema.safeParse({ method: "digital", amount: 100, reference: "" }).success).toBe(false);
    expect(PosSalePaymentSchema.safeParse({ method: "digital", amount: 100, reference: "GCASH-123" }).success).toBe(true);
  });
  it("bounds reconnect batches", () => {
    const command = { ...base, leaseToken: "b".repeat(64) };
    expect(SyncBatchRequestSchema.safeParse({ commands: Array.from({ length: 51 }, () => command) }).success).toBe(false);
  });
});
