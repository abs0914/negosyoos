import { z } from "zod";

const id = z.uuid();
const amount = z.coerce.number().finite().min(0).max(999_999_999.9999);
export const QuotationIdSchema = id;
export const QuotationLineInputSchema = z.strictObject({ productVariantId: id, quantity: z.coerce.number().finite().positive().max(999_999), unitPrice: amount, discountAmount: amount });
export const SaveQuotationSchema = z.strictObject({ quotationId: id.optional(), branchId: id, customerId: id, validUntil: z.iso.date(), notes: z.string().trim().max(4000).default(""), terms: z.string().trim().max(8000).default(""), salespersonId: id, lines: z.array(QuotationLineInputSchema).min(1).max(200), submit: z.boolean().default(false) });
export const TransitionQuotationSchema = z.strictObject({ quotationId: id, status: z.enum(["accepted", "rejected", "expired"]) });
export const CopyQuotationSchema = z.strictObject({ quotationId: id, asRevision: z.boolean() });
export const ConvertQuotationToSaleSchema = z.strictObject({ quotationId: id, inventoryLocationId: id });
export const ShareQuotationSchema = z.strictObject({ quotationId: id, channel: z.enum(["email", "link"]), recipient: z.string().trim().max(254).default("") }).superRefine((value, context) => { if (value.channel === "email" && !z.email().safeParse(value.recipient).success) context.addIssue({ code: "custom", path: ["recipient"], message: "Enter a valid email address." }); });
export type SaveQuotationInput = z.input<typeof SaveQuotationSchema>;
export type TransitionQuotationInput = z.input<typeof TransitionQuotationSchema>;
export type ShareQuotationInput = z.input<typeof ShareQuotationSchema>;
