import { describe, expect, it } from "vitest";

import { AuthorizationContextSchema, evaluateCapabilityResult } from "./capability";

describe("capability authorization", () => {
  it("accepts a valid Business and optional Branch context", () => {
    expect(AuthorizationContextSchema.safeParse({
      businessId: "10000000-0000-4000-8000-000000000001",
      branchId: "20000000-0000-4000-8000-000000000002",
    }).success).toBe(true);
  });

  it("fails closed when user identity differs", () => {
    expect(evaluateCapabilityResult("user-a", "user-b", true, null)).toBe(false);
  });

  it("fails closed on database errors or non-true results", () => {
    expect(evaluateCapabilityResult("user-a", "user-a", false, null)).toBe(false);
    expect(evaluateCapabilityResult("user-a", "user-a", true, new Error("failed"))).toBe(false);
    expect(evaluateCapabilityResult("user-a", "user-a", true, null)).toBe(true);
  });
});
