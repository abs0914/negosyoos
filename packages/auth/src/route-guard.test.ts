import { describe, expect, it } from "vitest";

import { isProtectedRoute, loginRedirectPath, safeRedirectPath } from "./route-guard";

describe("authentication route guards", () => {
  it("protects account and dashboard route trees only", () => {
    expect(isProtectedRoute("/account")).toBe(true);
    expect(isProtectedRoute("/account/password")).toBe(true);
    expect(isProtectedRoute("/dashboard/branches")).toBe(true);
    expect(isProtectedRoute("/business/5d907eee-8c8c-4ee1-a0a4-a45c49aee4c6")).toBe(true);
    expect(isProtectedRoute("/accounting")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
  });

  it("rejects open redirects", () => {
    expect(safeRedirectPath("/dashboard?tab=1")).toBe("/dashboard?tab=1");
    expect(safeRedirectPath("https://attacker.example")).toBe("/dashboard");
    expect(safeRedirectPath("//attacker.example")).toBe("/dashboard");
    expect(safeRedirectPath("/\\attacker.example")).toBe("/dashboard");
  });

  it("preserves a protected destination in the login redirect", () => {
    expect(loginRedirectPath("/account", "?tab=profile"))
      .toBe("/login?next=%2Faccount%3Ftab%3Dprofile");
  });
});
