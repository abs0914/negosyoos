import { ObjectKeySchema } from "@negosyo-os/objects";
import { z } from "zod";

import { VIEW_FILTER_OPERATORS, VIEW_TYPES } from "./models";

const valueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(z.string()).max(100)]);
const fieldKeySchema = z.union([ObjectKeySchema, z.enum(["record", "branch", "created_at", "updated_at"])]);

export const ViewIdSchema = z.uuid();
export const ViewFilterSchema = z.strictObject({
  fieldKey: fieldKeySchema,
  operator: z.enum(VIEW_FILTER_OPERATORS),
  value: valueSchema.optional(),
}).superRefine((filter, context) => {
  const noValue = filter.operator === "is_empty" || filter.operator === "is_not_empty" || filter.operator === "is_today";
  if (noValue && filter.value !== undefined) context.addIssue({ code: "custom", path: ["value"], message: "This operator does not accept a value." });
  if (!noValue && filter.value === undefined) context.addIssue({ code: "custom", path: ["value"], message: "This operator requires a value." });
  if (filter.operator === "is_any_of" && !Array.isArray(filter.value)) context.addIssue({ code: "custom", path: ["value"], message: "Any-of filters require a list." });
});

export const ViewFilterGroupSchema = z.strictObject({
  logic: z.enum(["all", "any"]),
  filters: z.array(ViewFilterSchema).max(25),
});

export const SavedViewFilterSchema = z.strictObject({
  key: ObjectKeySchema,
  name: z.string().trim().min(1).max(80),
  group: ViewFilterGroupSchema,
});

export const ViewConfigurationSchema = z.strictObject({
  type: z.enum(VIEW_TYPES).default("table"),
  selectedColumns: z.array(fieldKeySchema).min(1).max(50).refine((keys) => new Set(keys).size === keys.length, "Columns must be unique."),
  filters: ViewFilterGroupSchema.default({ logic: "all", filters: [] }),
  sorting: z.array(z.strictObject({ fieldKey: fieldKeySchema, direction: z.enum(["asc", "desc"]) })).max(5).default([]),
  grouping: z.strictObject({ fieldKey: fieldKeySchema, direction: z.enum(["asc", "desc"]).default("asc"), showEmptyGroups: z.boolean().default(false) }).optional(),
  savedFilters: z.array(SavedViewFilterSchema).max(20).default([]),
  search: z.strictObject({
    enabled: z.boolean().default(true),
    fieldKeys: z.array(fieldKeySchema).max(25).default(["record"]),
    placeholder: z.string().trim().max(120).default("Search records…"),
  }).default({ enabled: true, fieldKeys: ["record"], placeholder: "Search records…" }),
  pagination: z.strictObject({ pageSize: z.number().int().min(5).max(100).default(25) }).default({ pageSize: 25 }),
  branchFiltering: z.strictObject({
    enabled: z.boolean().default(false),
    required: z.boolean().default(false),
    defaultBranchId: z.uuid().optional(),
  }).default({ enabled: false, required: false }),
}).superRefine((configuration, context) => {
  const savedKeys = configuration.savedFilters.map((filter) => filter.key);
  if (new Set(savedKeys).size !== savedKeys.length) context.addIssue({ code: "custom", path: ["savedFilters"], message: "Saved filter keys must be unique." });
  if (configuration.type === "kanban" && !configuration.grouping) context.addIssue({ code: "custom", path: ["grouping"], message: "Kanban views require grouping." });
  if (!configuration.branchFiltering.enabled && (configuration.branchFiltering.required || configuration.branchFiltering.defaultBranchId)) {
    context.addIssue({ code: "custom", path: ["branchFiltering"], message: "Enable branch filtering before configuring it." });
  }
});

export const SaveViewInputSchema = z.strictObject({
  viewDefinitionId: z.uuid().optional(),
  objectDefinitionId: z.uuid(),
  key: ObjectKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  scope: z.enum(["personal", "shared"]).default("personal"),
  configuration: ViewConfigurationSchema,
});

export const ViewRuntimeInputSchema = z.strictObject({
  search: z.string().trim().max(200).optional(),
  branchId: z.uuid().optional(),
  savedFilterKey: ObjectKeySchema.optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

export type ViewConfiguration = z.infer<typeof ViewConfigurationSchema>;
export type SaveViewInput = z.input<typeof SaveViewInputSchema>;
