'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import type { Quotation, QuotationCatalogItem } from '@negosyo-os/quotations';
import { saveQuotationAction, type QuotationActionState } from './quotation-actions';

const initial: QuotationActionState = {};
type DraftLine = { productVariantId: string; quantity: number; unitPrice: number; discountAmount: number };
export function QuotationEditor({
    businessId,
    branches,
    customers,
    catalog,
    salespeople,
    today,
    defaultValidUntil,
    quotation
}: {
    businessId: string;
    branches: readonly { id: string; name: string }[];
    customers: readonly { id: string; name: string; mobile: string | null }[];
    catalog: readonly QuotationCatalogItem[];
    salespeople: readonly { id: string; label: string }[];
    today: string;
    defaultValidUntil: string;
    quotation?: Quotation;
}) {
    const [state, action, pending] = useActionState(saveQuotationAction.bind(null, businessId), initial);
    const [lines, setLines] = useState<DraftLine[]>(
        quotation?.lines.map((line) => ({
            productVariantId: line.productVariantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount
        })) ?? [
            {
                productVariantId: catalog[0]?.productVariantId ?? '',
                quantity: 1,
                unitPrice: catalog[0]?.price ?? 0,
                discountAmount: 0
            }
        ]
    );
    const total = useMemo(
        () => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice - line.discountAmount, 0),
        [lines]
    );
    const update = (index: number, values: Partial<DraftLine>) =>
        setLines((current) => current.map((line, position) => (position === index ? { ...line, ...values } : line)));
    return (
        <form action={action} className="mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
            <input name="quotationId" type="hidden" value={quotation?.id ?? ''} />
            <input name="lines" type="hidden" value={JSON.stringify(lines)} />
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                    Customer
                    <select
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                        defaultValue={quotation?.customerId}
                        name="customerId"
                        required
                    >
                        {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                                {customer.name} {customer.mobile ? `- ${customer.mobile}` : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm font-medium">
                    Branch
                    <select
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                        defaultValue={quotation?.branchId}
                        name="branchId"
                        required
                    >
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm font-medium">
                    Valid until
                    <input
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                        defaultValue={quotation?.validUntil ?? defaultValidUntil}
                        min={today}
                        name="validUntil"
                        required
                        type="date"
                    />
                </label>
                <label className="text-sm font-medium">
                    Assigned salesperson
                    <select
                        className="mt-1 min-h-11 w-full rounded-lg border px-3"
                        defaultValue={quotation?.assignedSalespersonId ?? salespeople[0]?.id}
                        name="salespersonId"
                        required
                    >
                        {salespeople.map((salesperson) => (
                            <option key={salesperson.id} value={salesperson.id}>{salesperson.label}</option>
                        ))}
                    </select>
                </label>
            </div>
            <section>
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Items</h2>
                    <button
                        className="rounded-lg border px-3 py-2 text-sm font-semibold"
                        onClick={() =>
                            setLines((current) => [
                                ...current,
                                {
                                    productVariantId: catalog[0]?.productVariantId ?? '',
                                    quantity: 1,
                                    unitPrice: catalog[0]?.price ?? 0,
                                    discountAmount: 0
                                }
                            ])
                        }
                        type="button"
                    >
                        Add item
                    </button>
                </div>
                <div className="mt-3 space-y-3">
                    {lines.map((line, index) => (
                        <div
                            className="grid gap-2 rounded-xl border p-3 md:grid-cols-[2fr_repeat(3,1fr)_auto]"
                            key={index}
                        >
                            <select
                                className="min-h-10 rounded-lg border px-2"
                                value={line.productVariantId}
                                onChange={(event) => {
                                    const item = catalog.find((value) => value.productVariantId === event.target.value);
                                    update(index, {
                                        productVariantId: event.target.value,
                                        unitPrice: item?.price ?? 0
                                    });
                                }}
                            >
                                {catalog.map((item) => (
                                    <option key={item.productVariantId} value={item.productVariantId}>
                                        {item.label} ({item.sku})
                                    </option>
                                ))}
                            </select>
                            <input
                                className="min-h-10 rounded-lg border px-2"
                                min="0.0001"
                                onChange={(event) => update(index, { quantity: Number(event.target.value) })}
                                step="0.0001"
                                type="number"
                                value={line.quantity}
                            />
                            <input
                                className="min-h-10 rounded-lg border px-2"
                                min="0"
                                onChange={(event) => update(index, { unitPrice: Number(event.target.value) })}
                                step="0.01"
                                title="Unit price"
                                type="number"
                                value={line.unitPrice}
                            />
                            <input
                                className="min-h-10 rounded-lg border px-2"
                                min="0"
                                onChange={(event) => update(index, { discountAmount: Number(event.target.value) })}
                                step="0.01"
                                title="Line discount"
                                type="number"
                                value={line.discountAmount}
                            />
                            <button
                                className="rounded-lg border px-3 text-destructive"
                                disabled={lines.length === 1}
                                onClick={() =>
                                    setLines((current) => current.filter((_, position) => position !== index))
                                }
                                type="button"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                    Notes
                    <textarea
                        className="mt-1 min-h-28 w-full rounded-lg border p-3"
                        defaultValue={quotation?.notes ?? ''}
                        name="notes"
                    />
                </label>
                <label className="text-sm font-medium">
                    Terms
                    <textarea
                        className="mt-1 min-h-28 w-full rounded-lg border p-3"
                        defaultValue={
                            quotation?.terms ??
                            'Prices are valid until the date above. Payment and delivery terms are subject to confirmation.'
                        }
                        name="terms"
                    />
                </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-xl">
                    Estimated total:{' '}
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(total)}
                </strong>
                {state.message ? (
                    <p className={state.status === 'error' ? 'text-sm text-destructive' : 'text-sm text-primary'}>
                        {state.message}
                        {state.quotationId ? (
                            <Link
                                className="ml-2 underline"
                                href={`/business/${businessId}/quotations/${state.quotationId}`}
                            >
                                Open
                            </Link>
                        ) : null}
                    </p>
                ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <button
                    className="min-h-12 rounded-lg border font-semibold"
                    disabled={pending}
                    name="submit"
                    value="false"
                >
                    Save draft
                </button>
                <button
                    className="min-h-12 rounded-lg bg-primary font-semibold text-primary-foreground"
                    disabled={pending}
                    name="submit"
                    value="true"
                >
                    {pending ? 'Submitting...' : 'Submit and send'}
                </button>
            </div>
        </form>
    );
}
