import { z } from "zod";

import type { ModuleConfigurationSchema, ModuleConfigurationValue } from "./models";

export const ModuleKeySchema = z.string().trim().toLowerCase()
  .regex(/^[a-z][a-z0-9_]*$/).max(64);

const fieldBase = {
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  required: z.boolean().default(false),
};

const StringConfigurationFieldSchema = z.strictObject({
  ...fieldBase,
  type: z.literal("string"),
  default: z.string().optional(),
  minLength: z.number().int().min(0).max(10_000).optional(),
  maxLength: z.number().int().min(1).max(10_000).optional(),
}).refine(
  (field) => field.minLength === undefined || field.maxLength === undefined || field.minLength <= field.maxLength,
  "Minimum length cannot exceed maximum length.",
);

const BooleanConfigurationFieldSchema = z.strictObject({
  ...fieldBase,
  type: z.literal("boolean"),
  default: z.boolean().optional(),
});

const NumberConfigurationFieldSchema = z.strictObject({
  ...fieldBase,
  type: z.enum(["integer", "number"]),
  default: z.number().finite().optional(),
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
}).refine(
  (field) => field.minimum === undefined || field.maximum === undefined || field.minimum <= field.maximum,
  "Minimum cannot exceed maximum.",
);

const EnumConfigurationFieldSchema = z.strictObject({
  ...fieldBase,
  type: z.literal("enum"),
  options: z.array(z.string().trim().min(1).max(100)).min(1).max(100)
    .refine((options) => new Set(options).size === options.length, "Options must be unique."),
  default: z.string().optional(),
}).refine(
  (field) => field.default === undefined || field.options.includes(field.default),
  "Default must be one of the options.",
);

export const ModuleConfigurationFieldSchema = z.union([
  StringConfigurationFieldSchema,
  BooleanConfigurationFieldSchema,
  NumberConfigurationFieldSchema,
  EnumConfigurationFieldSchema,
]);

export const ModuleConfigurationSchemaSchema = z.strictObject({
  properties: z.record(ModuleKeySchema, ModuleConfigurationFieldSchema),
  additionalProperties: z.literal(false),
});

export const ModuleDefinitionSchema = z.strictObject({
  key: ModuleKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  category: z.enum(["sales", "operations", "customers", "finance", "workforce"]),
  dependencies: z.array(ModuleKeySchema).max(20)
    .refine((keys) => new Set(keys).size === keys.length, "Dependencies must be unique."),
  icon: z.string().regex(/^[a-z][a-z0-9-]*$/).max(64),
  minimumPlan: z.enum(["starter", "growth", "pro"]),
  configurationSchema: ModuleConfigurationSchemaSchema,
  version: z.number().int().positive(),
});

export const SetBusinessModuleStateInputSchema = z.strictObject({
  moduleKey: ModuleKeySchema,
  enabled: z.boolean(),
  configuration: z.record(ModuleKeySchema, z.unknown()).default({}),
});

function validatorForField(field: ModuleConfigurationSchema["properties"][string]): z.ZodType {
  let validator: z.ZodType = z.never();
  if (field.type === "string") {
    let stringValidator = z.string();
    if (field.minLength !== undefined) stringValidator = stringValidator.min(field.minLength);
    if (field.maxLength !== undefined) stringValidator = stringValidator.max(field.maxLength);
    validator = stringValidator;
  } else if (field.type === "boolean") {
    validator = z.boolean();
  } else if (field.type === "enum") {
    validator = z.string().refine((value) => field.options.includes(value), "Unknown option.");
  } else if (field.type === "integer") {
    let numberValidator = z.number().int().finite();
    if (field.minimum !== undefined) numberValidator = numberValidator.min(field.minimum);
    if (field.maximum !== undefined) numberValidator = numberValidator.max(field.maximum);
    validator = numberValidator;
  } else if (field.type === "number") {
    let numberValidator = z.number().finite();
    if (field.minimum !== undefined) numberValidator = numberValidator.min(field.minimum);
    if (field.maximum !== undefined) numberValidator = numberValidator.max(field.maximum);
    validator = numberValidator;
  }

  if (field.default !== undefined) return validator.default(field.default);
  return field.required ? validator : validator.optional();
}

export function createModuleConfigurationValidator(schema: ModuleConfigurationSchema) {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(schema.properties)) {
    shape[key] = validatorForField(field);
  }
  return z.strictObject(shape);
}

export function parseModuleConfiguration(
  schema: ModuleConfigurationSchema,
  configuration: unknown,
): Record<string, ModuleConfigurationValue> {
  return createModuleConfigurationValidator(schema).parse(configuration) as Record<string, ModuleConfigurationValue>;
}

export function coerceModuleConfiguration(
  schema: ModuleConfigurationSchema,
  configuration: Readonly<Record<string, unknown>>,
): Record<string, ModuleConfigurationValue> {
  const coerced: Record<string, unknown> = { ...configuration };
  for (const [key, field] of Object.entries(schema.properties)) {
    const value = coerced[key];
    if (value === undefined) continue;
    if (field.type === "boolean" && typeof value === "string") {
      if (value === "true") coerced[key] = true;
      if (value === "false") coerced[key] = false;
    }
    if ((field.type === "integer" || field.type === "number") && typeof value === "string" && value.trim() !== "") {
      coerced[key] = Number(value);
    }
  }
  return parseModuleConfiguration(schema, coerced);
}

export type SetBusinessModuleStateInput = z.input<typeof SetBusinessModuleStateInputSchema>;
