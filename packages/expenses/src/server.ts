import 'server-only';
import { can, requireAuthenticatedUser, requireCapability } from '@negosyo-os/auth';
import { createClient, type ServerSupabaseClient } from '@negosyo-os/auth/server';
import { BusinessIdSchema } from '@negosyo-os/business';
import { AppError, ERROR_CODES } from '@negosyo-os/core/errors';
import { PERMISSIONS } from '@negosyo-os/core/permissions';
import type { Tables } from '@negosyo-os/database';
import type { Expense, ExpenseCategory, ExpenseSummary, RecurringExpense } from './models';
import {
    ExpenseCategoryIdSchema,
    ExpenseIdSchema,
    ExpenseReportRangeSchema,
    RecurringExpenseIdSchema,
    SaveExpenseCategorySchema,
    SaveExpenseSchema,
    SaveRecurringExpenseSchema,
    type SaveExpenseCategoryInput,
    type SaveExpenseInput,
    type SaveRecurringExpenseInput
} from './schemas';
type CategoryRow = Tables<'expense_categories'>;
type ExpenseRow = Tables<'expenses'>;
type RecurringRow = Tables<'recurring_expense_definitions'>;
const fail = (message: string, cause: unknown) =>
    new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
function mutation(error: { code?: string; message?: string }) {
    if (error.code === '42501')
        return new AppError({
            code: ERROR_CODES.permissionDenied,
            message: 'You cannot perform this expense operation.',
            status: 403,
            cause: error
        });
    if (['22023', '23505', 'P0001'].includes(error.code ?? ''))
        return new AppError({
            code: ERROR_CODES.validationFailed,
            message: error.message ?? 'Invalid expense operation.',
            status: 400,
            cause: error
        });
    return fail('The expense operation failed.', error);
}
function category(row: CategoryRow): ExpenseCategory {
    return {
        id: row.id,
        businessId: row.organization_id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
function expense(
    row: ExpenseRow,
    categories: ReadonlyMap<string, ExpenseCategory>,
    branches: ReadonlyMap<string, string>,
    approvalRequestId?: string | null
): Expense {
    const assignedCategory = categories.get(row.category_id),
        branchName = branches.get(row.branch_id);
    return {
        id: row.id,
        businessId: row.organization_id,
        expenseNumber: row.expense_number,
        expenseDate: row.expense_date,
        categoryId: row.category_id,
        branchId: row.branch_id,
        supplierPayee: row.supplier_payee,
        amount: Number(row.amount),
        paymentMethod: row.payment_method as Expense['paymentMethod'],
        description: row.description,
        receiptPath: row.receipt_path,
        receiptFileName: row.receipt_file_name,
        receiptMimeType: row.receipt_mime_type,
        receiptSizeBytes: row.receipt_size_bytes,
        approvalStatus: row.approval_status as Expense['approvalStatus'],
        idempotencyKey: row.idempotency_key,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(assignedCategory ? { category: assignedCategory } : {}),
        ...(branchName ? { branchName } : {}),
        ...(approvalRequestId !== undefined ? { approvalRequestId } : {})
    };
}
function recurring(
    row: RecurringRow,
    categories: ReadonlyMap<string, ExpenseCategory>,
    branches: ReadonlyMap<string, string>
): RecurringExpense {
    const assignedCategory = categories.get(row.category_id),
        branchName = branches.get(row.branch_id);
    return {
        id: row.id,
        businessId: row.organization_id,
        name: row.name,
        categoryId: row.category_id,
        branchId: row.branch_id,
        supplierPayee: row.supplier_payee,
        amount: Number(row.amount),
        paymentMethod: row.payment_method as RecurringExpense['paymentMethod'],
        description: row.description,
        frequency: row.frequency as RecurringExpense['frequency'],
        nextDueDate: row.next_due_date,
        endDate: row.end_date,
        isActive: row.is_active,
        lastGeneratedAt: row.last_generated_at,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(assignedCategory ? { category: assignedCategory } : {}),
        ...(branchName ? { branchName } : {})
    };
}
async function reader(businessId: string, client?: ServerSupabaseClient) {
    const id = BusinessIdSchema.parse(businessId);
    const database = client ?? (await createClient());
    const user = await requireAuthenticatedUser(database);
    await requireCapability(user, PERMISSIONS.expensesRead, { businessId: id }, database);
    return { id, client: database, user };
}
async function references(id: string, client: ServerSupabaseClient) {
    const [categories, branches] = await Promise.all([
        client.from('expense_categories').select('*').eq('organization_id', id).order('name'),
        client.from('branches').select('id,name').eq('organization_id', id).order('name')
    ]);
    if (categories.error || branches.error)
        throw fail('Expense references could not be loaded.', categories.error ?? branches.error);
    return {
        categories: (categories.data ?? []).map(category),
        branches: new Map((branches.data ?? []).map((row) => [row.id, row.name]))
    };
}
export async function listExpenseCategories(businessId: string) {
    const { id, client } = await reader(businessId);
    return (await references(id, client)).categories;
}
export async function listExpenses(
    businessId: string,
    query: { from?: string; to?: string; branchId?: string; categoryId?: string; status?: string } = {}
): Promise<readonly Expense[]> {
    const { id, client } = await reader(businessId);
    let request = client
        .from('expenses')
        .select('*')
        .eq('organization_id', id)
        .order('expense_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(500);
    if (query.from) request = request.gte('expense_date', query.from);
    if (query.to) request = request.lte('expense_date', query.to);
    if (query.branchId) request = request.eq('branch_id', query.branchId);
    if (query.categoryId) request = request.eq('category_id', query.categoryId);
    if (query.status) request = request.eq('approval_status', query.status);
    const [rows, refs, links] = await Promise.all([
        request,
        references(id, client),
        client.from('expense_approval_links').select('expense_id,approval_request_id').eq('organization_id', id)
    ]);
    if (rows.error || links.error) throw fail('Expenses could not be loaded.', rows.error ?? links.error);
    const categoryMap = new Map(refs.categories.map((value) => [value.id, value]));
    const linkMap = new Map((links.data ?? []).map((value) => [value.expense_id, value.approval_request_id]));
    return (rows.data ?? []).map((row) => expense(row, categoryMap, refs.branches, linkMap.get(row.id)));
}
export async function listRecurringExpenses(businessId: string) {
    const { id, client } = await reader(businessId);
    const [rows, refs] = await Promise.all([
        client.from('recurring_expense_definitions').select('*').eq('organization_id', id).order('next_due_date'),
        references(id, client)
    ]);
    if (rows.error) throw fail('Recurring expenses could not be loaded.', rows.error);
    const categoryMap = new Map(refs.categories.map((value) => [value.id, value]));
    return (rows.data ?? []).map((row) => recurring(row, categoryMap, refs.branches));
}
export async function getExpenseSummary(
    businessId: string,
    input: { from: string; to: string }
): Promise<ExpenseSummary> {
    const { id, client } = await reader(businessId);
    const range = ExpenseReportRangeSchema.parse(input);
    const { data, error } = await client.rpc('expense_summary', {
        requested_organization_id: id,
        requested_from: range.from,
        requested_to: range.to
    });
    if (error) throw mutation(error);
    const value = data as { total?: unknown; monthly?: unknown; byCategory?: unknown; byBranch?: unknown } | null;
    const rows = (candidate: unknown) => (Array.isArray(candidate) ? candidate : []);
    return {
        total: Number(value?.total ?? 0),
        monthly: rows(value?.monthly).map((item) => {
            const row = item as Record<string, unknown>;
            return { month: String(row.month), amount: Number(row.amount) };
        }),
        byCategory: rows(value?.byCategory).map((item) => {
            const row = item as Record<string, unknown>;
            return { categoryId: String(row.categoryId), category: String(row.category), amount: Number(row.amount) };
        }),
        byBranch: rows(value?.byBranch).map((item) => {
            const row = item as Record<string, unknown>;
            return { branchId: String(row.branchId), branch: String(row.branch), amount: Number(row.amount) };
        })
    };
}
export async function saveExpenseCategory(businessId: string, input: SaveExpenseCategoryInput) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = SaveExpenseCategorySchema.parse(input);
    const client = await createClient();
    const user = await requireAuthenticatedUser(client);
    await requireCapability(user, PERMISSIONS.expensesManage, { businessId: id }, client);
    const { data, error } = await client.rpc('save_expense_category', {
        requested_organization_id: id,
        requested_category_id: (parsed.categoryId ?? null) as string,
        requested_name: parsed.name,
        requested_description: parsed.description,
        requested_is_active: parsed.isActive
    });
    if (error) throw mutation(error);
    return ExpenseCategoryIdSchema.parse(data);
}
export async function saveExpense(businessId: string, input: SaveExpenseInput) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = SaveExpenseSchema.parse(input);
    const client = await createClient();
    const { data, error } = await client.rpc('save_expense', {
        requested_organization_id: id,
        requested_expense_id: (parsed.expenseId ?? null) as string,
        requested_expense_date: parsed.expenseDate,
        requested_category_id: parsed.categoryId,
        requested_branch_id: parsed.branchId,
        requested_supplier_payee: parsed.supplierPayee,
        requested_amount: parsed.amount,
        requested_payment_method: parsed.paymentMethod,
        requested_description: parsed.description,
        requested_submit: parsed.submit,
        requested_idempotency_key: parsed.idempotencyKey
    });
    if (error) throw mutation(error);
    return ExpenseIdSchema.parse(data);
}
export async function uploadExpenseReceipt(businessId: string, expenseId: string, file: File) {
    const id = BusinessIdSchema.parse(businessId);
    const parsedExpenseId = ExpenseIdSchema.parse(expenseId);
    if (file.size < 1 || file.size > 10_485_760)
        throw new AppError({
            code: ERROR_CODES.validationFailed,
            message: 'Receipts must be no larger than 10 MB.',
            status: 400
        });
    const extensionByType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf'
    };
    const extension = extensionByType[file.type];
    if (!extension)
        throw new AppError({
            code: ERROR_CODES.validationFailed,
            message: 'Receipt must be a JPEG, PNG, WebP, or PDF file.',
            status: 400
        });
    const client = await createClient();
    await requireAuthenticatedUser(client);
    const path = `${id}/${parsedExpenseId}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await client.storage
        .from('expense-receipts')
        .upload(path, file, { contentType: file.type, upsert: false });
    if (uploaded.error) throw fail('The receipt could not be uploaded.', uploaded.error);
    const attached = await client.rpc('attach_expense_receipt', {
        requested_organization_id: id,
        requested_expense_id: parsedExpenseId,
        requested_path: path,
        requested_file_name: file.name.slice(0, 255),
        requested_mime_type: file.type,
        requested_size: file.size
    });
    if (attached.error) {
        await client.storage.from('expense-receipts').remove([path]);
        throw mutation(attached.error);
    }
    return path;
}
export async function saveExpenseWithReceipt(businessId: string, input: SaveExpenseInput, file?: File | null) {
    const expenseId = await saveExpense(businessId, input);
    if (file && file.size > 0) await uploadExpenseReceipt(businessId, expenseId, file);
    return expenseId;
}
export async function getExpenseReceiptUrl(businessId: string, path: string) {
    const { id, client } = await reader(businessId);
    if (!path.startsWith(`${id}/`))
        throw new AppError({ code: ERROR_CODES.permissionDenied, message: 'Receipt path is invalid.', status: 403 });
    const { data, error } = await client.storage.from('expense-receipts').createSignedUrl(path, 600);
    if (error) throw fail('Receipt could not be opened.', error);
    return data.signedUrl;
}
export async function saveRecurringExpense(businessId: string, input: SaveRecurringExpenseInput) {
    const id = BusinessIdSchema.parse(businessId);
    const parsed = SaveRecurringExpenseSchema.parse(input);
    const client = await createClient();
    const user = await requireAuthenticatedUser(client);
    await requireCapability(user, PERMISSIONS.expensesManage, { businessId: id, branchId: parsed.branchId }, client);
    const { data, error } = await client.rpc('save_recurring_expense', {
        requested_organization_id: id,
        requested_recurring_id: (parsed.recurringExpenseId ?? null) as string,
        requested_name: parsed.name,
        requested_category_id: parsed.categoryId,
        requested_branch_id: parsed.branchId,
        requested_supplier_payee: parsed.supplierPayee,
        requested_amount: parsed.amount,
        requested_payment_method: parsed.paymentMethod,
        requested_description: parsed.description,
        requested_frequency: parsed.frequency,
        requested_next_due_date: parsed.nextDueDate,
        requested_end_date: (parsed.endDate || null) as string,
        requested_is_active: parsed.isActive
    });
    if (error) throw mutation(error);
    return RecurringExpenseIdSchema.parse(data);
}
export async function generateRecurringExpense(businessId: string, recurringExpenseId: string, scheduledDate: string) {
    const id = BusinessIdSchema.parse(businessId);
    const recurringId = RecurringExpenseIdSchema.parse(recurringExpenseId);
    const client = await createClient();
    const user = await requireAuthenticatedUser(client);
    const allowed = await can(user, PERMISSIONS.expensesManage, { businessId: id }, client);
    if (!allowed)
        throw new AppError({
            code: ERROR_CODES.permissionDenied,
            message: 'You cannot generate recurring expenses.',
            status: 403
        });
    const { data, error } = await client.rpc('generate_recurring_expense', {
        requested_organization_id: id,
        requested_recurring_id: recurringId,
        requested_scheduled_date: scheduledDate,
        requested_idempotency_key: `recurring:${recurringId}:${scheduledDate}`
    });
    if (error) throw mutation(error);
    return ExpenseIdSchema.parse(data);
}
