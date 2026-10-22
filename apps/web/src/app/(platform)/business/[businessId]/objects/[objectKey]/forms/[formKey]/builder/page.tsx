import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getFormByKey } from "@negosyo-os/forms/server";
import { getObjectByKey } from "@negosyo-os/objects/server";

import { saveFormDefinitionAction } from "../../../../../../form-actions";
import { FormDesigner } from "../../../../../../form-designer";

export default async function EditFormPage({ params }: { params: Promise<{ businessId: string; objectKey: string; formKey: string }> }) {
  const { businessId, objectKey, formKey } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.formManage, { businessId });
  const object = await getObjectByKey(businessId, objectKey);
  const form = await getFormByKey(businessId, object.definition.id, formKey);
  const action = saveFormDefinitionAction.bind(null, businessId, objectKey, object.definition.id, form.definition.id);
  return <main className="mx-auto w-full max-w-7xl px-6 py-12"><p className="text-sm font-semibold text-primary">Visual Form Builder</p><h1 className="mt-2 text-3xl font-semibold">{form.definition.name}</h1><p className="mt-2 text-muted-foreground">Layout version {form.layout.version}</p><div className="mt-8"><FormDesigner action={action} fields={object.fields} form={form} object={object.definition} /></div></main>;
}
