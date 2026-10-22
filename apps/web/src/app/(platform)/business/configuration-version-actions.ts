"use server";

import { revalidatePath } from "next/cache";

import { AppError } from "@negosyo-os/core/errors";
import { restoreConfigurationVersion } from "@negosyo-os/configuration/server";

export interface ConfigurationVersionActionState{status?:"success"|"error";message?:string}

export async function restoreConfigurationVersionAction(businessId:string,targetVersion:number,_state:ConfigurationVersionActionState):Promise<ConfigurationVersionActionState>{
 void _state;
 try{const version=await restoreConfigurationVersion(businessId,targetVersion);revalidatePath(`/business/${businessId}`,"layout");return{status:"success",message:`Version ${targetVersion} was restored as new configuration version ${version}.`};}
 catch(error){return{status:"error",message:error instanceof AppError&&error.expose?error.message:"The configuration version could not be restored."};}
}
