import { getBusiness } from "@negosyo-os/business/server";
import { renderQuotationPdf } from "@negosyo-os/quotations/pdf";
import { getQuotation } from "@negosyo-os/quotations/server";

export async function GET(_request: Request, { params }: { params: Promise<{ businessId: string; quotationId: string }> }) { const { businessId, quotationId } = await params; const [business, details] = await Promise.all([getBusiness(businessId), getQuotation(businessId, quotationId)]); const bytes = await renderQuotationPdf(details.quotation, business); return new Response(bytes as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${details.quotation.quotationNumber}-r${details.quotation.revisionNumber}.pdf"`, "Cache-Control": "private, no-store" } }); }
