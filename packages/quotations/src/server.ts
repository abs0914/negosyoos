import 'server-only';

import { requireAuthenticatedUser, requireCapability } from '@negosyo-os/auth';
import { createClient } from '@negosyo-os/auth/server';
import { BusinessIdSchema } from '@negosyo-os/business';
import { AppError, ERROR_CODES } from '@negosyo-os/core/errors';
import { PERMISSIONS } from '@negosyo-os/core/permissions';
import type { Json, Tables } from '@negosyo-os/database';

import type {
    Quotation,
    QuotationAuditRecord,
    QuotationCatalogItem,
    QuotationDetails,
    QuotationLine,
    QuotationShare
} from './models';
import {
    ConvertQuotationToSaleSchema,
    CopyQuotationSchema,
    QuotationIdSchema,
    SaveQuotationSchema,
    ShareQuotationSchema,
    TransitionQuotationSchema,
    type SaveQuotationInput,
    type ShareQuotationInput,
    type TransitionQuotationInput
} from './schemas';

type QuoteRow = Tables<'quotations'>;
type LineRow = Tables<'quotation_lines'>;
type CustomerRow = Tables<'sales_customers'>;
type AuditRow = Tables<'quotation_audit_history'>;
type ShareRow = Tables<'quotation_shares'>;
const fail = (message: string, cause: unknown) =>
    new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
function mutation(error: { code?: string; message?: string }) {
    if (error.code === '42501')
        return new AppError({
            code: ERROR_CODES.permissionDenied,
            message: 'You cannot perform this quotation operation.',
            status: 403,
            cause: error
        });
    if (['22023', '23505', 'P0001'].includes(error.code ?? ''))
        return new AppError({
            code: ERROR_CODES.validationFailed,
            message: error.message ?? 'Invalid quotation operation.',
            status: 400,
            cause: error
        });
    return fail('The quotation operation failed.', error);
}
function object(value: Json): Readonly<Record<string, unknown>> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function line(row: LineRow): QuotationLine {
    return {
        id: row.id,
        productVariantId: row.product_variant_id,
        productName: row.product_name,
        variantName: row.variant_name,
        sku: row.sku,
        unit: row.unit,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        discountAmount: Number(row.discount_amount),
        taxType: row.tax_type,
        taxRate: Number(row.tax_rate),
        subtotal: Number(row.subtotal),
        taxAmount: Number(row.tax_amount),
        total: Number(row.total),
        position: row.position
    };
}
function quote(row: QuoteRow, customer: CustomerRow, lines: readonly QuotationLine[] = []): Quotation {
    return {
        id: row.id,
        businessId: row.organization_id,
        branchId: row.branch_id,
        quotationNumber: row.quotation_number,
        revisionNumber: row.revision_number,
        revisionOfId: row.revision_of_id,
        customerId: row.customer_id,
        customerName: customer.name,
        customerMobile: customer.phone,
        customerEmail: customer.email,
        assignedSalespersonId: row.assigned_salesperson_id,
        status: row.status as Quotation['status'],
        approvalStatus: row.approval_status as Quotation['approvalStatus'],
        approvalRequestId: row.approval_request_id,
        validUntil: row.valid_until,
        notes: row.notes,
        terms: row.terms,
        subtotal: Number(row.subtotal),
        discountTotal: Number(row.discount_total),
        taxTotal: Number(row.tax_total),
        total: Number(row.total),
        convertedSaleId: row.converted_sale_id,
        convertedSalesOrderId: row.converted_sales_order_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lines
    };
}
async function reader(businessId: string) {
    const id = BusinessIdSchema.parse(businessId);
    const client = await createClient();
    const user = await requireAuthenticatedUser(client);
    await requireCapability(user, PERMISSIONS.quotationsRead, { businessId: id }, client);
    return { id, client, user };
}

