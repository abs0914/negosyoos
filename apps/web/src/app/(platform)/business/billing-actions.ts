"use server";import{revalidatePath}from"next/cache";import{requestSubscriptionChange}from"@negosyo-os/billing/server";import{PlanKeySchema,SubscriptionOperationSchema}from"@negosyo-os/billing";
import { redirect } from "next/navigation";
import { startSubscriptionCheckout } from "@negosyo-os/billing/server";
export async function requestSubscriptionAction(businessId:string,operation:string,planKey:string,formData:FormData){void formData;await requestSubscriptionChange(businessId,SubscriptionOperationSchema.parse(operation),PlanKeySchema.parse(planKey));revalidatePath(`/business/${businessId}/billing`);}

export async function checkoutSubscriptionAction(businessId: string, planKey: string, _previous: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  let url: string;
  try {
    url = await startSubscriptionCheckout(businessId, planKey, String(formData.get("interval")), Number(formData.get("branches") ?? 3));
  } catch (error) {
    return { error: error instanceof Error && error.name === "PaymongoError" ? error.message : "Checkout could not start. Check your permissions and try again." };
  }
  redirect(url);
}
