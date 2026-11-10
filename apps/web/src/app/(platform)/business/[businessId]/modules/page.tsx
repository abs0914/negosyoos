import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { listModuleRegistry } from "@negosyo-os/modules/server";

import { ModuleRegistry } from "../../module-registry";

export default async function ModulesPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const [entries, user] = await Promise.all([
    listModuleRegistry(businessId),
    requireAuthenticatedUser(),
  ]);
  const canManage = await can(user, PERMISSIONS.moduleManage, { businessId });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-sm font-semibold text-primary">Your workspace</p>
      <h1 className="mt-2 text-3xl font-semibold">Business tools</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">Choose tools for your daily work. Check the plan and any required tools, then open setup when you are ready.</p>
      {!canManage ? <p className="mt-5 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">You have read-only access to business tools.</p> : null}
      <div className="mt-10"><ModuleRegistry businessId={businessId} canManage={canManage} entries={entries} /></div>
    </main>
  );
}
