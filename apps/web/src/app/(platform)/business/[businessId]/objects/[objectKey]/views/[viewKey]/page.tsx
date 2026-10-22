import Link from "next/link";

import { getObjectByKey } from "@negosyo-os/objects/server";
import { getViewByKey } from "@negosyo-os/views/server";
import { ViewDesigner } from "@/app/(platform)/business/view-designer";
import { saveViewAction } from "@/app/(platform)/business/view-actions";

export default async function ConfigureObjectViewPage({ params }: { params: Promise<{ businessId: string; objectKey: string; viewKey: string }> }) {
  const { businessId, objectKey, viewKey } = await params;
  const object = await getObjectByKey(businessId, objectKey);
  const view = await getViewByKey(businessId, object.definition.id, viewKey);
  const fields = object.fields.filter((field) => field.status === "active" && field.visibility === "visible");
  const action = saveViewAction.bind(null, businessId, objectKey, object.definition.id, view.id);
  return <main className="mx-auto w-full max-w-5xl px-6 py-12"><Link className="text-sm font-medium text-primary hover:underline" href={`/business/${businessId}/objects/${objectKey}/views`}>← Views</Link><h1 className="mt-5 text-3xl font-semibold">Configure {view.name}</h1><p className="mt-2 text-muted-foreground">Changes apply everywhere this metadata-defined view is rendered.</p><ViewDesigner action={action} fields={fields} view={view} /></main>;
}
