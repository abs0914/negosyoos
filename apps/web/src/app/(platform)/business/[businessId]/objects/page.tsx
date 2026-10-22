import Link from "next/link";

import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { listObjectDefinitions } from "@negosyo-os/objects/server";

import { CreateObjectForm } from "../../object-builder";

export default async function ObjectsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const [objects, user] = await Promise.all([listObjectDefinitions(businessId), requireAuthenticatedUser()]);
  const canManage = await can(user, PERMISSIONS.metadataManage, { businessId });
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-sm font-semibold text-primary">Configuration engine</p>
      <h1 className="mt-2 text-3xl font-semibold">Object Builder</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">Define business entities and store their records in tenant-isolated, validated JSONB without creating custom PostgreSQL tables.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {objects.map((object) => <Link className="rounded-2xl border bg-card p-6 hover:border-primary" href={`/business/${businessId}/objects/${object.key}`} key={object.id}><p className="text-xs font-semibold uppercase text-muted-foreground">{object.status}</p><h2 className="mt-2 text-xl font-semibold">{object.pluralLabel}</h2><p className="mt-2 text-sm text-muted-foreground">{object.description || `${object.singularLabel} records`}</p></Link>)}
        {objects.length === 0 ? <p className="text-sm text-muted-foreground">No custom objects yet.</p> : null}
      </div>
      {canManage ? <div className="mt-12"><CreateObjectForm businessId={businessId} /></div> : null}
    </main>
  );
}
