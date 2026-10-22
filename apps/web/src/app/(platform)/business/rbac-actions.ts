"use server";

import { revalidatePath } from "next/cache";

import {
  AssignMemberAccessInputSchema,
  CreateRoleInputSchema,
  UpdateRolePermissionsInputSchema,
} from "@negosyo-os/rbac";
import {
  assignMemberAccess,
  createCustomRole,
  setCustomRolePermissions,
} from "@negosyo-os/rbac/server";
import { logger } from "@negosyo-os/core/logging";

export interface RbacActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const rbacLogger = logger.child({ domain: "rbac" });

function stringValues(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((value): value is string => typeof value === "string");
}

export async function createRoleAction(
  businessId: string,
  _previousState: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const parsed = CreateRoleInputSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description"),
    permissions: stringValues(formData, "permissions"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Check the role details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    await createCustomRole(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/roles`);
    return { status: "success", message: "Custom role created." };
  } catch (error) {
    rbacLogger.error("Custom role creation failed", error, { businessId });
    return { status: "error", message: "The role could not be created." };
  }
}

export async function updateRolePermissionsAction(
  businessId: string,
  roleId: string,
  _previousState: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const parsed = UpdateRolePermissionsInputSchema.safeParse({
    roleId,
    permissions: stringValues(formData, "permissions"),
  });
  if (!parsed.success) return { status: "error", message: "Select at least one valid permission." };
  try {
    await setCustomRolePermissions(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/roles`);
    return { status: "success", message: "Role permissions saved." };
  } catch (error) {
    rbacLogger.error("Role permission update failed", error, { businessId, roleId });
    return { status: "error", message: "Role permissions could not be saved." };
  }
}

export async function assignMemberAccessAction(
  businessId: string,
  membershipId: string,
  _previousState: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const parsed = AssignMemberAccessInputSchema.safeParse({
    membershipId,
    roleIds: stringValues(formData, "roleIds"),
    branchAccessMode: formData.get("branchAccessMode"),
    branchIds: stringValues(formData, "branchIds"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Choose at least one role and valid Branch access." };
  }
  try {
    await assignMemberAccess(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/roles`);
    return { status: "success", message: "Member access saved." };
  } catch (error) {
    rbacLogger.error("Member access update failed", error, { businessId, membershipId });
    return { status: "error", message: "Member access could not be saved." };
  }
}
