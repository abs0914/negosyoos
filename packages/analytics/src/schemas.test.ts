import { describe, expect, it } from "vitest";
import { getMetricRegistry } from "./registry";
import { ApprovedBusinessQueryInputSchema, MetricBatchQuerySchema, MetricQuerySchema,RecommendationBusinessQueryInputSchema } from "./schemas";

describe("analytics semantic contracts", () => {
  it("publishes every supported metric with a clear definition", () => {
    const registry = getMetricRegistry();
    expect(registry).toHaveLength(14);
    expect(registry.every(item => item.definition.length > 30 && item.supportsBranchFilter)).toBe(true);
  });
  it("validates bounded date and list filters", () => {
    expect(MetricQuerySchema.safeParse({ metricKey:"sales_today",dateFrom:"2026-08-01",dateTo:"2026-08-28",limit:5 }).success).toBe(true);
    expect(MetricQuerySchema.safeParse({ metricKey:"sales_today",dateFrom:"2026-08-28",dateTo:"2026-08-01" }).success).toBe(false);
    expect(MetricQuerySchema.safeParse({ metricKey:"top_products",limit:100 }).success).toBe(false);
  });
  it("rejects arbitrary metric names and duplicate batch requests", () => {
    expect(MetricQuerySchema.safeParse({ metricKey:"raw_sql" }).success).toBe(false);
    expect(MetricBatchQuerySchema.safeParse([{metricKey:"sales_today"},{metricKey:"sales_today"}]).success).toBe(false);
  });
  it("allowlists advisor business queries",()=>{expect(ApprovedBusinessQueryInputSchema.safeParse({queryKey:"reorder_candidates"}).success).toBe(true);expect(ApprovedBusinessQueryInputSchema.safeParse({queryKey:"select_customers"}).success).toBe(false);});
  it("allowlists bounded recommendation queries",()=>{expect(RecommendationBusinessQueryInputSchema.safeParse({queryKey:"inventory_stockout_risk"}).success).toBe(true);expect(RecommendationBusinessQueryInputSchema.safeParse({queryKey:"inventory_stockout_risk",dateFrom:"2026-08-01",dateTo:"2026-08-28"}).success).toBe(false);expect(RecommendationBusinessQueryInputSchema.safeParse({queryKey:"raw_sales"}).success).toBe(false);});
});
