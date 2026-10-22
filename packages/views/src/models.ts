import type { ObjectAttributeValue, ObjectRecord } from "@negosyo-os/objects";

export const VIEW_TYPES = ["table", "cards", "kanban"] as const;
export const VIEW_FILTER_OPERATORS = [
  "equals", "not_equals", "contains", "not_contains", "greater_than", "greater_than_or_equal",
  "less_than", "less_than_or_equal", "is_empty", "is_not_empty", "is_any_of", "is_today",
] as const;

export type ViewType = (typeof VIEW_TYPES)[number];
export type ViewFilterOperator = (typeof VIEW_FILTER_OPERATORS)[number];
export type ViewScope = "personal" | "shared";
export type ViewColumnKey = "record" | "branch" | "created_at" | "updated_at" | string;

export interface ViewFilter {
  fieldKey: string;
  operator: ViewFilterOperator;
  value?: ObjectAttributeValue | undefined;
}

export interface ViewFilterGroup {
  logic: "all" | "any";
  filters: readonly ViewFilter[];
}

export interface SavedViewFilter {
  key: string;
  name: string;
  group: ViewFilterGroup;
}

export interface ViewSort {
  fieldKey: string;
  direction: "asc" | "desc";
}

export interface ViewGrouping {
  fieldKey: string;
  direction: "asc" | "desc";
  showEmptyGroups: boolean;
}

export interface ViewSearch {
  enabled: boolean;
  fieldKeys: readonly string[];
  placeholder: string;
}

export interface ViewPagination {
  pageSize: number;
}

export interface ViewBranchFiltering {
  enabled: boolean;
  required: boolean;
  defaultBranchId?: string | undefined;
}

export interface ViewDefinition {
  id: string;
  businessId: string;
  objectDefinitionId: string;
  key: string;
  name: string;
  description: string | null;
  type: ViewType;
  selectedColumns: readonly ViewColumnKey[];
  filters: ViewFilterGroup;
  sorting: readonly ViewSort[];
  grouping?: ViewGrouping | undefined;
  savedFilters: readonly SavedViewFilter[];
  search: ViewSearch;
  pagination: ViewPagination;
  branchFiltering: ViewBranchFiltering;
  ownerUserId: string;
  scope: ViewScope;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ViewRuntimeInput {
  search?: string | undefined;
  branchId?: string | undefined;
  savedFilterKey?: string | undefined;
  page?: number | undefined;
  now?: Date | undefined;
  timezone?: string | undefined;
}

export interface ViewGroup {
  key: string;
  label: string;
  records: readonly ObjectRecord[];
}

export interface RenderedView {
  records: readonly ObjectRecord[];
  groups: readonly ViewGroup[];
  page: number;
  pageSize: number;
  pageCount: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
