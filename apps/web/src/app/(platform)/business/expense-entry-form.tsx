'use client';
import Link from 'next/link';
import { useActionState, useId } from 'react';
import type { ExpenseCategory } from '@negosyo-os/expenses';
import { saveExpenseAction, type ExpenseActionState } from './expense-actions';
const initial: ExpenseActionState = {};
const input = 'min-h-11 w-full rounded-lg border bg-background px-3 text-sm';
export function ExpenseEntryForm({
    businessId,
    categories,
    branches
}: {
    businessId: string;
    categories: readonly ExpenseCategory[];
    branches: readonly { id: string; name: string }[];
}) {
    const [state, action, pending] = useActionState(saveExpenseAction.bind(null, businessId), initial);
    const key = `expense-${useId()}`;
    return (
        <form
            action={action}
            className="mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-7"
            encType="multipart/form-data"
        >
            <input name="idempotencyKey" type="hidden" value={key} />
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                    Date
                    <input
                        className={`${input} mt-1`}
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        name="expenseDate"
                        required
                        type="date"
                    />
                </label>
                <label className="text-sm font-medium">
                    Branch
                    <select className={`${input} mt-1`} name="branchId" required>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm font-medium">
                    Category
                    <select className={`${input} mt-1`} name="categoryId" required>
                        {categories
                            .filter((category) => category.isActive)
                            .map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                    </select>
                </label>
                <label className="text-sm font-medium">
                    Supplier / payee
                    <input className={`${input} mt-1`} maxLength={160} name="supplierPayee" required />
                </label>
                <label className="text-sm font-medium">
                    Amount (PHP)
                    <input className={`${input} mt-1`} min="0.01" name="amount" required step="0.01" type="number" />
                </label>
                <label className="text-sm font-medium">
                    Payment method
                    <select className={`${input} mt-1`} name="paymentMethod">
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="card">Card</option>
                        <option value="digital_wallet">Digital wallet</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                    </select>
                </label>
            </div>
            <label className="block text-sm font-medium">
                Description
                <textarea
                    className="mt-1 min-h-24 w-full rounded-lg border bg-background p-3 text-sm"
                    maxLength={1000}
                    name="description"
                />
            </label>
            <label className="block text-sm font-medium">
                Receipt attachment{' '}
                <span className="font-normal text-muted-foreground">(JPEG, PNG, WebP or PDF, max 10 MB)</span>
                <input
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className={`${input} mt-1 py-2`}
                    name="receipt"
                    type="file"
                />
            </label>
            {state.message ? (
                <p className={state.status === 'error' ? 'text-sm text-destructive' : 'text-sm text-primary'}>
                    {state.message}
                    {state.expenseId ? (
                        <>
                            <br />
                            <Link className="font-semibold underline" href={`/business/${businessId}/expenses`}>
                                View expenses
                            </Link>
                        </>
                    ) : null}
                </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
                <button
                    className="min-h-12 rounded-lg border font-semibold"
                    disabled={pending}
                    name="submit"
                    type="submit"
                    value="false"
                >
                    Save draft
                </button>
                <button
                    className="min-h-12 rounded-lg bg-primary font-semibold text-primary-foreground"
                    disabled={pending}
                    name="submit"
                    type="submit"
                    value="true"
                >
                    {pending ? 'Saving…' : 'Submit expense'}
                </button>
            </div>
        </form>
    );
}
