"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@negosyo-os/core/errors";
import { answerBusinessInterview, reviewBusinessInterviewRecommendation, startBusinessInterview } from "@negosyo-os/ai/server";

export interface AiInterviewActionState{status?:"success"|"error";message?:string}
function message(error:unknown){return error instanceof AppError&&error.expose?error.message:error instanceof Error?error.message:"The interview request failed.";}
export async function startBusinessInterviewAction(businessId:string){const id=await startBusinessInterview(businessId);redirect(`/business/${businessId}/ai-interview/${id}`);}
export async function answerBusinessInterviewAction(businessId:string,interviewId:string,_state:AiInterviewActionState,formData:FormData):Promise<AiInterviewActionState>{try{await answerBusinessInterview(businessId,interviewId,String(formData.get("answer")??""));revalidatePath(`/business/${businessId}/ai-interview/${interviewId}`);return{status:"success"};}catch(error){return{status:"error",message:message(error)};}}
export async function reviewBusinessInterviewAction(businessId:string,interviewId:string,_state:AiInterviewActionState,formData:FormData):Promise<AiInterviewActionState>{const decision=formData.get("decision");if(decision!=="approved"&&decision!=="rejected")return{status:"error",message:"Choose approve or reject."};try{await reviewBusinessInterviewRecommendation(businessId,interviewId,decision);revalidatePath(`/business/${businessId}/ai-interview`);revalidatePath(`/business/${businessId}/ai-interview/${interviewId}`);return{status:"success",message:decision==="approved"?"Recommendations approved. No system changes were made.":"Recommendations declined. No system changes were made."};}catch(error){return{status:"error",message:message(error)};}}
