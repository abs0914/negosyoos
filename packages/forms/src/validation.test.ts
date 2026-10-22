import type { FieldDefinition, ObjectAttributeValue } from "@negosyo-os/objects";
import { describe, expect, it } from "vitest";

import type { FormLayout } from "./models";
import { FormLayoutInputSchema } from "./schemas";
import { evaluateVisibilityRule, validateFormLayoutAgainstFields, validateFormSubmission } from "./validation";

const objectId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const requiresDeliveryId = "33333333-3333-4333-8333-333333333333";
const addressId = "44444444-4444-4444-8444-444444444444";
const nameId = "55555555-5555-4555-8555-555555555555";

function field(overrides: Partial<FieldDefinition> & Pick<FieldDefinition, "id" | "key" | "label" | "type">): FieldDefinition {
  return {
    businessId, objectDefinitionId: objectId, required: false, unique: false,
    options: [], validation: {}, visibility: "visible", readOnly: false,
    sortOrder: 0, status: "active", createdAt: "2026-08-25T00:00:00Z", updatedAt: "2026-08-25T00:00:00Z",
    ...overrides,
  };
}

const fields = [
  field({ id: nameId, key: "name", label: "Name", type: "text", required: true }),
  field({ id: requiresDeliveryId, key: "requires_delivery", label: "Requires delivery", type: "boolean" }),
  field({ id: addressId, key: "delivery_address", label: "Delivery address", type: "textarea" }),
];

const sections: FormLayout["sections"] = [{
  key: "details", title: "Details", description: "", columns: 2,
  fields: [
    { fieldId: nameId, width: "full", required: false, readOnly: false },
    { fieldId: requiresDeliveryId, width: "half", required: false, readOnly: false, defaultValue: false },
    {
      fieldId: addressId, width: "full", required: true, readOnly: false,
      visibilityRule: { logic: "all", conditions: [{ sourceFieldId: requiresDeliveryId, operator: "equals", value: true }] },
    },
  ],
}];

describe("declarative form rules", () => {
  it("evaluates controlled comparisons without executing code", () => {
    const rule = sections[0]?.fields[2]?.visibilityRule;
    expect(evaluateVisibilityRule(rule, { [requiresDeliveryId]: true })).toBe(true);
    expect(evaluateVisibilityRule(rule, { [requiresDeliveryId]: false })).toBe(false);
  });

  it("rejects unknown keys and forward references", () => {
    const parsed = FormLayoutInputSchema.safeParse({ sections: [{
      ...sections[0],
      fields: [sections[0]?.fields[2], sections[0]?.fields[1]],
    }] });
    expect(parsed.success).toBe(false);
    expect(FormLayoutInputSchema.safeParse({ sections, javascript: "alert(1)" }).success).toBe(false);
  });
});

describe("form metadata and submission validation", () => {
  it("requires object-required fields on create layouts", () => {
    const missingRequired = FormLayoutInputSchema.parse({ sections: [{ ...sections[0]!, fields: sections[0]!.fields.slice(1) }] });
    expect(() => validateFormLayoutAgainstFields(missingRequired, fields, "create"))
      .toThrow(/Name is required/);
  });

  it("validates visible required fields and accepts hidden conditional fields as absent", () => {
    expect(validateFormSubmission({ sections }, fields, "create", { name: "Ana", requires_delivery: "false" }))
      .toEqual({ name: "Ana", requires_delivery: false });
    expect(() => validateFormSubmission({ sections }, fields, "create", { name: "Ana", requires_delivery: "true" }))
      .toThrow(/Delivery address is required/);
    expect(() => validateFormSubmission({ sections }, fields, "create", { name: "", requires_delivery: "false" }))
      .toThrow(/Name is required/);
  });

  it("rejects injected hidden, unknown, and read-only values", () => {
    expect(() => validateFormSubmission({ sections }, fields, "create", {
      name: "Ana", requires_delivery: "false", delivery_address: "Injected",
    })).toThrow(/hidden conditional/);
    expect(() => validateFormSubmission({ sections }, fields, "create", { name: "Ana", admin: true })).toThrow(/not part/);
    const readOnly = [{ ...sections[0]!, fields: [{ ...sections[0]!.fields[0]!, readOnly: true }] }];
    expect(() => validateFormSubmission({ sections: readOnly }, fields, "create", { name: "Injected" })).toThrow(/read-only/);
  });

  it("preserves fields omitted by an edit form", () => {
    const editSections = [{ ...sections[0]!, fields: [sections[0]!.fields[0]!] }];
    const existing: Record<string, ObjectAttributeValue> = { name: "Old", requires_delivery: true, delivery_address: "Cebu" };
    expect(validateFormSubmission({ sections: editSections }, fields, "edit", { name: "New" }, existing))
      .toEqual({ name: "New", requires_delivery: true, delivery_address: "Cebu" });
  });
});
