import { describe, expect, it } from "vitest";

import { AssignMemberAccessInputSchema, CreateRoleInputSchema } from "./schemas";

describe("RBAC input validation", () => {
  it("accepts a custom role with capability permissions", () => {
    const role = CreateRoleInputSchema.parse({
      key: "  floor_supervisor ",
      name: "Floor Supervisor",
      description: "Supervises daily operations",
      permissions: ["sales.read", "sales.create", "inventory.read"],
    });
    expect(role.key).toBe("floor_supervisor");
  });

  it("rejects unknown or duplicate permissions", () => {
    expect(CreateRoleInputSchema.safeParse({
      key: "unsafe",
      name: "Unsafe",
      description: "",
      permissions: ["admin.everything"],
    }).success).toBe(false);
    expect(CreateRoleInputSchema.safeParse({
      key: "duplicate",
      name: "Duplicate",
      description: "",
      permissions: ["sales.read", "sales.read"],
    }).success).toBe(false);
  });

  it("requires at least one selected Branch for scoped access", () => {
    expect(AssignMemberAccessInputSchema.safeParse({
      membershipId: "10000000-0000-4000-8000-000000000001",
      roleIds: ["20000000-0000-4000-8000-000000000002"],
      branchAccessMode: "selected",
      branchIds: [],
    }).success).toBe(false);
  });
});
