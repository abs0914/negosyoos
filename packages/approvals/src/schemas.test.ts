import { describe, expect, it } from "vitest";
import { CreateApprovalRequestInputSchema } from "./schemas";

describe("approval schemas", () => {
  it("supports single, role-based, and multi-step approval", () => {
    expect(CreateApprovalRequestInputSchema.parse({ category: "discount", title: "Discount approval", steps: [{ key: "owner", name: "Owner", approverUserId: "10000000-0000-4000-8000-000000000001" }] }).steps).toHaveLength(1);
    expect(CreateApprovalRequestInputSchema.parse({ category: "expense", title: "Expense approval", steps: [{ key: "manager", name: "Manager", approverRoleKey: "manager" }, { key: "owner", name: "Owner", approverRoleKey: "owner" }] }).steps).toHaveLength(2);
  });
  it("requires exactly one approver per step and rejects executable properties", () => {
    expect(() => CreateApprovalRequestInputSchema.parse({ category: "refund", title: "Refund", steps: [{ key: "bad", name: "Bad" }] })).toThrow();
    expect(() => CreateApprovalRequestInputSchema.parse({ category: "refund", title: "Refund", javascript: "approve()", steps: [{ key: "manager", name: "Manager", approverRoleKey: "manager" }] })).toThrow();
  });
});
