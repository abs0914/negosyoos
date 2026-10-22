'use server';

import { revalidatePath } from 'next/cache';
import { AppError } from '@negosyo-os/core/errors';
import { SaveQuotationSchema, ShareQuotationSchema } from '@negosyo-os/quotations';
import {
    convertQuotationToSale,
    convertQuotationToSalesOrder,
    copyQuotation,
    saveQuotation,
    shareQuotation,
    transitionQuotation
} from '@negosyo-os/quotations/server';

export interface QuotationActionState {
    status?: 'success' | 'error';
    message?: string;
    quotationId?: string;
    targetId?: string;
}
const initialMessage = (error: unknown) =>
    error instanceof AppError && error.expose
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Quotation operation failed.';

export async function saveQuotationAction(
    businessId: string,
    _state: QuotationActionState,
    formData: FormData
): Promise<QuotationActionState> {
    let lines: unknown = [];
    try {
        lines = JSON.parse(String(formData.get('lines') ?? '[]'));
    } catch {
        return { status: 'error', message: 'Quotation items are invalid.' };
    }
    const parsed = SaveQuotationSchema.safeParse({
        quotationId: formData.get('quotationId') || undefined,
        branchId: formData.get('branchId'),
        customerId: formData.get('customerId'),
        validUntil: formData.get('validUntil'),
        notes: formData.get('notes'),
        terms: formData.get('terms'),
        salespersonId: formData.get('salespersonId'),
        lines,
        submit: formData.get('submit') === 'true'
    });
    if (!parsed.success) return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the quotation.' };
    try {
        const quotationId = await saveQuotation(businessId, parsed.data);
        revalidatePath(`/business/${businessId}/quotations`);
        return {
            status: 'success',
            message: parsed.data.submit ? 'Quotation submitted.' : 'Draft saved.',
            quotationId
        };
    } catch (error) {
        return { status: 'error', message: initialMessage(error) };
    }
}

export async function quotationOperationAction(
    businessId: string,
    _state: QuotationActionState,
    formData: FormData
): Promise<QuotationActionState> {
    const quotationId = String(formData.get('quotationId') ?? '');
    const operation = String(formData.get('operation') ?? '');
    try {
        let targetId: string | undefined;
        if (operation === 'duplicate') targetId = await copyQuotation(businessId, quotationId, false);
        else if (operation === 'revision') targetId = await copyQuotation(businessId, quotationId, true);
        else if (['accepted', 'rejected', 'expired'].includes(operation))
            await transitionQuotation(businessId, {
                quotationId,
                status: operation as 'accepted' | 'rejected' | 'expired'
            });
        else if (operation === 'sale')
            targetId = await convertQuotationToSale(
                businessId,
                quotationId,
                String(formData.get('inventoryLocationId') ?? '')
            );
        else if (operation === 'sales_order') targetId = await convertQuotationToSalesOrder(businessId, quotationId);
        else return { status: 'error', message: 'Unknown quotation operation.' };
        revalidatePath(`/business/${businessId}/quotations`);
        return {
            status: 'success',
            message: 'Quotation updated.',
            ...(targetId ? { quotationId: targetId, targetId } : {})
        };
    } catch (error) {
        return { status: 'error', message: initialMessage(error) };
    }
}

export async function shareQuotationAction(
    businessId: string,
    _state: QuotationActionState,
    formData: FormData
): Promise<QuotationActionState> {
    const parsed = ShareQuotationSchema.safeParse({
        quotationId: formData.get('quotationId'),
        channel: formData.get('channel'),
        recipient: formData.get('recipient')
    });
    if (!parsed.success)
        return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the share request.' };
    try {
        await shareQuotation(businessId, parsed.data);
        revalidatePath(`/business/${businessId}/quotations/${parsed.data.quotationId}`);
        return {
            status: 'success',
            message: parsed.data.channel === 'email' ? 'Email delivery queued.' : 'Share link created.'
        };
    } catch (error) {
        return { status: 'error', message: initialMessage(error) };
    }
}
