import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import type { Permission } from "@negosyo-os/core/permissions";

import type { AuthenticatedUser } from "./identity";

export interface MembershipRecord {
  id: string;
  organization_id: string;
}

export interface OrganizationAuthorizationContext {
  organizationId: string;
  membershipId: string;
  user: AuthenticatedUser;
}

export function requireMembershipRecord(
  membership: MembershipRecord | null,
  error: unknown,
  user: AuthenticatedUser,
): OrganizationAuthorizationContext {
  if (error || !membership) {
    throw new AppError({
      code: ERROR_CODES.permissionDenied,
      message: "You do not have access to this organization.",
      status: 403,
      cause: error,
    });
  }

  return {
    organizationId: membership.organization_id,
    membershipId: membership.id,
    user,
  };
}

export function requirePermissionResult(
  granted: boolean | null,
  error: unknown,
  permission: Permission,
): void {
  if (error || granted !== true) {
    throw new AppError({
      code: ERROR_CODES.permissionDenied,
      message: "You do not have permission to perform this action.",
      status: 403,
      cause: error,
      details: { permission },
    });
  }
}
