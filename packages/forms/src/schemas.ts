import { ObjectKeySchema } from "@negosyo-os/objects";
import { z } from "zod";

import { FORM_CONDITION_OPERATORS, FORM_MODES } from "./models";

const labelSchema = z.string().trim().min(1).max(120);
const attributeValueSchema = z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(z.string()).max(100),
]);

export const FormIdSchema = z.uuid();

export const FormConditionSchema = z.strictObject({
  sourceFieldId: z.uuid(),
  operator: z.enum(FORM_CONDITION_OPERATORS),
  value: attributeValueSchema.optional(),
}).superRefine((condition, context) => {
  const needsValue = condition.operator === "equals" || condition.operator === "not_equals";
  if (needsValue && condition.value === undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: "This operator requires a comparison value." });
  }
  if (!needsValue && condition.value !== undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: "Empty checks cannot include a value." });
  }
});

export const FormVisibilityRuleSchema = z.strictObject({
  logic: z.enum(["all", "any"]),
  conditions: z.array(FormConditionSchema).min(1).max(10),
});

export const FormLayoutFieldSchema = z.strictObject({
  fieldId: z.uuid(),
  width: z.enum(["full", "half"]).default("full"),
  required: z.boolean().default(false),
  readOnly: z.boolean().default(false),
  defaultValue: attributeValueSchema.optional(),
  visibilityRule: FormVisibilityRuleSchema.optional(),
});

export const FormSectionSchema = z.strictObject({
  key: ObjectKeySchema,
  title: labelSchema,
  description: z.string().trim().max(500).default(""),
  columns: z.union([z.literal(1), z.literal(2)]).default(1),
  fields: z.array(FormLayoutFieldSchema).min(1).max(100),
});

export const FormLayoutInputSchema = z.strictObject({
  sections: z.array(FormSectionSchema).min(1).max(20),
}).superRefine((layout, context) => {
  const sectionKeys = layout.sections.map((section) => section.key);
  if (new Set(sectionKeys).size !== sectionKeys.length) {
    context.addIssue({ code: "custom", path: ["sections"], message: "Section keys must be unique." });
  }
  const encountered = new Set<string>();
  let count = 0;
  layout.sections.forEach((section, sectionIndex) => {
    section.fields.forEach((field, fieldIndex) => {
      count += 1;
      if (encountered.has(field.fieldId)) {
        context.addIssue({ code: "custom", path: ["sections", sectionIndex, "fields", fieldIndex, "fieldId"], message: "A field can appear only once." });
      }
      for (const condition of field.visibilityRule?.conditions ?? []) {
        if (!encountered.has(condition.sourceFieldId)) {
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "visibilityRule"],
            message: "Visibility rules may reference only fields placed earlier in the form.",
          });
        }
      }
      encountered.add(field.fieldId);
    });
  });
  if (count > 200) context.addIssue({ code: "custom", path: ["sections"], message: "A form can contain at most 200 fields." });
});

const formBaseSchema = z.strictObject({
  objectDefinitionId: z.uuid(),
  key: ObjectKeySchema,
  name: labelSchema,
  description: z.string().trim().max(500).default(""),
  mode: z.enum(FORM_MODES),
  layout: FormLayoutInputSchema,
});

export const CreateFormInputSchema = formBaseSchema;
export const UpdateFormInputSchema = formBaseSchema.extend({ formDefinitionId: z.uuid() });
export const ArchiveFormInputSchema = z.strictObject({ formDefinitionId: z.uuid(), objectDefinitionId: z.uuid() });
export const SaveFormRecordInputSchema = z.strictObject({
  formDefinitionId: z.uuid(),
  recordId: z.uuid().optional(),
  branchId: z.uuid().nullable().default(null),
  attributes: z.record(ObjectKeySchema, z.unknown()),
});

export type FormLayoutInput = z.infer<typeof FormLayoutInputSchema>;
export type CreateFormInput = z.input<typeof CreateFormInputSchema>;
export type UpdateFormInput = z.input<typeof UpdateFormInputSchema>;
export type ArchiveFormInput = z.input<typeof ArchiveFormInputSchema>;
export type SaveFormRecordInput = z.input<typeof SaveFormRecordInputSchema>;
