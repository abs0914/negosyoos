import { z } from "zod";

import { FIELD_TYPES, type FieldOption, type FieldValidation, type ObjectAttributeValue } from "./models";

export const ObjectKeySchema = z.string().trim().toLowerCase()
  .regex(/^[a-z][a-z0-9_]*$/).max(64);
export const ObjectIdSchema = z.uuid();

const labelSchema = z.string().trim().min(1).max(120);

export const FieldOptionSchema = z.strictObject({
  value: ObjectKeySchema,
  label: labelSchema,
});

const attributeValueSchema = z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(z.string()).max(100),
]);

export const ObjectAttributesStorageSchema = z.record(ObjectKeySchema, attributeValueSchema);

export const FieldValidationSchema = z.strictObject({
  minLength: z.number().int().min(0).max(10_000).optional(),
  maxLength: z.number().int().min(1).max(10_000).optional(),
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
}).refine(
  (validation) => validation.minLength === undefined || validation.maxLength === undefined || validation.minLength <= validation.maxLength,
  "Minimum length cannot exceed maximum length.",
).refine(
  (validation) => validation.minimum === undefined || validation.maximum === undefined || validation.minimum <= validation.maximum,
  "Minimum cannot exceed maximum.",
);

export const FieldStorageConfigSchema = z.strictObject({
  defaultValue: attributeValueSchema.optional(),
  placeholder: z.string().trim().max(200).optional(),
  helpText: z.string().trim().max(500).optional(),
  options: z.array(FieldOptionSchema).max(100).default([]),
  validation: FieldValidationSchema.default({}),
  visibility: z.enum(["visible", "hidden"]).default("visible"),
  readOnly: z.boolean().default(false),
  relationObjectId: z.uuid().optional(),
});

export const CreateObjectInputSchema = z.strictObject({
  key: ObjectKeySchema,
  singularLabel: labelSchema,
  pluralLabel: labelSchema,
  description: z.string().trim().max(500).default(""),
});

const FieldInputBaseSchema = z.strictObject({
  label: labelSchema,
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  defaultValue: attributeValueSchema.optional(),
  placeholder: z.string().trim().max(200).optional(),
  helpText: z.string().trim().max(500).optional(),
  options: z.array(FieldOptionSchema).max(100).default([]),
  validation: FieldValidationSchema.default({}),
  visibility: z.enum(["visible", "hidden"]).default("visible"),
  readOnly: z.boolean().default(false),
  relationObjectId: z.uuid().optional(),
});

function validateFieldDefinition(
  field: z.infer<typeof FieldInputBaseSchema>,
  context: z.RefinementCtx,
) {
  const usesOptions = ["select", "multiselect", "status"].includes(field.type);
  if (new Set(field.options.map((option) => option.value)).size !== field.options.length) {
    context.addIssue({ code: "custom", path: ["options"], message: "Option values must be unique." });
  }
  if (usesOptions && field.options.length === 0) {
    context.addIssue({ code: "custom", path: ["options"], message: "This field type requires options." });
  }
  if (!usesOptions && field.options.length > 0) {
    context.addIssue({ code: "custom", path: ["options"], message: "Options are not supported for this field type." });
  }
  if (field.type === "relation" && !field.relationObjectId) {
    context.addIssue({ code: "custom", path: ["relationObjectId"], message: "Relation fields require a target object." });
  }
  if (field.type !== "relation" && field.relationObjectId) {
    context.addIssue({ code: "custom", path: ["relationObjectId"], message: "Only relation fields can have a target object." });
  }
  if (field.unique && ["multiselect", "attachment"].includes(field.type)) {
    context.addIssue({ code: "custom", path: ["unique"], message: "Array fields cannot be unique." });
  }
  if (field.readOnly && field.required && field.defaultValue === undefined) {
    context.addIssue({ code: "custom", path: ["defaultValue"], message: "A required read-only field needs a default value." });
  }
  if (field.defaultValue !== undefined) {
    try {
      validateSingleFieldValue(field, field.defaultValue);
    } catch {
      context.addIssue({ code: "custom", path: ["defaultValue"], message: "Default value does not match the field type." });
    }
  }
}

