import { z } from "zod";

import type { FieldDefinition, ObjectAttributeValue } from "./models";
import { validateSingleFieldValue } from "./schemas";

function coerceValue(field: FieldDefinition, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (field.type === "boolean" && typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  if (["number", "decimal", "currency", "percentage"].includes(field.type)
    && typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  if (["multiselect", "attachment"].includes(field.type) && typeof value === "string") {
    return value === "" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value;
}

export function validateRecordAttributes(
  fields: readonly FieldDefinition[],
  input: Readonly<Record<string, unknown>>,
): Record<string, ObjectAttributeValue> {
  const activeFields = fields.filter((field) => field.status === "active");
  const allowedKeys = new Set(activeFields.filter((field) => field.visibility === "visible" && !field.readOnly).map((field) => field.key));
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) throw new z.ZodError([{ code: "unrecognized_keys", keys: [key], path: [], message: "Unrecognized key" }]);
  }

  const result: Record<string, ObjectAttributeValue> = {};
  for (const field of activeFields) {
    const writable = field.visibility === "visible" && !field.readOnly;
    const supplied = writable ? coerceValue(field, input[field.key]) : undefined;
    const value = supplied === "" && field.type !== "text" && field.type !== "textarea"
      ? undefined
      : supplied;
    const effectiveValue = value ?? field.defaultValue;
    if (effectiveValue === undefined) {
      if (field.required) {
        throw new z.ZodError([{ code: "custom", path: [field.key], message: `${field.label} is required.` }]);
      }
      continue;
    }
    result[field.key] = validateSingleFieldValue(field, effectiveValue);
  }
  return result;
}
