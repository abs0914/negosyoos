import Link from 'next/link';
import { listBranches } from '@negosyo-os/business/server';
import { listCustomers } from '@negosyo-os/crm/server';
import { getQuotation, listQuotationCatalog, listQuotationSalespeople } from '@negosyo-os/quotations/server';
import { QuotationEditor } from '../../../../quotation-editor';

export default async function EditQuotationPage({
    params
}: {
    params: Promise<{ businessId: string; quotationId: string }>;
}) {
    const { businessId, quotationId } = await params;
    const today = new Date().toISOString().slice(0, 10);
    const [details, branches, customers, catalog, salespeople] = await Promise.all([
        getQuotation(businessId, quotationId),
        listBranches(businessId),
        listCustomers(businessId),
        listQuotationCatalog(businessId),
        listQuotationSalespeople(businessId)
    ]);
    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <Link className="text-sm text-primary" href={`/business/${businessId}/quotations/${quotationId}`}>
                ← Quotation
            </Link>
            <h1 className="mt-4 text-3xl font-semibold">Edit {details.quotation.quotationNumber}</h1>
            <QuotationEditor
                branches={branches}
                businessId={businessId}
                catalog={catalog}
                customers={customers}
                defaultValidUntil={details.quotation.validUntil}
                quotation={details.quotation}
                salespeople={salespeople}
                today={today}
            />
        </main>
    );
}
