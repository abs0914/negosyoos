import {
  validateRecordAttributes,
  validateSingleFieldValue,
  type FieldDefinition,
  type ObjectAttributeValue,
} from "@negosyo-os/objects";
import { z } from "zod";

import type { FormLayout, FormLayoutField, FormMode, FormVisibilityRule } from "./models";
import { FormLayoutInputSchema, type FormLayoutInput } from "./schemas";

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

export function evaluateVisibilityRule(
  rule: FormVisibilityRule | undefined,
  valuesByFieldId: Readonly<Record<string, unknown>>,
): boolean {
  if (!rule) return true;
  const matches = rule.conditions.map((condition) => {
    const actual = valuesByFieldId[condition.sourceFieldId];
    switch (condition.operator) {
      case "equals": return Array.isArray(actual)
        ? actual.includes(String(condition.value))
        : actual === condition.value;
      case "not_equals": return Array.isArray(actual)
        ? !actual.includes(String(condition.value))
        : actual !== condition.value;
      case "is_empty": return isEmpty(actual);
      case "is_not_empty": return !isEmpty(actual);
    }
  });
  return rule.logic === "all" ? matches.every(Boolean) : matches.some(Boolean);
}

function coerceValue(field: FieldDefinition, value: unknown): unknown {
  if (field.type === "boolean" && typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  if (["number", "decimal", "currency", "percentage"].includes(field.type)
    && typeof value === "string" && value.trim() !== "") return Number(value);
  if (["multiselect", "attachment"].includes(field.type) && typeof value === "string") {
    return value === "" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value;
}

function issue(path: PropertyKey[], message: string): never {
  throw new z.ZodError([{ code: "custom", path, message }]);
}

export function validateFormLayoutAgainstFields(
  layoutInput: FormLayoutInput,
  fields: readonly FieldDefinition[],
  mode: FormMode,
): FormLayoutInput {
  const layout = FormLayoutInputSchema.parse(layoutInput);
  const active = fields.filter((field) => field.status === "active");
  const byId = new Map(active.map((field) => [field.id, field]));
  const placed = new Set<string>();
  for (const section of layout.sections) {
    for (const item of section.fields) {
      const field = byId.get(item.fieldId);
      if (!field) issue(["sections", section.key, item.fieldId], "The form contains an unknown or archived field.");
      if (field.visibility === "hidden") issue(["sections", section.key, item.fieldId], "Object-level hidden fields cannot be placed on a form.");
      if (item.defaultValue !== undefined) {
        if (field.readOnly) issue(["sections", section.key, item.fieldId, "defaultValue"], "Object-level read-only defaults cannot be overridden by a form.");
        try { validateSingleFieldValue(field, item.defaultValue); }
        catch { issue(["sections", section.key, item.fieldId, "defaultValue"], "The form default does not match the field definition."); }
      }
      if (field.required && item.visibilityRule && field.defaultValue === undefined && item.defaultValue === undefined) {
        issue(["sections", section.key, item.fieldId, "visibilityRule"], "A required object field needs a default before it can be conditionally hidden.");
      }
      for (const condition of item.visibilityRule?.conditions ?? []) {
        const source = byId.get(condition.sourceFieldId);
        if (!source) issue(["sections", section.key, item.fieldId, "visibilityRule"], "A rule references an unknown field.");
        if (condition.value !== undefined) {
          try { validateSingleFieldValue(source, condition.value); }
          catch { issue(["sections", section.key, item.fieldId, "visibilityRule"], "A rule comparison does not match its source field."); }
        }
      }
      placed.add(field.id);
    }
  }
  if (mode === "create") {
    for (const field of active) {
      if (field.required && field.visibility === "visible" && !field.readOnly
        && field.defaultValue === undefined && !placed.has(field.id)) {
        issue(["sections"], `${field.label} is required by the object and must be included in create forms.`);
      }
    }
  }
  return layout;
}

export function validateFormSubmission(
  layout: Pick<FormLayout, "sections">,
  fields: readonly FieldDefinition[],
  mode: FormMode,
  input: Readonly<Record<string, unknown>>,
  existingAttributes: Readonly<Record<string, ObjectAttributeValue>> = {},
): Record<string, ObjectAttributeValue> {
  const active = fields.filter((field) => field.status === "active");
  const byId = new Map(active.map((field) => [field.id, field]));
  const layoutItems = layout.sections.flatMap((section) => section.fields);
  const layoutFields = new Map(layoutItems.map((item) => [byId.get(item.fieldId)?.key, item]));
  for (const key of Object.keys(input)) {
    if (!layoutFields.has(key)) issue([key], "This field is not part of the selected form.");
  }

  const output: Record<string, ObjectAttributeValue> = {};
  const valuesByFieldId: Record<string, unknown> = {};
  for (const field of active) {
    const existing = existingAttributes[field.key];
    if (existing !== undefined) valuesByFieldId[field.id] = existing;
    if (mode === "edit" && existing !== undefined && field.visibility === "visible" && !field.readOnly) {
      output[field.key] = existing;
    }
  }

  for (const item of layoutItems) {
    const field = byId.get(item.fieldId);
    if (!field) issue([item.fieldId], "The form contains an unavailable field.");
    const visible = evaluateVisibilityRule(item.visibilityRule, valuesByFieldId);
    const supplied = input[field.key];
    if (!visible && supplied !== undefined) issue([field.key], "A hidden conditional field cannot be submitted.");
    if ((item.readOnly || field.readOnly) && supplied !== undefined) issue([field.key], "A read-only field cannot be submitted.");

    let effective: unknown;
    if (visible && !item.readOnly && !field.readOnly && supplied !== undefined) effective = coerceValue(field, supplied);
    else if (mode === "edit") effective = existingAttributes[field.key];
    else effective = item.defaultValue ?? field.defaultValue;

    if (visible && (field.required || item.required) && isEmpty(effective)) issue([field.key], `${field.label} is required.`);
    if ((effective === "" && !["text", "textarea"].includes(field.type)) || effective === undefined) {
      delete output[field.key];
      delete valuesByFieldId[field.id];
      continue;
    }
    const validated = validateSingleFieldValue(field, effective);
    valuesByFieldId[field.id] = validated;
    if (field.visibility === "visible" && !field.readOnly) output[field.key] = validated;
  }

  return validateRecordAttributes(active, output);
}

export function findLayoutField(layout: Pick<FormLayout, "sections">, fieldId: string): FormLayoutField | undefined {
  return layout.sections.flatMap((section) => section.fields).find((field) => field.fieldId === fieldId);
}
