import { describe, expect, it } from "vitest";
import type { ObjectRecord } from "@negosyo-os/objects";

import type { ViewDefinition } from "./models";
import { renderView } from "./runtime";

const record = (id: string, attributes: ObjectRecord["attributes"], branchId: string | null = null): ObjectRecord => ({
  id, businessId: "10000000-0000-4000-8000-000000000001", objectDefinitionId: "10000000-0000-4000-8000-000000000002",
  branchId, displayValue: String(attributes.name ?? id), attributes, status: "active",
  createdBy: "10000000-0000-4000-8000-000000000003", updatedBy: "10000000-0000-4000-8000-000000000003",
  createdAt: "2026-08-25T00:00:00Z", updatedAt: "2026-08-25T00:00:00Z",
});

const definition: ViewDefinition = {
  id: "10000000-0000-4000-8000-000000000004", businessId: "10000000-0000-4000-8000-000000000001",
  objectDefinitionId: "10000000-0000-4000-8000-000000000002", key: "low_stock", name: "Low Stock Products",
  description: null, type: "kanban", selectedColumns: ["record", "stock", "status"],
  filters: { logic: "all", filters: [{ fieldKey: "stock", operator: "less_than", value: 10 }] },
  sorting: [{ fieldKey: "stock", direction: "asc" }], grouping: { fieldKey: "status", direction: "asc", showEmptyGroups: false },
  savedFilters: [{ key: "urgent", name: "Urgent", group: { logic: "all", filters: [{ fieldKey: "stock", operator: "less_than", value: 5 }] } }],
  search: { enabled: true, fieldKeys: ["record", "status"], placeholder: "Search products…" },
  pagination: { pageSize: 5 }, branchFiltering: { enabled: true, required: false },
  ownerUserId: "10000000-0000-4000-8000-000000000003", scope: "shared", status: "active",
  createdAt: "2026-08-25T00:00:00Z", updatedAt: "2026-08-25T00:00:00Z",
};

describe("view runtime", () => {
  it("combines metadata filters, saved filters, search, branch scope, sorting, grouping, and pagination", () => {
    const branch = "10000000-0000-4000-8000-000000000005";
    const result = renderView(definition, [
      record("10000000-0000-4000-8000-000000000010", { name: "Rice", stock: 3, status: "critical" }, branch),
      record("10000000-0000-4000-8000-000000000011", { name: "Milk", stock: 7, status: "low" }, branch),
      record("10000000-0000-4000-8000-000000000012", { name: "Rice", stock: 2, status: "critical" }),
      record("10000000-0000-4000-8000-000000000013", { name: "Rice", stock: 30, status: "healthy" }, branch),
    ], { branchId: branch, savedFilterKey: "urgent", search: "rice" });
    expect(result.records.map((item) => item.displayValue)).toEqual(["Rice"]);
    expect(result.groups[0]?.label).toBe("critical");
    expect(result.totalCount).toBe(1);
  });

  it("evaluates today's date in the business timezone", () => {
    const today = { ...definition, type: "table" as const, grouping: undefined, filters: { logic: "all" as const, filters: [{ fieldKey: "appointment", operator: "is_today" as const }] } };
    const result = renderView(today, [record("10000000-0000-4000-8000-000000000020", { name: "Morning", appointment: "2026-08-24T16:30:00Z" })], { now: new Date("2026-08-25T02:00:00Z"), timezone: "Asia/Manila" });
    expect(result.totalCount).toBe(1);
  });
});
