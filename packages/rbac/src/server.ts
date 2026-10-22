import "server-only";

import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { createClient, type ServerSupabaseClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { isPermission, PERMISSIONS, type Permission } from "@negosyo-os/core/permissions";

import type { MemberAccess, PermissionDefinition, Role } from "./models";
import {
  AssignMemberAccessInputSchema,
  CreateRoleInputSchema,
  UpdateRolePermissionsInputSchema,
  type AssignMemberAccessInput,
  type CreateRoleInput,
  type UpdateRolePermissionsInput,
} from "./schemas";

function databaseError(message: string, cause: unknown): AppError {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

async function requireRbacManager(
  businessId: string,
  client: ServerSupabaseClient,
): Promise<void> {
  const user = await requireAuthenticatedUser(client);
  await requireCapability(user, PERMISSIONS.usersManage, { businessId }, client);
}

export async function listPermissions(businessId: string): Promise<readonly PermissionDefinition[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireRbacManager(id, supabase);
  const { data, error } = await supabase.from("permissions").select("id, key, domain, action, description")
    .order("domain").order("action");
  if (error) throw databaseError("Permissions could not be loaded.", error);
  return data.flatMap((permission) => isPermission(permission.key) ? [{
    id: permission.id,
    key: permission.key,
    domain: permission.domain,
    action: permission.action,
    description: permission.description,
  }] : []);
}

export async function listRoles(businessId: string): Promise<readonly Role[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireRbacManager(id, supabase);
  const { data: roles, error: rolesError } = await supabase.from("roles")
    .select("id, organization_id, key, name, description, is_system")
    .eq("organization_id", id).order("is_system", { ascending: false }).order("name");
  if (rolesError) throw databaseError("Roles could not be loaded.", rolesError);
  if (roles.length === 0) return [];

  const roleIds = roles.map((role) => role.id);
  const [{ data: assignments, error: assignmentsError }, { data: permissions, error: permissionsError }] = await Promise.all([
    supabase.from("role_permissions").select("role_id, permission_id").in("role_id", roleIds),
    supabase.from("permissions").select("id, key"),
  ]);
  if (assignmentsError || permissionsError) {
    throw databaseError("Role permissions could not be loaded.", assignmentsError ?? permissionsError);
  }

  const permissionById = new Map(permissions.map((permission) => [permission.id, permission.key]));
  return roles.map((role) => ({
    id: role.id,
    businessId: role.organization_id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.is_system,
    permissions: assignments
      .filter((assignment) => assignment.role_id === role.id)
      .map((assignment) => permissionById.get(assignment.permission_id))
      .filter((permission): permission is Permission => Boolean(permission && isPermission(permission))),
  }));
}

export async function createCustomRole(businessId: string, input: CreateRoleInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = CreateRoleInputSchema.parse(input);
  const supabase = await createClient();
  await requireRbacManager(id, supabase);
  const { data, error } = await supabase.rpc("create_custom_role", {
    requested_organization_id: id,
    requested_key: parsed.key,
    requested_name: parsed.name,
    requested_description: parsed.description,
    requested_permissions: parsed.permissions,
  });
  if (error) throw databaseError("Role could not be created.", error);
  return BusinessIdSchema.parse(data);
}

export async function setCustomRolePermissions(
  businessId: string,
  input: UpdateRolePermissionsInput,
): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = UpdateRolePermissionsInputSchema.parse(input);
  const supabase = await createClient();
  await requireRbacManager(id, supabase);
  const { error } = await supabase.rpc("set_custom_role_permissions", {
    requested_organization_id: id,
    requested_role_id: parsed.roleId,
    requested_permissions: parsed.permissions,
  });
  if (error) throw databaseError("Role permissions could not be saved.", error);
}

export async function listMemberAccess(businessId: string): Promise<readonly MemberAccess[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireRbacManager(id, supabase);
  const { data: memberships, error: membershipsError } = await supabase.from("organization_memberships")
    .select("id, organization_id, user_id, status, branch_access_mode")
    .eq("organization_id", id).order("created_at");
  if (membershipsError) throw databaseError("Members could not be loaded.", membershipsError);
  if (memberships.length === 0) return [];

  const membershipIds = memberships.map((membership) => membership.id);
  const [{ data: roleAssignments, error: roleError }, { data: branchAccess, error: branchError }, { data: ownerRoles, error: ownerError }] = await Promise.all([
    supabase.from("membership_roles").select("membership_id, role_id").in("membership_id", membershipIds),
    supabase.from("membership_branch_access").select("membership_id, branch_id")
      .eq("organization_id", id).in("membership_id", membershipIds),
    supabase.from("roles").select("id").eq("organization_id", id).eq("key", "owner"),
  ]);
  if (roleError || branchError || ownerError) {
    throw databaseError("Member access could not be loaded.", roleError ?? branchError ?? ownerError);
  }
  const ownerRoleIds = new Set(ownerRoles.map((role) => role.id));

  return memberships.map((membership) => {
    const roleIds = roleAssignments.filter((item) => item.membership_id === membership.id)
      .map((item) => item.role_id);
    return {
      membershipId: membership.id,
      businessId: membership.organization_id,
      userId: membership.user_id,
      status: membership.status as MemberAccess["status"],
      branchAccessMode: membership.branch_access_mode as MemberAccess["branchAccessMode"],
      roleIds,
      branchIds: branchAccess.filter((item) => item.membership_id === membership.id)
        .map((item) => item.branch_id),
      isOwner: roleIds.some((roleId) => ownerRoleIds.has(roleId)),
    };
  });
}

export async function assignMemberAccess(
  businessId: string,
  input: AssignMemberAccessInput,
): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = AssignMemberAccessInputSchema.parse(input);
  const supabase = await createClient();
  await requireRbacManager(id, supabase);
  const { error } = await supabase.rpc("assign_member_access", {
    requested_organization_id: id,
    requested_membership_id: parsed.membershipId,
    requested_role_ids: parsed.roleIds,
    requested_branch_access_mode: parsed.branchAccessMode,
    requested_branch_ids: parsed.branchIds,
  });
  if (error) throw databaseError("Member access could not be saved.", error);
}
