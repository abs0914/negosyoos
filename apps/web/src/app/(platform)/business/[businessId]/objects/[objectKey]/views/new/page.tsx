import Link from "next/link";

import { getObjectByKey } from "@negosyo-os/objects/server";
import { ViewDesigner } from "@/app/(platform)/business/view-designer";
import { saveViewAction } from "@/app/(platform)/business/view-actions";

export default async function NewObjectViewPage({ params }: { params: Promise<{ businessId: string; objectKey: string }> }) {
  const { businessId, objectKey } = await params;
  const object = await getObjectByKey(businessId, objectKey);
  const fields = object.fields.filter((field) => field.status === "active" && field.visibility === "visible");
  const action = saveViewAction.bind(null, businessId, objectKey, object.definition.id, undefined);
  return <main className="mx-auto w-full max-w-5xl px-6 py-12"><Link className="text-sm font-medium text-primary hover:underline" href={`/business/${businessId}/objects/${objectKey}/views`}>← Views</Link><h1 className="mt-5 text-3xl font-semibold">New {object.definition.singularLabel} view</h1><p className="mt-2 text-muted-foreground">Configure the runtime using fields from the Object Definition.</p><ViewDesigner action={action} fields={fields} /></main>;
}
