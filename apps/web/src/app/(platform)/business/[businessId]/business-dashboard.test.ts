import { describe, expect, it } from "vitest";
import { buildBusinessDashboardViewModel } from "./business-dashboard";

describe("business dashboard view model", () => {
  it("does not give an all-clear when a source failed or no records are available", () => {
    const partial = buildBusinessDashboardViewModel("/business/example", {}, ["inventory"]);
    expect(partial.attentionLabel).toBe("Incomplete summary");
    expect(partial.attentionTitle).toBe("Some checks could not be completed");
    expect(buildBusinessDashboardViewModel("/business/example", {}).attentionTitle).toBe("No alerts in the available records");
  });
  it("prioritizes operational attention without inventing zero-value items", () => {
    const result = buildBusinessDashboardViewModel("/business/example", { inventory: { lowStock: 3, outOfStock: 1 }, notifications: { unread: 0 }, receivables: { overdue: 2500, total: 8000 } });
    expect(result.attention.map((item) => item.icon)).toEqual(["inventory", "inventory", "invoices"]);
    expect(result.attention[0]?.href).toBe("/business/example/inventory");
  });

  it("recognizes an available zero-data source as a configured dashboard", () => {
    expect(buildBusinessDashboardViewModel("/business/example", { sales: { average: 0, today: 0, transactions: 0 } }).hasOperationalData).toBe(true);
    expect(buildBusinessDashboardViewModel("/business/example", {}).hasOperationalData).toBe(false);
  });
});
