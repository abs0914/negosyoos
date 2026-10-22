"use server";

import { revalidatePath } from "next/cache";

import { setNegosyoCoachDismissed } from "@negosyo-os/onboarding/server";

export async function setCoachDismissedAction(businessId: string, playbookKey: string, dismissed: boolean) {
  await setNegosyoCoachDismissed(businessId, playbookKey, dismissed);
  revalidatePath(`/business/${businessId}`, "layout");
}
