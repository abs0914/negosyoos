"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@negosyo-os/core/errors";
import { CancelApprovalInputSchema, CreateApprovalRequestInputSchema, DecideApprovalInputSchema } from "@negosyo-os/approvals";
import { cancelApproval, createApprovalRequest, decideApproval } from "@negosyo-os/approvals/server";

export interface ApprovalActionState { status?:"success"|"error"; message?:string }
function message(error:unknown,fallback:string) { return error instanceof AppError && error.expose ? error.message : fallback; }

export async function createApprovalAction(businessId:string,_state:ApprovalActionState,formData:FormData):Promise<ApprovalActionState> {
  let steps:unknown; try { steps=JSON.parse(String(formData.get("steps")??"")); } catch { return {status:"error",message:"Approval steps must be valid JSON."}; }
  const parsed=CreateApprovalRequestInputSchema.safeParse({category:formData.get("category"),title:formData.get("title"),description:formData.get("description"),steps});
  if(!parsed.success) return {status:"error",message:parsed.error.issues[0]?.message??"Check the approval request."};
  let id:string; try { id=await createApprovalRequest(businessId,parsed.data); } catch(error) { return {status:"error",message:message(error,"The approval request could not be created.")}; }
  revalidatePath(`/business/${businessId}/approvals`); redirect(`/business/${businessId}/approvals/${id}`);
}
export async function decideApprovalAction(businessId:string,approvalRequestId:string,approvalStepId:string,decision:"approved"|"rejected",formData:FormData):Promise<void> {
  const input=DecideApprovalInputSchema.parse({approvalRequestId,approvalStepId,decision,comment:formData.get("comment")}); await decideApproval(businessId,input); revalidatePath(`/business/${businessId}/approvals`);
}
export async function cancelApprovalAction(businessId:string,approvalRequestId:string,formData:FormData):Promise<void> {
  const input=CancelApprovalInputSchema.parse({approvalRequestId,reason:formData.get("reason")}); await cancelApproval(businessId,input); revalidatePath(`/business/${businessId}/approvals`);
}
