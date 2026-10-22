"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordBusinessTrialAdoption } from "@negosyo-os/business/server";

export async function viewTrialValueReportAction(businessId: string): Promise<never> {
  await Promise.all([
    recordBusinessTrialAdoption(businessId, {
      eventType: "trial_value_report_viewed",
      resourceKey: "trial-value-report",
      idempotencyKey: `trial-value-${businessId}`,
      metadata: {},
    }),
    recordBusinessTrialAdoption(businessId, {
      eventType: "report_viewed",
      resourceKey: "trial-value-report",
      idempotencyKey: `report-trial-value-${businessId}`,
      metadata: { reportType: "trial_value" },
    }),
  ]);
  revalidatePath(`/business/${businessId}/trial`);
  redirect(`/business/${businessId}/trial/report`);
}
