import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getObjectByKey } from "@negosyo-os/objects/server";

import { saveFormDefinitionAction } from "../../../../../form-actions";
import { FormDesigner } from "../../../../../form-designer";

export default async function NewFormPage({ params }: { params: Promise<{ businessId: string; objectKey: string }> }) {
  const { businessId, objectKey } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.formManage, { businessId });
  const object = await getObjectByKey(businessId, objectKey);
  const action = saveFormDefinitionAction.bind(null, businessId, objectKey, object.definition.id, undefined);
  return <main className="mx-auto w-full max-w-7xl px-6 py-12"><p className="text-sm font-semibold text-primary">Visual Form Builder</p><h1 className="mt-2 text-3xl font-semibold">Create {object.definition.singularLabel} form</h1><p className="mt-2 text-muted-foreground">Group and reorder fields, then configure safe declarative behavior.</p><div className="mt-8"><FormDesigner action={action} fields={object.fields} object={object.definition} /></div></main>;
}
