import { describe, expect, it } from "vitest";
import { RecordPaymentSchema, SaveInvoiceSchema } from "./schemas";
const id = "10000000-0000-4000-8000-000000000001";
describe("invoice schemas", () => { it("rejects a due date before invoice date", () => expect(() => SaveInvoiceSchema.parse({ branchId: id, customerId: id, invoiceDate: "2026-08-26", dueDate: "2026-08-25", lines: [{ description: "Item", unit: "piece", quantity: 1, unitPrice: 100, discountAmount: 0, taxRate: 12 }] })).toThrow()); it("coerces payment allocations", () => expect(RecordPaymentSchema.parse({ branchId: id, customerId: id, paymentDate: "2026-08-26", paymentMethod: "cash", amount: "50", allocations: [{ invoiceId: id, amount: "50" }], idempotencyKey: "payment-001" }).amount).toBe(50)); });
