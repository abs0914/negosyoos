"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@negosyo-os/core/errors";
import { ConfigurationProposalInputSchema } from "@negosyo-os/configuration";
import { applyConfigurationProposal, proposeConfigurationChange, reviewConfigurationProposal, rollbackConfigurationProposal } from "@negosyo-os/configuration/server";

export interface AiBuilderActionState { status?:"success"|"error";message?:string;proposalId?:string }
function message(error:unknown){return error instanceof AppError&&error.expose?error.message:error instanceof Error?error.message:"The configuration request failed.";}

export async function proposeAiConfigurationAction(businessId:string,expectedRevision:number,_state:AiBuilderActionState,formData:FormData):Promise<AiBuilderActionState>{
 let operations:unknown;try{operations=JSON.parse(String(formData.get("operations")??""));}catch{return{status:"error",message:"Operations must be valid JSON."};}
 const parsed=ConfigurationProposalInputSchema.safeParse({title:formData.get("title"),summary:formData.get("summary"),operations,expectedRevision});
 if(!parsed.success)return{status:"error",message:parsed.error.issues[0]?.message??"Check the proposal."};
 try{const proposalId=await proposeConfigurationChange(businessId,parsed.data);revalidatePath(`/business/${businessId}/ai-builder`);return{status:"success",message:"Proposal validated and saved for human review.",proposalId};}catch(error){return{status:"error",message:message(error)};}
}

export async function progressAiConfigurationAction(businessId:string,proposalId:string,_state:AiBuilderActionState,formData:FormData):Promise<AiBuilderActionState>{
 const action=String(formData.get("action")??"");
 try{
  if(action==="approve"||action==="reject")await reviewConfigurationProposal(businessId,proposalId,action==="approve"?"approved":"rejected");
  else if(action==="apply")await applyConfigurationProposal(businessId,proposalId);
  else if(action==="rollback")await rollbackConfigurationProposal(businessId,proposalId);
  else return{status:"error",message:"Unsupported review action."};
  revalidatePath(`/business/${businessId}/ai-builder`);revalidatePath(`/business/${businessId}/ai-builder/${proposalId}`);
  return{status:"success",message:action==="approve"?"Proposal approved. It has not been applied yet.":action==="reject"?"Proposal rejected.":action==="apply"?"Configuration applied and audited.":"Configuration rolled back and audited."};
 }catch(error){return{status:"error",message:message(error)};}
}
