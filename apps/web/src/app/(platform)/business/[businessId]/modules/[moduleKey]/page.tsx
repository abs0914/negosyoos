import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ModuleKeySchema } from "@negosyo-os/modules";
import { listModuleRegistry } from "@negosyo-os/modules/server";

export default async function ModuleWorkspacePage({
  params,
}: {
  params: Promise<{ businessId: string; moduleKey: string }>;
}) {
  const { businessId, moduleKey } = await params;
  const parsedKey = ModuleKeySchema.safeParse(moduleKey);
  if (!parsedKey.success) notFound();
  const registry = await listModuleRegistry(businessId);
  const entry = registry.find((item) => item.definition.key === parsedKey.data && item.businessModule?.enabled);
  if (!entry) notFound();
  if (entry.definition.key === "product_catalog") redirect(`/business/${businessId}/catalog`);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Enabled module · v{entry.definition.version}</p>
      <h1 className="mt-2 text-3xl font-semibold">{entry.definition.name}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{entry.definition.description}</p>
      <div className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Capability ready for configuration</h2>
        <p className="mt-2 text-sm text-muted-foreground">The reusable capability is enabled. Its operational screens and records belong to the later Core SME Modules phase.</p>
        <Link className="mt-5 inline-block text-sm font-medium text-primary hover:underline" href={`/business/${businessId}/modules#${entry.definition.key}`}>Manage module configuration</Link>
      </div>
    </main>
  );
}
