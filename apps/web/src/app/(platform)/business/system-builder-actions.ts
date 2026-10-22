"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendSystemBuilderMessage, startSystemBuilderSession } from "@negosyo-os/ai/server";
import { applyConfigurationProposal, reviewConfigurationProposal, rollbackConfigurationProposal } from "@negosyo-os/configuration/server";
import { AppError } from "@negosyo-os/core/errors";

export interface SystemBuilderActionState{status?:"success"|"error";message?:string;proposalId?:string}
function message(error:unknown){return error instanceof AppError&&error.expose?error.message:error instanceof Error?error.message:"System Builder could not complete the request.";}
const paths=(businessId:string,sessionId:string)=>{revalidatePath(`/business/${businessId}/system-builder`);revalidatePath(`/business/${businessId}/system-builder/${sessionId}`);};
export async function startSystemBuilderAction(businessId:string){const id=await startSystemBuilderSession(businessId);redirect(`/business/${businessId}/system-builder/${id}`);}
export async function sendSystemBuilderMessageAction(businessId:string,sessionId:string,_state:SystemBuilderActionState,formData:FormData):Promise<SystemBuilderActionState>{try{const result=await sendSystemBuilderMessage(businessId,sessionId,String(formData.get("instruction")??""));paths(businessId,sessionId);return{status:"success",...(result.proposalId?{proposalId:result.proposalId}:{})};}catch(error){return{status:"error",message:message(error)};}}
export async function approveAndApplySystemBuilderAction(businessId:string,sessionId:string,proposalId:string,state:SystemBuilderActionState):Promise<SystemBuilderActionState>{void state;try{await reviewConfigurationProposal(businessId,proposalId,"approved");await applyConfigurationProposal(businessId,proposalId);paths(businessId,sessionId);return{status:"success",message:"Change approved, applied, and added to configuration history."};}catch(error){paths(businessId,sessionId);return{status:"error",message:message(error)};}}
export async function applyApprovedSystemBuilderAction(businessId:string,sessionId:string,proposalId:string,state:SystemBuilderActionState):Promise<SystemBuilderActionState>{void state;try{await applyConfigurationProposal(businessId,proposalId);paths(businessId,sessionId);return{status:"success",message:"Approved change applied and added to configuration history."};}catch(error){return{status:"error",message:message(error)};}}
export async function restorePreviousSystemVersionAction(businessId:string,sessionId:string,proposalId:string,state:SystemBuilderActionState):Promise<SystemBuilderActionState>{void state;try{await rollbackConfigurationProposal(businessId,proposalId);paths(businessId,sessionId);return{status:"success",message:"Previous configuration version restored. The restore is recorded in audit history."};}catch(error){return{status:"error",message:message(error)};}}
