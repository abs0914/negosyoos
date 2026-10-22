"use server";

import { revalidatePath } from "next/cache";
import { resolveReconciliationCase } from "@negosyo-os/pos-sync/server";

export async function resolveReconciliationAction(businessId: string, formData: FormData) {
  await resolveReconciliationCase(businessId, {
    caseId: String(formData.get("caseId") ?? ""),
    resolution: String(formData.get("resolution") ?? ""),
    disposition: String(formData.get("disposition") ?? "resolved"),
  });
  revalidatePath(`/business/${businessId}/audit`);
}
