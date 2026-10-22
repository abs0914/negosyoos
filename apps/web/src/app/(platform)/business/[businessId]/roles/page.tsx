import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { listMemberAccess, listPermissions, listRoles } from "@negosyo-os/rbac/server";
import { CreateRoleForm, MemberAccessForm, RolePermissionsForm } from "../../role-management";

export default async function RolesPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.usersManage, { businessId });
  const [roles, permissions, members, branches] = await Promise.all([
    listRoles(businessId), listPermissions(businessId), listMemberAccess(businessId), listBranches(businessId),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Roles and permissions</h1>
      <p className="mt-2 text-muted-foreground">Capabilities are enforced on the server and in PostgreSQL. System roles are read-only.</p>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.filter((role) => role.isSystem).map((role) => (
          <article className="rounded-2xl border bg-card p-5" key={role.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">System role</p><h2 className="mt-2 text-xl font-semibold">{role.name}</h2><p className="mt-2 text-sm text-muted-foreground">{role.description}</p><p className="mt-4 text-sm">{role.permissions.length} capabilities</p>
          </article>
        ))}
      </section>
      <section className="mt-10 rounded-2xl border bg-card p-6"><h2 className="mb-6 text-xl font-semibold">Create custom role</h2><CreateRoleForm businessId={businessId} permissions={permissions} /></section>
      {roles.filter((role) => !role.isSystem).map((role) => (
        <details className="mt-6 rounded-2xl border bg-card p-6" key={role.id}><summary className="cursor-pointer text-xl font-semibold">{role.name}</summary><p className="mb-6 mt-2 text-sm text-muted-foreground">{role.description}</p><RolePermissionsForm businessId={businessId} permissions={permissions} role={role} /></details>
      ))}
      <section className="mt-10"><h2 className="text-2xl font-semibold">Member access</h2><div className="mt-5 space-y-5">{members.map((member) => (
        <article className="rounded-2xl border bg-card p-6" key={member.membershipId}><h3 className="font-semibold">Member {member.userId}</h3><p className="mt-1 text-sm text-muted-foreground">{member.status}{member.isOwner ? " · Owner access is protected" : ""}</p>{member.isOwner ? null : <div className="mt-5"><MemberAccessForm branches={branches} businessId={businessId} member={member} roles={roles} /></div>}</article>
      ))}</div></section>
    </main>
  );
}
