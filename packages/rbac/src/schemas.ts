import { z } from "zod";

import { isPermission, type Permission } from "@negosyo-os/core/permissions";

export const PermissionKeySchema = z.string().refine(isPermission, "Unknown permission.")
  .transform((value) => value as Permission);

const PermissionSelectionSchema = z.array(PermissionKeySchema).min(1).max(100)
  .refine((values) => new Set(values).size === values.length, "Permissions must be unique.");

export const CreateRoleInputSchema = z.strictObject({
  key: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]*$/).max(50),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  permissions: PermissionSelectionSchema,
});

export const UpdateRolePermissionsInputSchema = z.strictObject({
  roleId: z.uuid(),
  permissions: PermissionSelectionSchema,
});

export const AssignMemberAccessInputSchema = z.strictObject({
  membershipId: z.uuid(),
  roleIds: z.array(z.uuid()).min(1).max(20)
    .refine((values) => new Set(values).size === values.length),
  branchAccessMode: z.enum(["all", "selected"]),
  branchIds: z.array(z.uuid()).max(100)
    .refine((values) => new Set(values).size === values.length),
}).refine(
  (input) => input.branchAccessMode === "all" || input.branchIds.length > 0,
  { message: "Select at least one Branch.", path: ["branchIds"] },
);

export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsInputSchema>;
export type AssignMemberAccessInput = z.infer<typeof AssignMemberAccessInputSchema>;