export const CreateFieldInputSchema = FieldInputBaseSchema.extend({
  objectDefinitionId: z.uuid(),
  key: ObjectKeySchema,
}).superRefine(validateFieldDefinition);

export const UpdateFieldInputSchema = FieldInputBaseSchema.extend({
  objectDefinitionId: z.uuid(),
  fieldId: z.uuid(),
}).superRefine(validateFieldDefinition);

export const ReorderFieldsInputSchema = z.strictObject({
  objectDefinitionId: z.uuid(),
  fieldIds: z.array(z.uuid()).min(1).max(200)
    .refine((ids) => new Set(ids).size === ids.length, "Field order must not contain duplicates."),
});

export const ArchiveFieldInputSchema = z.strictObject({
  objectDefinitionId: z.uuid(),
  fieldId: z.uuid(),
});

export const SaveObjectRecordInputSchema = z.strictObject({
  objectDefinitionId: z.uuid(),
  recordId: z.uuid().optional(),
  branchId: z.uuid().nullable().default(null),
  attributes: z.record(ObjectKeySchema, z.unknown()),
});

export const RecordCursorSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T[^|]+\|[0-9a-f-]{36}$/).max(100);

function stringValidator(field: z.infer<typeof FieldInputBaseSchema>): z.ZodType<string> {
  let validator = z.string();
  if (field.validation.minLength !== undefined) validator = validator.min(field.validation.minLength);
  if (field.validation.maxLength !== undefined) validator = validator.max(field.validation.maxLength);
  return validator;
}

function numberValidator(field: z.infer<typeof FieldInputBaseSchema>): z.ZodType<number> {
  let validator = z.number().finite();
  if (field.type === "percentage") validator = validator.min(0).max(100);
  if (field.validation.minimum !== undefined) validator = validator.min(field.validation.minimum);
  if (field.validation.maximum !== undefined) validator = validator.max(field.validation.maximum);
  return validator;
}

export function validateSingleFieldValue(
  field: { type: (typeof FIELD_TYPES)[number]; options: readonly FieldOption[]; validation: FieldValidation },
  value: unknown,
): ObjectAttributeValue {
  switch (field.type) {
    case "text":
    case "textarea":
      return stringValidator(field as z.infer<typeof FieldInputBaseSchema>).parse(value);
    case "phone":
      return stringValidator(field as z.infer<typeof FieldInputBaseSchema>)
        .refine((phone) => /^\+?[0-9 ()-]{7,20}$/.test(phone), "Invalid phone number.").parse(value);
    case "email":
      return z.email().max(field.validation.maxLength ?? 320).parse(value);
    case "url":
      return z.url().max(field.validation.maxLength ?? 2_000).parse(value);
    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
        const parsed = new Date(`${date}T00:00:00Z`);
        return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
      }, "Invalid date.").parse(value);
    case "datetime":
      return z.iso.datetime({ offset: true }).parse(value);
    case "number":
    case "decimal":
    case "currency":
    case "percentage":
      return numberValidator(field as z.infer<typeof FieldInputBaseSchema>).parse(value);
    case "boolean":
      return z.boolean().parse(value);
    case "select":
    case "status":
      return z.string().refine((item) => field.options.some((option) => option.value === item), "Unknown option.").parse(value);
    case "multiselect":
      return z.array(z.string()).max(100)
        .refine((items) => new Set(items).size === items.length, "Selections must be unique.")
        .refine((items) => items.every((item) => field.options.some((option) => option.value === item)), "Unknown option.")
        .parse(value);
    case "user":
    case "branch":
    case "relation":
      return z.uuid().parse(value);
    case "attachment":
      return z.array(z.string().trim().min(1).max(1_024)).max(20).parse(value);
  }
}

export type CreateObjectInput = z.input<typeof CreateObjectInputSchema>;
export type CreateFieldInput = z.input<typeof CreateFieldInputSchema>;
export type UpdateFieldInput = z.input<typeof UpdateFieldInputSchema>;
export type ReorderFieldsInput = z.input<typeof ReorderFieldsInputSchema>;
export type ArchiveFieldInput = z.input<typeof ArchiveFieldInputSchema>;
export type SaveObjectRecordInput = z.input<typeof SaveObjectRecordInputSchema>;
