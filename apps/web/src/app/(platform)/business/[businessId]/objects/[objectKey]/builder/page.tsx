import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getObjectByKey, listObjectDefinitions } from "@negosyo-os/objects/server";

import { CreateFieldForm, EditFieldForm, FieldOrderForm } from "../../../../object-builder";

export default async function ObjectBuilderPage({ params }: { params: Promise<{ businessId: string; objectKey: string }> }) {
  const { businessId, objectKey } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.metadataManage, { businessId });
  const [object, objects] = await Promise.all([getObjectByKey(businessId, objectKey), listObjectDefinitions(businessId)]);
  const activeFields = object.fields.filter((field) => field.status === "active");
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold text-primary">Object Builder</p><h1 className="mt-2 text-3xl font-semibold">{object.definition.singularLabel} fields</h1><p className="mt-2 text-muted-foreground">Keys are stable after creation. Archiving preserves historical record values.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]"><CreateFieldForm businessId={businessId} object={object.definition} objects={objects} /><FieldOrderForm businessId={businessId} fields={activeFields} object={object.definition} /></div>
      <section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Edit fields</h2><div className="space-y-3">{activeFields.map((field) => <EditFieldForm businessId={businessId} field={field} key={field.id} object={object.definition} objects={objects} />)}{activeFields.length === 0 ? <p className="text-sm text-muted-foreground">Add the first field to begin creating records.</p> : null}</div></section>
    </main>
  );
}
