import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getObjectByKey } from "@negosyo-os/objects/server";

import { ObjectRecordForm } from "../../../../object-record-form";

export default async function NewObjectRecordPage({ params }: { params: Promise<{ businessId: string; objectKey: string }> }) {
  const { businessId, objectKey } = await params;
  const user = await requireAuthenticatedUser();
  await requireCapability(user, PERMISSIONS.recordCreate, { businessId });
  const [object, branches] = await Promise.all([getObjectByKey(businessId, objectKey), listBranches(businessId)]);
  return <main className="mx-auto w-full max-w-3xl px-6 py-12"><p className="text-sm font-semibold text-primary">New record</p><h1 className="mt-2 text-3xl font-semibold">Create {object.definition.singularLabel}</h1><div className="mt-8"><ObjectRecordForm branches={branches} businessId={businessId} fields={object.fields} object={object.definition} /></div></main>;
}
