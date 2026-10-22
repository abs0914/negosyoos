import "server-only";

import { requireAuthenticatedUser, requireCapability, requirePermission } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS, type Permission } from "@negosyo-os/core/permissions";

import { getMetricDefinition } from "./registry";
import { ApprovedBusinessQueryInputSchema, ApprovedBusinessQueryResultSchema, MetricBatchQuerySchema, MetricQuerySchema, MetricResultSchema,RecommendationBusinessQueryInputSchema,RecommendationBusinessQueryResultSchema, type ApprovedBusinessQueryInput, type ApprovedBusinessQueryResult, type MetricQuery, type MetricResult,type RecommendationBusinessQueryInput,type RecommendationBusinessQueryResult } from "./schemas";

function failure(cause: unknown): AppError { return new AppError({ code: ERROR_CODES.internal, message: "Business metric could not be calculated.", status: 500, expose: false, cause }); }

export async function queryBusinessMetric(businessId: string, input: MetricQuery): Promise<MetricResult> {
  const query = MetricQuerySchema.parse(input), definition = getMetricDefinition(query.metricKey), supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requirePermission(businessId, PERMISSIONS.reportRead, supabase);
  await requireCapability(user, definition.requiredPermission as Permission, { businessId, ...(query.branchId ? { branchId: query.branchId } : {}) }, supabase);
  const { data, error } = await supabase.rpc("query_business_metric", {
    requested_organization_id: businessId, requested_metric_key: query.metricKey,
    ...(query.dateFrom ? { requested_date_from: query.dateFrom } : {}),
    ...(query.dateTo ? { requested_date_to: query.dateTo } : {}),
    ...(query.branchId ? { requested_branch_id: query.branchId } : {}),
    requested_limit: query.limit,
  });
  if (error) throw failure(error);
  return MetricResultSchema.parse(data);
}

export async function queryBusinessMetrics(businessId: string, inputs: readonly MetricQuery[]): Promise<readonly MetricResult[]> {
  const queries = MetricBatchQuerySchema.parse(inputs);
  return Promise.all(queries.map(query => queryBusinessMetric(businessId, query)));
}

const QUERY_PERMISSIONS={customers_not_returned:"crm.read",reorder_candidates:"inventory.read",product_sales_comparison:"sales.read"}as const;
export async function queryApprovedBusinessData(businessId:string,input:ApprovedBusinessQueryInput):Promise<ApprovedBusinessQueryResult>{
  const query=ApprovedBusinessQueryInputSchema.parse(input),supabase=await createClient(),user=await requireAuthenticatedUser(supabase);
  await requirePermission(businessId,PERMISSIONS.reportRead,supabase);await requireCapability(user,QUERY_PERMISSIONS[query.queryKey],{businessId,...(query.branchId?{branchId:query.branchId}:{})},supabase);
  const{data,error}=await supabase.rpc("query_advisor_business_data",{requested_organization_id:businessId,requested_query_key:query.queryKey,...(query.dateFrom?{requested_date_from:query.dateFrom}:{}),...(query.dateTo?{requested_date_to:query.dateTo}:{}),...(query.branchId?{requested_branch_id:query.branchId}:{}),requested_limit:query.limit});
  if(error)throw failure(error);return ApprovedBusinessQueryResultSchema.parse(data);
}
const RECOMMENDATION_QUERY_PERMISSIONS={customer_sales_concentration:["sales.read"],inventory_stockout_risk:["inventory.read","sales.read"],expense_period_comparison:["expenses.read"]}as const;
export async function queryRecommendationBusinessData(businessId:string,input:RecommendationBusinessQueryInput):Promise<RecommendationBusinessQueryResult>{const query=RecommendationBusinessQueryInputSchema.parse(input),supabase=await createClient(),user=await requireAuthenticatedUser(supabase);await requirePermission(businessId,PERMISSIONS.reportRead,supabase);await Promise.all(RECOMMENDATION_QUERY_PERMISSIONS[query.queryKey].map(permission=>requireCapability(user,permission,{businessId,...(query.branchId?{branchId:query.branchId}:{})},supabase)));const{data,error}=await supabase.rpc("query_recommendation_business_data",{requested_organization_id:businessId,requested_query_key:query.queryKey,...(query.dateFrom?{requested_date_from:query.dateFrom}:{}),...(query.dateTo?{requested_date_to:query.dateTo}:{}),...(query.branchId?{requested_branch_id:query.branchId}:{}),requested_limit:query.limit});if(error)throw failure(error);return RecommendationBusinessQueryResultSchema.parse(data);}
