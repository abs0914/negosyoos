import { describe, expect, it } from "vitest";

import { SaveViewInputSchema, ViewConfigurationSchema } from "./schemas";

const base = {
  objectDefinitionId: "10000000-0000-4000-8000-000000000001",
  key: "pending_deliveries",
  name: "Pending Deliveries",
  scope: "shared" as const,
  configuration: {
    type: "table" as const,
    selectedColumns: ["record", "status", "delivery_date"],
    filters: { logic: "all" as const, filters: [{ fieldKey: "status", operator: "equals" as const, value: "pending" }] },
  },
};

describe("ViewDefinition schemas", () => {
  it("applies safe runtime defaults", () => {
    const parsed = SaveViewInputSchema.parse(base);
    expect(parsed.configuration.pagination.pageSize).toBe(25);
    expect(parsed.configuration.search.fieldKeys).toEqual(["record"]);
  });

  it("requires grouping for kanban", () => {
    expect(() => ViewConfigurationSchema.parse({ ...base.configuration, type: "kanban" })).toThrow(/grouping/i);
  });

  it("rejects unknown executable properties and malformed filters", () => {
    expect(() => SaveViewInputSchema.parse({ ...base, javascript: "alert(1)" })).toThrow();
    expect(() => SaveViewInputSchema.parse({ ...base, configuration: { ...base.configuration, filters: { logic: "all", filters: [{ fieldKey: "status", operator: "equals", sql: "drop table" }] } } })).toThrow();
  });

  it("supports the requested operational view shapes", () => {
    for (const input of [
      { key: "unpaid_contractor_accounts", name: "Unpaid Contractor Accounts", field: "payment_status", value: "unpaid" },
      { key: "low_stock_products", name: "Low Stock Products", field: "stock", value: 10, operator: "less_than" },
      { key: "todays_appointments", name: "Today's Appointments", field: "appointment_at", operator: "is_today", value: undefined },
    ]) {
      expect(SaveViewInputSchema.parse({ ...base, key: input.key, name: input.name, configuration: { ...base.configuration, filters: { logic: "all", filters: [{ fieldKey: input.field, operator: input.operator ?? "equals", ...(input.value !== undefined ? { value: input.value } : {}) }] } } }).key).toBe(input.key);
    }
  });
});
