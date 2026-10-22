import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getObjectByKey, getObjectRecord } from "@negosyo-os/objects/server";

import { ObjectRecordForm } from "../../../../../../object-record-form";

export default async function EditObjectRecordPage({ params }: { params: Promise<{ businessId: string; objectKey: string; recordId: string }> }) {
  const { businessId, objectKey, recordId } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.recordUpdate, { businessId });
  const object = await getObjectByKey(businessId, objectKey);
  const [record, branches] = await Promise.all([getObjectRecord(businessId, object.definition.id, recordId), listBranches(businessId)]);
  return <main className="mx-auto w-full max-w-3xl px-6 py-12"><p className="text-sm font-semibold text-primary">Edit record</p><h1 className="mt-2 text-3xl font-semibold">{record.displayValue}</h1><div className="mt-8"><ObjectRecordForm branches={branches} businessId={businessId} fields={object.fields} object={object.definition} record={record} /></div></main>;
}
