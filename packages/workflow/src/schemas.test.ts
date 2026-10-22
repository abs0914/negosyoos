import { describe, expect, it } from "vitest";
import { SaveWorkflowInputSchema } from "./schemas";

const valid = { key: "approve_large_discount", name: "Approve large discount", status: "active", configuration: { trigger: { type: "record.updated", objectDefinitionId: "10000000-0000-4000-8000-000000000001" }, conditions: { logic: "all", conditions: [{ fieldKey: "discount_percentage", operator: "greater_than", value: 10 }] }, actions: [{ key: "manager_approval", name: "Request Store Manager approval", type: "request_approval", approverRoleKey: "manager", title: "Approve quotation discount" }] } };
describe("workflow schemas", () => {
  it("accepts the discount approval workflow and applies retry defaults", () => expect(SaveWorkflowInputSchema.parse(valid).configuration.retryPolicy.maxAttempts).toBe(3));
  it("rejects arbitrary code and unknown action properties", () => {
    expect(() => SaveWorkflowInputSchema.parse({ ...valid, javascript: "eval(input)" })).toThrow();
    expect(() => SaveWorkflowInputSchema.parse({ ...valid, configuration: { ...valid.configuration, actions: [{ ...valid.configuration.actions[0], sql: "update records" }] } })).toThrow();
  });
  it("requires values for comparisons but not empty checks", () => {
    expect(() => SaveWorkflowInputSchema.parse({ ...valid, configuration: { ...valid.configuration, conditions: { logic: "all", conditions: [{ fieldKey: "status", operator: "equals" }] } } })).toThrow();
    expect(SaveWorkflowInputSchema.parse({ ...valid, configuration: { ...valid.configuration, conditions: { logic: "all", conditions: [{ fieldKey: "status", operator: "is_empty" }] } } }).configuration.conditions.conditions).toHaveLength(1);
  });
});
