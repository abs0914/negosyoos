"use client";

import { useActionState } from "react";

import type { Branch } from "@negosyo-os/business";
import type { MemberAccess, PermissionDefinition, Role } from "@negosyo-os/rbac";
import { Button } from "@negosyo-os/ui";
import {
  assignMemberAccessAction,
  createRoleAction,
  updateRolePermissionsAction,
  type RbacActionState,
} from "./rbac-actions";

const initialState: RbacActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

function PermissionChecklist({
  permissions,
  selected,
}: {
  permissions: readonly PermissionDefinition[];
  selected: readonly string[];
}) {
  const selectedSet = new Set(selected);
  const domains = Map.groupBy(permissions, (permission) => permission.domain);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {[...domains.entries()].map(([domain, items]) => (
        <fieldset className="rounded-xl border p-4" key={domain}>
          <legend className="px-1 text-sm font-semibold capitalize">{domain}</legend>
          <div className="mt-2 space-y-3">
            {items.map((permission) => (
              <label className="flex items-start gap-2 text-sm" key={permission.key}>
                <input className="mt-1" defaultChecked={selectedSet.has(permission.key)} name="permissions" type="checkbox" value={permission.key} />
                <span><span className="font-medium">{permission.key}</span><span className="block text-xs text-muted-foreground">{permission.description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function CreateRoleForm({ businessId, permissions }: { businessId: string; permissions: readonly PermissionDefinition[] }) {
  const action = createRoleAction.bind(null, businessId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Role name<input className={inputClass} name="name" required /></label>
        <label className="space-y-2 text-sm font-medium">Role key<input className={inputClass} name="key" placeholder="floor_supervisor" required /></label>
      </div>
      <label className="space-y-2 text-sm font-medium">Description<input className={inputClass} name="description" /></label>
      <PermissionChecklist permissions={permissions} selected={[]} />
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Creating…" : "Create custom role"}</Button>
    </form>
  );
}

export function RolePermissionsForm({ businessId, role, permissions }: { businessId: string; role: Role; permissions: readonly PermissionDefinition[] }) {
  const action = updateRolePermissionsAction.bind(null, businessId, role.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-5">
      <PermissionChecklist permissions={permissions} selected={role.permissions} />
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save permissions"}</Button>
    </form>
  );
}

export function MemberAccessForm({
  businessId,
  member,
  roles,
  branches,
}: {
  businessId: string;
  member: MemberAccess;
  roles: readonly Role[];
  branches: readonly Branch[];
}) {
  const action = assignMemberAccessAction.bind(null, businessId, member.membershipId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const roleSet = new Set(member.roleIds);
  const branchSet = new Set(member.branchIds);
  return (
    <form action={formAction} className="space-y-5">
      <fieldset><legend className="text-sm font-semibold">Roles</legend><div className="mt-2 flex flex-wrap gap-4">{roles.map((role) => <label className="text-sm" key={role.id}><input className="mr-2" defaultChecked={roleSet.has(role.id)} name="roleIds" type="checkbox" value={role.id} />{role.name}</label>)}</div></fieldset>
      <label className="block space-y-2 text-sm font-semibold">Branch access
        <select className={inputClass} defaultValue={member.branchAccessMode} name="branchAccessMode"><option value="all">All Branches</option><option value="selected">Selected Branches</option></select>
      </label>
      <fieldset><legend className="text-sm font-semibold">Selected Branches</legend><div className="mt-2 flex flex-wrap gap-4">{branches.map((branch) => <label className="text-sm" key={branch.id}><input className="mr-2" defaultChecked={branchSet.has(branch.id)} name="branchIds" type="checkbox" value={branch.id} />{branch.name}</label>)}</div></fieldset>
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save member access"}</Button>
    </form>
  );
}
