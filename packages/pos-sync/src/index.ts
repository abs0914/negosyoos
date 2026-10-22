import { z } from "zod";

const id = z.uuid();
const money = z.number().finite().min(0).max(999_999_999);

export const PaymentVerificationStatusSchema = z.enum(["pending_verification", "verified", "failed", "refunded"]);
export const PosCommandStatusSchema = z.enum(["applied", "duplicate", "conflict", "rejected", "quarantined"]);
export const PosSaleLineSchema = z.strictObject({ productVariantId: id, quantity: z.number().finite().positive().max(999_999), discountAmount: money });
export const PosSalePaymentSchema = z.strictObject({
  method: z.enum(["cash", "digital"]), amount: money.refine((value) => value > 0), reference: z.string().trim().max(120),
}).superRefine((payment, context) => {
  if (payment.method === "digital" && payment.reference.length < 3) context.addIssue({ code: "custom", path: ["reference"], message: "Digital payments require a provider reference." });
});
export const PosSaleCommandPayloadSchema = z.strictObject({
  type: z.literal("sale.complete"), branchId: id, inventoryLocationId: id, customerId: id.nullable(),
  provisionalReceiptNumber: z.string().regex(/^OFF-[A-Z0-9-]{1,32}-R-[A-F0-9]{8}-[0-9]{6,}$/),
  lines: z.array(PosSaleLineSchema).min(1).max(200), payments: z.array(PosSalePaymentSchema).min(1).max(10),
}).superRefine((payload, context) => {
  if (new Set(payload.lines.map((line) => line.productVariantId)).size !== payload.lines.length) context.addIssue({ code: "custom", path: ["lines"], message: "Combine duplicate cart lines." });
});
export const RegisterCloseCommandPayloadSchema = z.strictObject({ type: z.literal("register.close"), branchId: id, inventoryLocationId: id, actualCash: money });
export const PosCommandPayloadSchema = z.discriminatedUnion("type", [PosSaleCommandPayloadSchema, RegisterCloseCommandPayloadSchema]);
export const PosCommandEnvelopeSchema = z.strictObject({
  businessId: id, commandId: id, schemaVersion: z.literal(1), registerId: id, sessionId: id,
  occurredAt: z.iso.datetime({ offset: true }), mode: z.enum(["online", "offline"]), leaseToken: z.string().min(32).max(256).optional(), payload: PosCommandPayloadSchema,
}).superRefine((command, context) => {
  if (command.mode === "offline" && !command.leaseToken) context.addIssue({ code: "custom", path: ["leaseToken"], message: "Offline commands require a valid lease." });
});
export const PosCommandResultSchema = z.strictObject({
  status: PosCommandStatusSchema, commandId: id, saleId: id.optional(), sessionId: id.optional(), receiptNumber: z.string().optional(), provisionalReceiptNumber: z.string().optional(),
  paymentStatus: PaymentVerificationStatusSchema.optional(), expectedCash: money.optional(), actualCash: money.optional(), cashVariance: z.number().finite().optional(),
  reconciliationRequired: z.boolean().optional(), errorCode: z.string().optional(), message: z.string().optional(), retryable: z.boolean().optional(),
});
export const SyncBatchRequestSchema = z.strictObject({ commands: z.array(PosCommandEnvelopeSchema).min(1).max(50) });
export const SyncBatchResponseSchema = z.strictObject({ results: z.array(PosCommandResultSchema), serverTime: z.iso.datetime({ offset: true }) });
export const PosRegisterBootstrapInputSchema = z.strictObject({ registerId: id, branchId: id, inventoryLocationId: id, deviceName: z.string().trim().min(1).max(120), clientSessionId: id, openingCash: money.default(0) });
export const OfflineLeaseSchema = z.strictObject({
  registerId: id, registerCode: z.string(), registerName: z.string(), sessionId: id, sessionStatus: z.enum(["open", "closed", "reconciled"]),
  openingCash: money, leaseToken: z.string().min(32), leaseExpiresAt: z.iso.datetime({ offset: true }), issuedAt: z.iso.datetime({ offset: true }),
});
export const PosCatalogSnapshotSchema = z.strictObject({
  revision: z.string(), notModified: z.boolean(), items: z.array(z.strictObject({
    id, productId: id, name: z.string(), variantName: z.string(), sku: z.string(), barcode: z.string().nullable(), unit: z.string(),
    price: z.coerce.number(), taxType: z.string(), taxRate: z.coerce.number(), availableQuantity: z.coerce.number().nullable(),
  })),
});
export const ReconciliationCaseSchema = z.strictObject({
  id, businessId: id, branchId: id, registerId: id.nullable(), sessionId: id.nullable(), saleId: id.nullable(), paymentId: id.nullable(), commandId: id.nullable(),
  type: z.enum(["payment_verification", "payment_failed", "negative_stock", "register_variance", "command_quarantine", "ledger_mismatch"]),
  severity: z.enum(["info", "warning", "critical"]), status: z.enum(["open", "resolved", "dismissed"]), summary: z.string(), details: z.record(z.string(), z.unknown()),
  resolution: z.string().nullable(), createdAt: z.string(), resolvedAt: z.string().nullable(),
});
export const ResolveReconciliationSchema = z.strictObject({ caseId: id, resolution: z.string().trim().min(1).max(500), disposition: z.enum(["verified", "failed", "resolved", "dismissed"]) });
export const PosOperationsDashboardSchema = z.strictObject({
  openReconciliationCases: z.number().int().nonnegative(), criticalCases: z.number().int().nonnegative(), pendingDigitalPayments: z.number().int().nonnegative(),
  openRegisterSessions: z.number().int().nonnegative(), failedCommands: z.number().int().nonnegative(), oldestOpenCaseAt: z.string().nullable(),
});

export type PaymentVerificationStatus = z.infer<typeof PaymentVerificationStatusSchema>;
export type PosCommandEnvelope = z.infer<typeof PosCommandEnvelopeSchema>;
export type PosCommandPayload = z.infer<typeof PosCommandPayloadSchema>;
export type PosCommandResult = z.infer<typeof PosCommandResultSchema>;
export type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;
export type SyncBatchResponse = z.infer<typeof SyncBatchResponseSchema>;
export type OfflineLease = z.infer<typeof OfflineLeaseSchema>;
export type ReconciliationCase = z.infer<typeof ReconciliationCaseSchema>;
export type PosOperationsDashboard = z.infer<typeof PosOperationsDashboardSchema>;