export async function getQuotationActor(businessId: string) {
    const { user } = await reader(businessId);
    return { id: user.id, label: 'Current user' };
}
export async function listQuotationSalespeople(businessId: string) {
    const { id, client, user } = await reader(businessId);
    const result = await client
        .from('organization_memberships')
        .select('user_id')
        .eq('organization_id', id)
        .eq('status', 'active')
        .order('created_at');
    if (result.error) throw fail('Salespeople could not be loaded.', result.error);
    return result.data.map((membership) => ({
        id: membership.user_id,
        label: membership.user_id === user.id ? 'Current user' : `Team member ${membership.user_id.slice(0, 8)}`
    }));
}
export async function listQuotationCatalog(businessId: string): Promise<readonly QuotationCatalogItem[]> {
    const { id, client } = await reader(businessId);
    const [products, variants] = await Promise.all([
        client
            .from('products')
            .select('id,name,default_unit,selling_price')
            .eq('organization_id', id)
            .eq('status', 'active'),
        client
            .from('product_variants')
            .select('id,product_id,name,sku,unit,selling_price')
            .eq('organization_id', id)
            .eq('status', 'active')
    ]);
    if (products.error || variants.error)
        throw fail('Quotation catalog could not be loaded.', products.error ?? variants.error);
    const map = new Map(products.data.map((value) => [value.id, value]));
    return variants.data.flatMap((variant) => {
        const product = map.get(variant.product_id);
        return product
            ? [
                  {
                      productVariantId: variant.id,
                      label: product.name + (variant.name === 'Default' ? '' : ` - ${variant.name}`),
                      sku: variant.sku,
                      unit: variant.unit ?? product.default_unit,
                      price: Number(variant.selling_price ?? product.selling_price)
                  }
              ]
            : [];
    });
}
export async function listQuotations(businessId: string, status?: string): Promise<readonly Quotation[]> {
    const { id, client } = await reader(businessId);
    let query = client
        .from('quotations')
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(200);
    if (status) query = query.eq('status', status);
    const [quotes, customers] = await Promise.all([
        query,
        client.from('sales_customers').select('*').eq('organization_id', id)
    ]);
    if (quotes.error || customers.error) throw fail('Quotations could not be loaded.', quotes.error ?? customers.error);
    const customerMap = new Map(customers.data.map((value) => [value.id, value]));
    return quotes.data.flatMap((row) => {
        const customer = customerMap.get(row.customer_id);
        return customer ? [quote(row, customer)] : [];
    });
}
export async function getQuotation(businessId: string, quotationId: string): Promise<QuotationDetails> {
    const { id, client } = await reader(businessId);
    const quoteId = QuotationIdSchema.parse(quotationId);
    const [quotation, lines, customers, audit, shares] = await Promise.all([
        client.from('quotations').select('*').eq('organization_id', id).eq('id', quoteId).single(),
        client
            .from('quotation_lines')
            .select('*')
            .eq('organization_id', id)
            .eq('quotation_id', quoteId)
            .order('position'),
        client.from('sales_customers').select('*').eq('organization_id', id),
        client
            .from('quotation_audit_history')
            .select('*')
            .eq('organization_id', id)
            .eq('quotation_id', quoteId)
            .order('created_at', { ascending: false }),
        client
            .from('quotation_shares')
            .select('*')
            .eq('organization_id', id)
            .eq('quotation_id', quoteId)
            .order('created_at', { ascending: false })
    ]);
    const error = quotation.error ?? lines.error ?? customers.error ?? audit.error ?? shares.error;
    if (error || !quotation.data) throw fail('Quotation could not be loaded.', error);
    const customer = (customers.data ?? []).find((value) => value.id === quotation.data!.customer_id);
    if (!customer) throw fail('Quotation customer could not be loaded.', null);
    return {
        quotation: quote(quotation.data, customer, (lines.data ?? []).map(line)),
        audit: (audit.data as AuditRow[]).map(
            (row): QuotationAuditRecord => ({
                id: row.id,
                event: row.event,
                actorId: row.actor_id,
                details: object(row.details),
                createdAt: row.created_at
            })
        ),
        shares: (shares.data as ShareRow[]).map(
            (row): QuotationShare => ({
                id: row.id,
                channel: row.channel as QuotationShare['channel'],
                recipient: row.recipient,
                deliveryStatus: row.delivery_status as QuotationShare['deliveryStatus'],
                createdAt: row.created_at
            })
        )
    };
}
export async function saveQuotation(businessId: string, input: SaveQuotationInput) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = SaveQuotationSchema.parse(input);
    const client = await createClient();
    const { data, error } = await client.rpc('save_quotation', {
        requested_organization_id: id,
        requested_quotation_id: (parsed.quotationId ?? null) as string,
        requested_branch_id: parsed.branchId,
        requested_customer_id: parsed.customerId,
        requested_valid_until: parsed.validUntil,
        requested_notes: parsed.notes,
        requested_terms: parsed.terms,
        requested_salesperson_id: parsed.salespersonId,
        requested_lines: parsed.lines as unknown as Json,
        requested_submit: parsed.submit
    });
    if (error) throw mutation(error);
    return QuotationIdSchema.parse(data);
}
export async function transitionQuotation(businessId: string, input: TransitionQuotationInput) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = TransitionQuotationSchema.parse(input);
    const client = await createClient();
    const { error } = await client.rpc('transition_quotation', {
        requested_organization_id: id,
        requested_quotation_id: parsed.quotationId,
        requested_status: parsed.status
    });
    if (error) throw mutation(error);
}
export async function copyQuotation(businessId: string, quotationId: string, asRevision: boolean) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = CopyQuotationSchema.parse({ quotationId, asRevision });
    const client = await createClient();
    const { data, error } = await client.rpc('copy_quotation', {
        requested_organization_id: id,
        requested_quotation_id: parsed.quotationId,
        requested_as_revision: parsed.asRevision
    });
    if (error) throw mutation(error);
    return QuotationIdSchema.parse(data);
}
export async function convertQuotationToSale(businessId: string, quotationId: string, inventoryLocationId: string) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = ConvertQuotationToSaleSchema.parse({ quotationId, inventoryLocationId });
    const client = await createClient();
    const { data, error } = await client.rpc('convert_quotation_to_sale', {
        requested_organization_id: id,
        requested_quotation_id: parsed.quotationId,
        requested_location_id: parsed.inventoryLocationId
    });
    if (error) throw mutation(error);
    return String(data);
}
export async function convertQuotationToSalesOrder(businessId: string, quotationId: string) {
    const id = BusinessIdSchema.parse(businessId);
    const quoteId = QuotationIdSchema.parse(quotationId);
    const client = await createClient();
    const { data, error } = await client.rpc('convert_quotation_to_sales_order', {
        requested_organization_id: id,
        requested_quotation_id: quoteId
    });
    if (error) throw mutation(error);
    return String(data);
}
export async function shareQuotation(businessId: string, input: ShareQuotationInput) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = ShareQuotationSchema.parse(input);
    const client = await createClient();
    const { data, error } = await client.rpc('queue_quotation_share', {
        requested_organization_id: id,
        requested_quotation_id: parsed.quotationId,
        requested_channel: parsed.channel,
        requested_recipient: parsed.recipient
    });
    if (error) throw mutation(error);
    return String(data);
}
