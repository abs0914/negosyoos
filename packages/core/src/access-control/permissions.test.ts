import { describe, expect, it } from "vitest";

import { ALL_PERMISSIONS, isPermission, PERMISSIONS } from "./permissions";

describe("permission catalog", () => {
  it("contains unique domain.action keys", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    expect(ALL_PERMISSIONS.every((permission) => /^[a-z][a-z-]*\.[a-z][a-z-]*$/.test(permission))).toBe(true);
  });

  it("narrows known permission values", () => {
    expect(isPermission(PERMISSIONS.memberManage)).toBe(true);
    expect(isPermission("billing.delete-everything")).toBe(false);
  });
});
