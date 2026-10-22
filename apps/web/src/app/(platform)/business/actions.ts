"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  BranchInputSchema,
  BusinessIdSchema,
  BusinessSettingsInputSchema,
  CreateBusinessInputSchema,
  UpdateBusinessInputSchema,
} from "@negosyo-os/business";
import {
  createBranch,
  createBusiness,
  setBranchStatus,
  updateBusiness,
  updateBusinessSettings,
  uploadBusinessLogo,
  removeBusinessLogo,
} from "@negosyo-os/business/server";
import { selectTenant } from "@negosyo-os/business/tenant-context";
import { logger } from "@negosyo-os/core/logging";
import { BusinessHealthAssessmentResultSchema } from "@negosyo-os/ai";
import { saveBusinessHealthAssessment } from "@negosyo-os/ai/server";

export interface BusinessActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const businessLogger = logger.child({ domain: "business" });

function addressFrom(formData: FormData) {
  return {
    line1: formData.get("addressLine1"),
    line2: formData.get("addressLine2") || undefined,
    barangay: formData.get("barangay") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode") || undefined,
  };
}

function businessFrom(formData: FormData) {
  return {
    legalName: formData.get("legalName"),
    tradeName: formData.get("tradeName"),
    businessType: formData.get("businessType"),
    industry: formData.get("industry"),
    address: addressFrom(formData),
    phone: formData.get("phone"),
    email: formData.get("email"),
    tin: formData.get("tin") || undefined,
    registrationNumber: formData.get("registrationNumber") || undefined,
  };
}

function validationFailure(error: z.ZodError): BusinessActionState {
  const fieldErrors: Record<string, string[]> = {};
  const fieldNames: Record<string, string> = {
    "address.line1": "addressLine1",
    "address.line2": "addressLine2",
    "address.barangay": "barangay",
    "address.city": "city",
    "address.province": "province",
    "address.postalCode": "postalCode",
  };

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const field = fieldNames[path] ?? String(issue.path[0] ?? "form");
    (fieldErrors[field] ??= []).push(issue.message);
  }

  return {
    status: "error",
    message: "Check the highlighted business information.",
    fieldErrors,
  };
}

export async function createBusinessAction(
  _previousState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const parsed = CreateBusinessInputSchema.safeParse(businessFrom(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  let businessId: string;
  try {
    businessId = await createBusiness(parsed.data);
    await selectTenant(businessId);
  } catch (error) {
    businessLogger.error("Business creation failed", error);
    return { status: "error", message: "The business could not be created." };
  }
  const assessmentRaw=formData.get("healthAssessment");if(typeof assessmentRaw==="string"&&assessmentRaw){try{const assessment=BusinessHealthAssessmentResultSchema.parse(JSON.parse(assessmentRaw));await saveBusinessHealthAssessment(businessId,{industry:assessment.industry,responses:assessment.responses});}catch(error){businessLogger.warn("Business created but funnel assessment could not be imported",{businessId,error:error instanceof Error?error.message:"invalid assessment"});}}
  redirect(`/business/${businessId}`);
}

export async function switchBusinessAction(formData: FormData): Promise<never> {
  const businessId = BusinessIdSchema.parse(formData.get("businessId"));
  await selectTenant(businessId);
  redirect(`/business/${businessId}`);
}

export async function updateBusinessAction(
  businessId: string,
  _previousState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const parsed = UpdateBusinessInputSchema.safeParse({
    ...businessFrom(formData),
    status: formData.get("status"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await updateBusiness(businessId, parsed.data);
    revalidatePath(`/business/${businessId}`);
    return { status: "success", message: "Business details saved." };
  } catch (error) {
    businessLogger.error("Business update failed", error, { businessId });
    return { status: "error", message: "Business details could not be saved." };
  }
}

export async function updateBusinessSettingsAction(
  businessId: string,
  _previousState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const parsed = BusinessSettingsInputSchema.safeParse({
    locale: formData.get("locale"),
    dateFormat: formData.get("dateFormat"),
    weekStartsOn: formData.get("weekStartsOn"),
    fiscalYearStartMonth: formData.get("fiscalYearStartMonth"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    accentColor: formData.get("accentColor"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await updateBusinessSettings(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/settings`);
    return { status: "success", message: "Business preferences saved." };
  } catch (error) {
    businessLogger.error("Business settings update failed", error, { businessId });
    return { status: "error", message: "Business preferences could not be saved." };
  }
}

export async function uploadBusinessLogoAction(
  businessId: string,
  _previousState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a logo image first." };
  try {
    await uploadBusinessLogo(businessId, file);
    revalidatePath(`/business/${businessId}`, "layout");
    return { status: "success", message: "Business logo updated." };
  } catch (error) {
    businessLogger.error("Business logo upload failed", error, { businessId });
    return { status: "error", message: "Use a PNG, JPEG, or WebP logo up to 5 MB." };
  }
}

export async function removeBusinessLogoAction(businessId: string): Promise<void> {
  await removeBusinessLogo(businessId);
  revalidatePath(`/business/${businessId}`, "layout");
}

export async function createBranchAction(
  businessId: string,
  _previousState: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const parsed = BranchInputSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    address: addressFrom(formData),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await createBranch(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/branches`);
    return { status: "success", message: "Branch created." };
  } catch (error) {
    businessLogger.error("Branch creation failed", error, { businessId });
    return { status: "error", message: "The branch could not be created." };
  }
}

export async function setBranchStatusAction(
  businessId: string,
  formData: FormData,
): Promise<void> {
  const parsed = z.strictObject({
    branchId: z.uuid(),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  }).parse({
    branchId: formData.get("branchId"),
    isActive: formData.get("isActive"),
  });
  await setBranchStatus(businessId, parsed.branchId, parsed.isActive);
  revalidatePath(`/business/${businessId}/branches`);
}
