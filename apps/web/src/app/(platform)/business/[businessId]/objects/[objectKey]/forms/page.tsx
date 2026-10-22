import Link from "next/link";

import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { listFormsForObject } from "@negosyo-os/forms/server";
import { getObjectByKey } from "@negosyo-os/objects/server";

export default async function ObjectFormsPage({ params }: { params: Promise<{ businessId: string; objectKey: string }> }) {
  const { businessId, objectKey } = await params;
  const [object, user] = await Promise.all([getObjectByKey(businessId, objectKey), requireAuthenticatedUser()]);
  const canManage = await can(user, PERMISSIONS.formManage, { businessId });
  const forms = await listFormsForObject(businessId, object.definition.id);
  return <main className="mx-auto w-full max-w-5xl px-6 py-12"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Dynamic forms</p><h1 className="mt-2 text-3xl font-semibold">{object.definition.singularLabel} forms</h1><p className="mt-2 text-muted-foreground">Layouts are declarative metadata generated from this object’s field definitions.</p></div>{canManage ? <Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={`/business/${businessId}/objects/${objectKey}/forms/new`}>Create form</Link> : null}</div><div className="mt-8 grid gap-4 md:grid-cols-2">{forms.map((form) => <article className="rounded-2xl border bg-card p-5" key={form.id}><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{form.name}</h2><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{form.mode}</span></div><p className="mt-2 text-sm text-muted-foreground">{form.description || `Configured ${form.mode} form`}</p><div className="mt-4 flex gap-4 text-sm">{canManage ? <Link className="font-medium text-primary hover:underline" href={`/business/${businessId}/objects/${objectKey}/forms/${form.key}/builder`}>Design</Link> : null}{form.mode === "create" ? <Link className="font-medium text-primary hover:underline" href={`/business/${businessId}/objects/${objectKey}/forms/${form.key}/use`}>Open form</Link> : null}</div></article>)}{forms.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground md:col-span-2">No configured forms yet.</p> : null}</div></main>;
}
