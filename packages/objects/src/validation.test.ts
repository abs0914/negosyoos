import { describe, expect, it } from "vitest";

import type { FieldDefinition } from "./models";
import { CreateFieldInputSchema } from "./schemas";
import { validateRecordAttributes } from "./validation";

const field = (overrides: Partial<FieldDefinition>): FieldDefinition => ({
  id: "10000000-0000-4000-8000-000000000001",
  businessId: "10000000-0000-4000-8000-000000000002",
  objectDefinitionId: "10000000-0000-4000-8000-000000000003",
  key: "name",
  label: "Name",
  type: "text",
  required: false,
  unique: false,
  options: [],
  validation: {},
  visibility: "visible",
  readOnly: false,
  sortOrder: 0,
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("FieldDefinition", () => {
  it("accepts all supported field types", () => {
    const base = { objectDefinitionId: "10000000-0000-4000-8000-000000000003", key: "custom_field", label: "Custom field" };
    const types = ["text", "textarea", "number", "decimal", "currency", "percentage", "boolean", "date", "datetime", "email", "phone", "url", "user", "branch", "attachment"] as const;
    for (const type of types) expect(CreateFieldInputSchema.parse({ ...base, type }).type).toBe(type);
    expect(CreateFieldInputSchema.parse({ ...base, type: "select", options: [{ value: "new", label: "New" }] }).type).toBe("select");
    expect(CreateFieldInputSchema.parse({ ...base, type: "multiselect", options: [{ value: "vip", label: "VIP" }] }).type).toBe("multiselect");
    expect(CreateFieldInputSchema.parse({ ...base, type: "status", options: [{ value: "active", label: "Active" }] }).type).toBe("status");
    expect(CreateFieldInputSchema.parse({ ...base, type: "relation", relationObjectId: "10000000-0000-4000-8000-000000000004" }).type).toBe("relation");
  });

  it("rejects invalid option and relation configuration", () => {
    const base = { objectDefinitionId: "10000000-0000-4000-8000-000000000003", key: "custom_field", label: "Custom field" };
    expect(() => CreateFieldInputSchema.parse({ ...base, type: "select" })).toThrow();
    expect(() => CreateFieldInputSchema.parse({ ...base, type: "relation" })).toThrow();
    expect(() => CreateFieldInputSchema.parse({ ...base, type: "attachment", unique: true })).toThrow();
  });
});

describe("dynamic record validation", () => {
  const fields = [
    field({ key: "email", label: "Email", type: "email", required: true, unique: true }),
    field({ key: "credit_limit", label: "Credit limit", type: "currency", validation: { minimum: 0 } }),
    field({ key: "discount", label: "Discount", type: "percentage", defaultValue: 0 }),
    field({ key: "subscribed", label: "Subscribed", type: "boolean", defaultValue: false }),
    field({ key: "tags", label: "Tags", type: "multiselect", options: [{ value: "vip", label: "VIP" }] }),
    field({ key: "internal_code", label: "Internal code", type: "text", visibility: "hidden", readOnly: true, defaultValue: "SYSTEM" }),
  ];

  it("coerces form values, applies defaults, and includes protected defaults", () => {
    expect(validateRecordAttributes(fields, { email: "owner@example.test", credit_limit: "1500", tags: ["vip"] })).toEqual({
      email: "owner@example.test",
      credit_limit: 1500,
      discount: 0,
      subscribed: false,
      tags: ["vip"],
      internal_code: "SYSTEM",
    });
  });

  it("coerces checked and unchecked boolean form values", () => {
    expect(validateRecordAttributes(fields, { email: "a@b.com", subscribed: "true" }).subscribed).toBe(true);
    expect(validateRecordAttributes(fields, { email: "a@b.com", subscribed: "false" }).subscribed).toBe(false);
  });

  it("rejects required, range, option, and arbitrary attributes", () => {
    expect(() => validateRecordAttributes(fields, {})).toThrow();
    expect(() => validateRecordAttributes(fields, { email: "bad", discount: 101 })).toThrow();
    expect(() => validateRecordAttributes(fields, { email: "a@b.com", tags: ["unknown"] })).toThrow();
    expect(() => validateRecordAttributes(fields, { email: "a@b.com", sql: "drop table" })).toThrow();
    expect(() => validateRecordAttributes(fields, { email: "a@b.com", internal_code: "ATTACK" })).toThrow();
  });
});
