import "server-only";

import type { Permission } from "@negosyo-os/core/permissions";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";

import {
  requireMembershipRecord,
  requirePermissionResult,
  type OrganizationAuthorizationContext,
} from "./authorization-policy";
import { requireUserFromClaims, type AuthenticatedUser } from "./identity";
import {
  AuthorizationContextSchema,
  evaluateCapabilityResult,
  type AuthorizationContext,
} from "./capability";
import { createClient, type ServerSupabaseClient } from "./supabase/server";

export async function requireAuthenticatedUser(
  client?: ServerSupabaseClient,
): Promise<AuthenticatedUser> {
  const supabase = client ?? await createClient();
  return requireUserFromClaims(await supabase.auth.getClaims());
}

export async function requireOrganizationMembership(
  organizationId: string,
  client?: ServerSupabaseClient,
): Promise<OrganizationAuthorizationContext> {
  const supabase = client ?? await createClient();
  const user = await requireAuthenticatedUser(supabase);
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("id, organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return requireMembershipRecord(data, error, user);
}

export async function requirePermission(
  organizationId: string,
  permission: Permission,
  client?: ServerSupabaseClient,
): Promise<OrganizationAuthorizationContext> {
  const supabase = client ?? await createClient();
  const context = await requireOrganizationMembership(organizationId, supabase);
  const { data, error } = await supabase.rpc("has_org_permission", {
    requested_organization_id: organizationId,
    requested_permission: permission,
  });

  requirePermissionResult(data, error, permission);

  return context;
}

/**
 * Evaluates a capability for the verified caller in a Business and optional Branch.
 * The supplied user must match the current signed claims; all failures deny access.
 */
export async function can(
  user: AuthenticatedUser,
  permission: Permission,
  context: AuthorizationContext,
  client?: ServerSupabaseClient,
): Promise<boolean> {
  const parsedContext = AuthorizationContextSchema.safeParse(context);
  if (!parsedContext.success) return false;

  const supabase = client ?? await createClient();
  let authenticatedUser: AuthenticatedUser;
  try {
    authenticatedUser = await requireAuthenticatedUser(supabase);
  } catch {
    return false;
  }

  const { data, error } = await supabase.rpc("can_business_permission", {
    requested_organization_id: parsedContext.data.businessId,
    requested_permission: permission,
    ...(parsedContext.data.branchId
      ? { requested_branch_id: parsedContext.data.branchId }
      : {}),
  });

  if (error) {
    logger.warn("Capability evaluation failed closed", {
      businessId: parsedContext.data.businessId,
      permission,
      authErrorCode: error.code,
    });
  }

  return evaluateCapabilityResult(authenticatedUser.id, user.id, data, error);
}

export async function requireCapability(
  user: AuthenticatedUser,
  permission: Permission,
  context: AuthorizationContext,
  client?: ServerSupabaseClient,
): Promise<void> {
  if (!await can(user, permission, context, client)) {
    throw new AppError({
      code: ERROR_CODES.permissionDenied,
      message: "You do not have permission to perform this action.",
      status: 403,
      details: { permission },
    });
  }
}
