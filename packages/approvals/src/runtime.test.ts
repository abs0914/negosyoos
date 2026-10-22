import { describe, expect, it } from "vitest";
import type { ApprovalStep } from "./models";
import { canDecideApprovalStep, nextApprovalStep } from "./runtime";
const step = (overrides: Partial<ApprovalStep>): ApprovalStep => ({ id: "10000000-0000-4000-8000-000000000001", businessId: "10000000-0000-4000-8000-000000000002", approvalRequestId: "10000000-0000-4000-8000-000000000003", key: "manager", name: "Manager", position: 0, approverType: "role", approverUserId: null, approverRoleKey: "manager", status: "pending", activatedAt: "2026-01-01T00:00:00Z", completedAt: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", ...overrides });
describe("approval routing", () => {
  it("authorizes the assigned user or role only on the active step", () => { expect(canDecideApprovalStep(step({}), "u1", ["manager"])).toBe(true); expect(canDecideApprovalStep(step({ status: "waiting" }), "u1", ["manager"])).toBe(false); });
  it("selects the next waiting step by position", () => expect(nextApprovalStep([step({ position: 2, status: "waiting" }), step({ position: 1, key: "second", status: "waiting" })], 0)?.key).toBe("second"));
});
