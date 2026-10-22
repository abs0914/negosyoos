import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { renderQuotationPdf } from "./pdf";

describe("quotation PDF", () => {
  it("creates a readable A4 PDF", async () => {
    const bytes = await renderQuotationPdf({ id: "q", businessId: "b", branchId: "br", quotationNumber: "QUO-2026-000001", revisionNumber: 0, revisionOfId: null, customerId: "c", customerName: "Ana Reyes", customerMobile: "+639171234567", customerEmail: "ana@example.test", assignedSalespersonId: "u", status: "sent", approvalStatus: "not_required", approvalRequestId: null, validUntil: "2026-09-30", notes: "Thank you.", terms: "Valid for 30 days.", subtotal: 100, discountTotal: 0, taxTotal: 10.71, total: 100, convertedSaleId: null, convertedSalesOrderId: null, createdBy: "u", createdAt: "2026-08-26T00:00:00Z", updatedAt: "2026-08-26T00:00:00Z", lines: [{ id: "l", productVariantId: "v", productName: "Office Chair", variantName: "Default", sku: "CHAIR-1", unit: "piece", quantity: 1, unitPrice: 100, discountAmount: 0, taxType: "inclusive", taxRate: 12, subtotal: 100, taxAmount: 10.71, total: 100, position: 0 }] }, { id: "b", legalName: "Demo Legal", tradeName: "Demo Business", businessType: "sole_proprietorship", industry: "retail", country: "PH", currency: "PHP", timezone: "Asia/Manila", address: { line1: "Manila", city: "Manila", province: "Metro Manila" }, phone: null, email: null, logo: null, taxIdentifiers: {}, status: "active", createdAt: "2026-08-26T00:00:00Z", updatedAt: "2026-08-26T00:00:00Z" });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getSize()).toMatchObject({ width: 595.28, height: 841.89 });
  });
});
