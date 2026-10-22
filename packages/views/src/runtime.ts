import type { FieldDefinition, ObjectAttributeValue, ObjectRecord } from "@negosyo-os/objects";

import type { RenderedView, ViewDefinition, ViewFilter, ViewFilterGroup, ViewRuntimeInput } from "./models";

export function valueFor(record: ObjectRecord, fieldKey: string): ObjectAttributeValue | undefined {
  switch (fieldKey) {
    case "record": return record.displayValue;
    case "branch": return record.branchId;
    case "created_at": return record.createdAt;
    case "updated_at": return record.updatedAt;
    default: return record.attributes[fieldKey];
  }
}

function empty(value: ObjectAttributeValue | undefined): boolean {
  return value === undefined || value === null || value === "" || (isStringArray(value) && value.length === 0);
}

function isStringArray(value: ObjectAttributeValue | undefined): value is readonly string[] {
  return Array.isArray(value);
}

function scalar(value: ObjectAttributeValue | undefined): string | number | boolean | null | undefined {
  return isStringArray(value) ? value.join(", ") : value;
}

function localDate(value: unknown, timezone: string): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function matchesViewFilter(record: ObjectRecord, filter: ViewFilter, now: Date, timezone: string): boolean {
  const value = valueFor(record, filter.fieldKey);
  const comparable = scalar(value);
  const expected = scalar(filter.value);
  switch (filter.operator) {
    case "is_empty": return empty(value);
    case "is_not_empty": return !empty(value);
    case "equals": return isStringArray(value) ? value.includes(String(expected)) : comparable === expected;
    case "not_equals": return isStringArray(value) ? !value.includes(String(expected)) : comparable !== expected;
    case "contains": return isStringArray(value) ? value.some((item) => item.toLocaleLowerCase().includes(String(expected).toLocaleLowerCase())) : String(comparable ?? "").toLocaleLowerCase().includes(String(expected).toLocaleLowerCase());
    case "not_contains": return !String(isStringArray(value) ? value.join(" ") : comparable ?? "").toLocaleLowerCase().includes(String(expected).toLocaleLowerCase());
    case "greater_than": return comparable !== undefined && expected !== undefined && comparable !== null && expected !== null && comparable > expected;
    case "greater_than_or_equal": return comparable !== undefined && expected !== undefined && comparable !== null && expected !== null && comparable >= expected;
    case "less_than": return comparable !== undefined && expected !== undefined && comparable !== null && expected !== null && comparable < expected;
    case "less_than_or_equal": return comparable !== undefined && expected !== undefined && comparable !== null && expected !== null && comparable <= expected;
    case "is_any_of": {
      if (!isStringArray(filter.value)) return false;
      const expectedItems = filter.value;
      return isStringArray(value) ? value.some((item) => expectedItems.includes(item)) : expectedItems.includes(String(comparable));
    }
    case "is_today": return localDate(comparable, timezone) === localDate(now.toISOString(), timezone);
  }
}

export function matchesViewFilterGroup(record: ObjectRecord, group: ViewFilterGroup, now: Date, timezone: string): boolean {
  const results = group.filters.map((filter) => matchesViewFilter(record, filter, now, timezone));
  return group.logic === "all" ? results.every(Boolean) : results.some(Boolean);
}

function compareValues(left: ObjectAttributeValue | undefined, right: ObjectAttributeValue | undefined): number {
  if (empty(left)) return empty(right) ? 0 : 1;
  if (empty(right)) return -1;
  const a = scalar(left);
  const b = scalar(right);
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en-PH", { numeric: true, sensitivity: "base" });
}

export function renderView(
  definition: ViewDefinition,
  records: readonly ObjectRecord[],
  input: ViewRuntimeInput = {},
): RenderedView {
  const now = input.now ?? new Date();
  const timezone = input.timezone ?? "Asia/Manila";
  const selectedSavedFilter = input.savedFilterKey ? definition.savedFilters.find((filter) => filter.key === input.savedFilterKey) : undefined;
  const branchId = definition.branchFiltering.enabled ? input.branchId ?? definition.branchFiltering.defaultBranchId : undefined;
  const term = definition.search.enabled ? input.search?.trim().toLocaleLowerCase() : undefined;

  const filtered = records.filter((record) => {
    if (branchId && record.branchId !== branchId) return false;
    if (definition.branchFiltering.required && !branchId) return false;
    if (!matchesViewFilterGroup(record, definition.filters, now, timezone)) return false;
    if (selectedSavedFilter && !matchesViewFilterGroup(record, selectedSavedFilter.group, now, timezone)) return false;
    return !term || definition.search.fieldKeys.some((key) => {
      const value = valueFor(record, key);
      return String(isStringArray(value) ? value.join(" ") : value ?? "").toLocaleLowerCase().includes(term);
    });
  });

  const sorting = definition.sorting;
  filtered.sort((left, right) => {
    for (const sort of sorting) {
      const result = compareValues(valueFor(left, sort.fieldKey), valueFor(right, sort.fieldKey));
      if (result !== 0) return sort.direction === "asc" ? result : -result;
    }
    return right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);
  });

  const pageSize = definition.pagination.pageSize;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(input.page ?? 1, pageCount);
  const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize);
  const groups = definition.grouping
    ? [...Map.groupBy(pageRecords, (record) => String(scalar(valueFor(record, definition.grouping!.fieldKey)) ?? "__empty__")).entries()]
      .sort(([a], [b]) => definition.grouping!.direction === "asc" ? a.localeCompare(b) : b.localeCompare(a))
      .map(([key, groupedRecords]) => ({ key, label: key === "__empty__" ? "No value" : key, records: groupedRecords }))
    : [];
  return {
    records: pageRecords, groups, page, pageSize, pageCount, totalCount: filtered.length,
    hasPreviousPage: page > 1, hasNextPage: page < pageCount,
  };
}

export function validateViewFields(definition: ViewDefinition, fields: readonly FieldDefinition[]): void {
  const available = new Set(["record", "branch", "created_at", "updated_at", ...fields.filter((field) => field.status === "active").map((field) => field.key)]);
  const referenced = [
    ...definition.selectedColumns, ...definition.filters.filters.map((filter) => filter.fieldKey),
    ...definition.sorting.map((sort) => sort.fieldKey), ...definition.search.fieldKeys,
    ...(definition.grouping ? [definition.grouping.fieldKey] : []),
    ...definition.savedFilters.flatMap((saved) => saved.group.filters.map((filter) => filter.fieldKey)),
  ];
  const unknown = referenced.find((key) => !available.has(key));
  if (unknown) throw new Error(`View references unknown or archived field: ${unknown}`);
}
