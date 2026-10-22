"use server";

import { redirect } from "next/navigation";

import { BusinessHealthAssessmentResultSchema } from "@negosyo-os/ai";
import { saveBusinessHealthAssessment } from "@negosyo-os/ai/server";

export async function saveBusinessHealthAssessmentAction(businessId:string,raw:string):Promise<never>{const parsed=BusinessHealthAssessmentResultSchema.parse(JSON.parse(raw));const assessmentId=await saveBusinessHealthAssessment(businessId,{industry:parsed.industry,responses:parsed.responses});redirect(`/business/${businessId}/assessment/${assessmentId}`);}
