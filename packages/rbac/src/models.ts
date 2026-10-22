import type { Permission } from "@negosyo-os/core/permissions";

export interface PermissionDefinition {
  id: string;
  key: Permission;
  domain: string;
  action: string;
  description: string;
}

export interface Role {
  id: string;
  businessId: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: readonly Permission[];
}

export interface MemberAccess {
  membershipId: string;
  businessId: string;
  userId: string;
  status: "invited" | "active" | "suspended";
  branchAccessMode: "all" | "selected";
  roleIds: readonly string[];
  branchIds: readonly string[];
  isOwner: boolean;
}
