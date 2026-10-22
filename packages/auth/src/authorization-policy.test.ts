import { describe, expect, it } from "vitest";

import { AppError } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";

import { requireMembershipRecord, requirePermissionResult } from "./authorization-policy";

const user = { id: "6c9326d1-2e5f-43cd-a616-5a95113d3148" };

describe("server authorization policy", () => {
  it("builds context only from a server-returned active membership", () => {
    expect(requireMembershipRecord({
      id: "membership-id",
      organization_id: "organization-id",
    }, null, user)).toEqual({
      membershipId: "membership-id",
      organizationId: "organization-id",
      user,
    });
    expect(() => requireMembershipRecord(null, null, user)).toThrow(AppError);
  });

  it("requires an explicit true permission result", () => {
    expect(() => requirePermissionResult(true, null, PERMISSIONS.organizationRead)).not.toThrow();
    expect(() => requirePermissionResult(false, null, PERMISSIONS.organizationRead)).toThrow(AppError);
    expect(() => requirePermissionResult(null, new Error("rpc failed"), PERMISSIONS.organizationRead)).toThrow(AppError);
  });
});
