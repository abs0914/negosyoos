import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getFormByKey } from "@negosyo-os/forms/server";
import { getObjectByKey } from "@negosyo-os/objects/server";

import { DynamicFormRenderer } from "../../../../../../dynamic-form-renderer";
import { saveFormRecordAction } from "../../../../../../form-actions";

export default async function UseCreateFormPage({ params }: { params: Promise<{ businessId: string; objectKey: string; formKey: string }> }) {
  const { businessId, objectKey, formKey } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.recordCreate, { businessId });
  const object = await getObjectByKey(businessId, objectKey);
  const [form, branches] = await Promise.all([getFormByKey(businessId, object.definition.id, formKey), listBranches(businessId)]);
  if (form.definition.mode !== "create") throw new Error("This form is not available in create mode.");
  const action = saveFormRecordAction.bind(null, businessId, objectKey, form.definition.id, undefined);
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12"><p className="text-sm font-semibold text-primary">{object.definition.singularLabel}</p><h1 className="mt-2 text-3xl font-semibold">{form.definition.name}</h1>{form.definition.description ? <p className="mt-2 text-muted-foreground">{form.definition.description}</p> : null}<div className="mt-8"><DynamicFormRenderer action={action} branches={branches} fields={object.fields} form={form} /></div></main>;
}
