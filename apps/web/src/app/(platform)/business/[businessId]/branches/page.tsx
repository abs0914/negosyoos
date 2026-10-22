import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { Button } from "@negosyo-os/ui";
import { BranchForm } from "../../branch-form";
import { setBranchStatusAction } from "../../actions";

export default async function BranchesPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const [branches, user] = await Promise.all([listBranches(businessId), requireAuthenticatedUser()]);
  const [canCreateBranch, branchManagement] = await Promise.all([
    can(user, PERMISSIONS.branchManage, { businessId }),
    Promise.all(branches.map(async (branch) => [
      branch.id,
      await can(user, PERMISSIONS.branchManage, { businessId, branchId: branch.id }),
    ] as const)),
  ]);
  const canManageBranch = new Map(branchManagement);
  const statusAction = setBranchStatusAction.bind(null, businessId);
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Branches</h1>
      <div className="mt-8 grid gap-4">
        {branches.map((branch) => (
          <article className="flex items-center justify-between gap-6 rounded-2xl border bg-card p-5" key={branch.id}>
            <div><h2 className="font-semibold">{branch.name}</h2><p className="mt-1 text-sm text-muted-foreground">{branch.code} · {branch.address.city}, {branch.address.province} · {branch.isActive ? "Active" : "Inactive"}</p></div>
            {canManageBranch.get(branch.id) ? <form action={statusAction}>
              <input name="branchId" type="hidden" value={branch.id} /><input name="isActive" type="hidden" value={branch.isActive ? "false" : "true"} />
              <Button type="submit">{branch.isActive ? "Deactivate" : "Activate"}</Button>
            </form> : null}
          </article>
        ))}
      </div>
      {canCreateBranch ? <section className="mt-10 rounded-2xl border bg-card p-6"><h2 className="mb-6 text-xl font-semibold">Add branch</h2><BranchForm businessId={businessId} /></section> : null}
    </main>
  );
}
