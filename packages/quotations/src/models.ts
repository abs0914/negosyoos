export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
export type QuotationApprovalStatus = "not_required" | "pending" | "approved" | "rejected" | "cancelled";

export interface QuotationLine {
  id: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxType: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  position: number;
}

export interface Quotation {
  id: string;
  businessId: string;
  branchId: string;
  quotationNumber: string;
  revisionNumber: number;
  revisionOfId: string | null;
  customerId: string;
  customerName: string;
  customerMobile: string | null;
  customerEmail: string | null;
  assignedSalespersonId: string;
  status: QuotationStatus;
  approvalStatus: QuotationApprovalStatus;
  approvalRequestId: string | null;
  validUntil: string;
  notes: string | null;
  terms: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  convertedSaleId: string | null;
  convertedSalesOrderId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: readonly QuotationLine[];
}

export interface QuotationAuditRecord { id: string; event: string; actorId: string; details: Readonly<Record<string, unknown>>; createdAt: string }
export interface QuotationShare { id: string; channel: "email" | "link"; recipient: string | null; deliveryStatus: "queued" | "sent" | "failed" | "revoked"; createdAt: string }
export interface QuotationDetails { quotation: Quotation; audit: readonly QuotationAuditRecord[]; shares: readonly QuotationShare[] }
export interface QuotationCatalogItem { productVariantId: string; label: string; sku: string; unit: string; price: number }
