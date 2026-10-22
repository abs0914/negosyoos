import Link from 'next/link';
import { listBranches } from '@negosyo-os/business/server';
import { listCustomers } from '@negosyo-os/crm/server';
import { listQuotationCatalog, listQuotationSalespeople } from '@negosyo-os/quotations/server';
import { QuotationEditor } from '../../../quotation-editor';

export default async function NewQuotationPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = await params;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const defaultValidUntil = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const [branches, customers, catalog, salespeople] = await Promise.all([
        listBranches(businessId),
        listCustomers(businessId),
        listQuotationCatalog(businessId),
        listQuotationSalespeople(businessId)
    ]);
    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <Link className="text-sm text-primary" href={`/business/${businessId}/quotations`}>
                ← Quotations
            </Link>
            <h1 className="mt-4 text-3xl font-semibold">New quotation</h1>
            <p className="mt-2 text-muted-foreground">
                Catalog prices are copied into the quotation and remain editable snapshots.
            </p>
            {customers.length && catalog.length ? (
                <QuotationEditor
                    branches={branches}
                    businessId={businessId}
                    catalog={catalog}
                    customers={customers}
                    defaultValidUntil={defaultValidUntil}
                    salespeople={salespeople}
                    today={today}
                />
            ) : (
                <p className="mt-6 rounded-xl border p-6 text-muted-foreground">
                    Add at least one customer and active catalog item before creating a quotation.
                </p>
            )}
        </main>
    );
}
