import { z } from "zod";

export const MetricKeySchema = z.enum([
  "sales_today", "sales_this_month", "sales_growth", "average_transaction_value", "gross_margin", "expense_total", "inventory_value", "low_stock_count", "customer_count", "repeat_customer_rate", "receivables_total", "overdue_receivables", "top_products", "slow_moving_products",
]);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
export const MetricQuerySchema = z.strictObject({
  metricKey: MetricKeySchema,
  dateFrom: IsoDateSchema.optional(),
  dateTo: IsoDateSchema.optional(),
  branchId: z.uuid().optional(),
  limit: z.number().int().min(1).max(25).default(5),
}).superRefine((value, context) => {
  if ((value.dateFrom === undefined) !== (value.dateTo === undefined)) context.addIssue({ code: "custom", message: "Provide both dateFrom and dateTo.", path: ["dateFrom"] });
  if (value.dateFrom && value.dateTo) {
    const from = Date.parse(`${value.dateFrom}T00:00:00Z`), to = Date.parse(`${value.dateTo}T00:00:00Z`);
    if (from > to) context.addIssue({ code: "custom", message: "dateFrom must not be after dateTo.", path: ["dateFrom"] });
    if ((to - from) / 86_400_000 > 365) context.addIssue({ code: "custom", message: "Date range cannot exceed 366 days.", path: ["dateTo"] });
  }
});
export const MetricBatchQuerySchema = z.array(MetricQuerySchema).min(1).max(14).superRefine((queries, context) => {
  const keys = queries.map(query => `${query.metricKey}:${query.branchId ?? "all"}:${query.dateFrom ?? "default"}:${query.dateTo ?? "default"}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", message: "Duplicate metric queries are not allowed." });
});
const ProductMetricSchema = z.strictObject({ productName: z.string(), variantName: z.string(), sku: z.string(), unitsSold: z.number(), recordedSales: z.number().optional(), quantityOnHand: z.number().optional() });
export const MetricResultSchema = z.strictObject({
  metricKey: MetricKeySchema, label: z.string(), definition: z.string(), valueType: z.enum(["currency", "number", "percentage", "list"]),
  value: z.union([z.number(), z.null(), z.array(ProductMetricSchema)]), unit: z.enum(["PHP", "percent"]).nullable(),
  dateBehavior: z.enum(["today", "month_to_date", "last_30_days", "current_snapshot"]),
  period: z.strictObject({ dateFrom: IsoDateSchema, dateTo: IsoDateSchema, timezone: z.literal("Asia/Manila") }).nullable(),
  branchId: z.uuid().nullable(), calculatedAt: z.string(),
});

export const ApprovedBusinessQueryKeySchema = z.enum(["customers_not_returned", "reorder_candidates", "product_sales_comparison"]);
export const ApprovedBusinessQueryInputSchema = z.strictObject({
  queryKey: ApprovedBusinessQueryKeySchema, dateFrom: IsoDateSchema.optional(), dateTo: IsoDateSchema.optional(), branchId: z.uuid().optional(), limit: z.number().int().min(1).max(25).default(10),
});
const CustomerReturnRowSchema = z.strictObject({ customerId:z.uuid(),name:z.string(),mobile:z.string().nullable(),lastPurchase:z.string(),daysSinceLastPurchase:z.number().int().nonnegative(),transactionCount:z.number().int().positive() });
const ReorderRowSchema = z.strictObject({ productName:z.string(),variantName:z.string(),sku:z.string(),quantityOnHand:z.number(),lowStockThreshold:z.number(),reorderLevel:z.number(),suggestedQuantity:z.number().nonnegative() });
const ProductComparisonRowSchema = z.strictObject({ productName:z.string(),sku:z.string(),currentUnits:z.number(),previousUnits:z.number(),unitChange:z.number(),changePercent:z.number().nullable() });
export const ApprovedBusinessQueryResultSchema = z.strictObject({
  queryKey: ApprovedBusinessQueryKeySchema,label:z.string(),definition:z.string(),rows:z.array(z.union([CustomerReturnRowSchema,ReorderRowSchema,ProductComparisonRowSchema])),
  dateBehavior:z.enum(["inactive_before","current_snapshot","period_comparison"]),period:z.union([z.strictObject({inactiveBefore:IsoDateSchema,timezone:z.literal("Asia/Manila")}),z.strictObject({dateFrom:IsoDateSchema,dateTo:IsoDateSchema,timezone:z.literal("Asia/Manila")}),z.null()]),branchId:z.uuid().nullable(),calculatedAt:z.string(),
});

export const RecommendationBusinessQueryKeySchema=z.enum(["customer_sales_concentration","inventory_stockout_risk","expense_period_comparison"]);
export const RecommendationBusinessQueryInputSchema=z.strictObject({queryKey:RecommendationBusinessQueryKeySchema,dateFrom:IsoDateSchema.optional(),dateTo:IsoDateSchema.optional(),branchId:z.uuid().optional(),limit:z.number().int().min(1).max(25).default(10)}).superRefine((value,context)=>{if((value.dateFrom===undefined)!==(value.dateTo===undefined))context.addIssue({code:"custom",message:"Provide both dateFrom and dateTo.",path:["dateFrom"]});if(value.queryKey==="inventory_stockout_risk"&&(value.dateFrom||value.dateTo))context.addIssue({code:"custom",message:"Stock risk uses a fixed trailing 30-day period.",path:["dateFrom"]});});
const CustomerConcentrationRowSchema=z.strictObject({topCustomerCount:z.number().int().positive().max(10),topCustomerSales:z.number(),totalSales:z.number().positive(),sharePercent:z.number().min(0)});
const StockoutRiskRowSchema=z.strictObject({productName:z.string(),variantName:z.string(),sku:z.string(),quantityOnHand:z.number(),lowStockThreshold:z.number(),averageDailyUnits:z.number().positive(),projectedQuantity:z.number(),projectionDays:z.literal(7)});
const ExpenseComparisonRowSchema=z.strictObject({currentExpenses:z.number().nonnegative(),previousExpenses:z.number().nonnegative(),changePercent:z.number().nullable()});
export const RecommendationBusinessQueryResultSchema=z.strictObject({queryKey:RecommendationBusinessQueryKeySchema,label:z.string(),definition:z.string(),rows:z.array(z.union([CustomerConcentrationRowSchema,StockoutRiskRowSchema,ExpenseComparisonRowSchema])),dateBehavior:z.enum(["month_to_date","velocity_projection","period_comparison"]),period:z.strictObject({dateFrom:IsoDateSchema,dateTo:IsoDateSchema,timezone:z.literal("Asia/Manila")}),branchId:z.uuid().nullable(),calculatedAt:z.string()});

export type MetricKey = z.infer<typeof MetricKeySchema>;
export type MetricQuery = z.input<typeof MetricQuerySchema>;
export type ParsedMetricQuery = z.output<typeof MetricQuerySchema>;
export type MetricResult = z.infer<typeof MetricResultSchema>;
export type ApprovedBusinessQueryKey = z.infer<typeof ApprovedBusinessQueryKeySchema>;
export type ApprovedBusinessQueryInput = z.input<typeof ApprovedBusinessQueryInputSchema>;
export type ApprovedBusinessQueryResult = z.infer<typeof ApprovedBusinessQueryResultSchema>;
export type RecommendationBusinessQueryKey=z.infer<typeof RecommendationBusinessQueryKeySchema>;
export type RecommendationBusinessQueryInput=z.input<typeof RecommendationBusinessQueryInputSchema>;
export type RecommendationBusinessQueryResult=z.infer<typeof RecommendationBusinessQueryResultSchema>;
