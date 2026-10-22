import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getFormByKey } from "@negosyo-os/forms/server";
import { getObjectByKey, getObjectRecord } from "@negosyo-os/objects/server";

import { DynamicFormRenderer } from "../../../../../../../dynamic-form-renderer";
import { saveFormRecordAction } from "../../../../../../../form-actions";

export default async function UseEditFormPage({ params }: { params: Promise<{ businessId: string; objectKey: string; formKey: string; recordId: string }> }) {
  const { businessId, objectKey, formKey, recordId } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.recordUpdate, { businessId });
  const object = await getObjectByKey(businessId, objectKey);
  const [form, record, branches] = await Promise.all([
    getFormByKey(businessId, object.definition.id, formKey),
    getObjectRecord(businessId, object.definition.id, recordId),
    listBranches(businessId),
  ]);
  if (form.definition.mode !== "edit") throw new Error("This form is not available in edit mode.");
  const action = saveFormRecordAction.bind(null, businessId, objectKey, form.definition.id, recordId);
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12"><p className="text-sm font-semibold text-primary">Edit {object.definition.singularLabel}</p><h1 className="mt-2 text-3xl font-semibold">{form.definition.name}</h1><div className="mt-8"><DynamicFormRenderer action={action} branches={branches} fields={object.fields} form={form} record={record} /></div></main>;
}
