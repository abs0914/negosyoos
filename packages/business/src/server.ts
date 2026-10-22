import "server-only";

import { randomUUID } from "node:crypto";

import { requireAuthenticatedUser, requireCapability, requireOrganizationMembership, requirePermission } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json } from "@negosyo-os/database";

import { mapBranch, mapBusiness, mapBusinessSettings } from "./mappers";
import type { Branch, Business, BusinessSettings, BusinessTrialDashboard } from "./models";
import {
  BranchInputSchema,
  BusinessIdSchema,
  BusinessSettingsInputSchema,
  CreateBusinessInputSchema,
  UpdateBranchInputSchema,
  UpdateBusinessInputSchema,
  TrialAdoptionEventSchema,
  TrialValueReportSchema,
  type BranchInput,
  type BusinessAddress,
  type BusinessSettingsInput,
  type CreateBusinessInput,
  type UpdateBranchInput,
  type UpdateBusinessInput,
  type TrialAdoptionEvent,
  type TrialValueReport,
} from "./schemas";

function databaseError(message: string, cause: unknown): AppError {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

function addressJson(address: BusinessAddress): Json {
  return {
    line1: address.line1,
    ...(address.line2 ? { line2: address.line2 } : {}),
    ...(address.barangay ? { barangay: address.barangay } : {}),
    city: address.city,
    province: address.province,
    ...(address.postalCode ? { postalCode: address.postalCode } : {}),
  };
}

function slugFor(tradeName: string): string {
  const base = tradeName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "business";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function listBusinesses(): Promise<readonly Business[]> {
  const supabase = await createClient();
  await requireAuthenticatedUser(supabase);
  const { data, error } = await supabase.from("organizations").select("*").order("display_name");
  if (error) throw databaseError("Businesses could not be loaded.", error);
  return data.map(mapBusiness);
}

export async function getBusiness(businessId: string): Promise<Business> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireOrganizationMembership(id, supabase);
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (error) throw databaseError("Business could not be loaded.", error);
  return mapBusiness(data);
}

export async function createBusiness(input: CreateBusinessInput): Promise<string> {
  const parsed = CreateBusinessInputSchema.parse(input);
  const supabase = await createClient();
  await requireAuthenticatedUser(supabase);
  const taxIdentifiers: Json = {
    ...(parsed.tin ? { tin: parsed.tin } : {}),
    ...(parsed.registrationNumber ? { registration_number: parsed.registrationNumber } : {}),
  };
  const { data, error } = await supabase.rpc("create_business", {
    requested_slug: slugFor(parsed.tradeName),
    requested_legal_name: parsed.legalName,
    requested_trade_name: parsed.tradeName,
    requested_business_type: parsed.businessType,
    requested_industry: parsed.industry,
    requested_address: addressJson(parsed.address),
    requested_phone: parsed.phone,
    requested_email: parsed.email,
    requested_tax_identifiers: taxIdentifiers,
  });
  if (error) throw databaseError("Business could not be created.", error);
  return BusinessIdSchema.parse(data);
}

export async function updateBusiness(
  businessId: string,
  input: UpdateBusinessInput,
): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = UpdateBusinessInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.settingsManage, { businessId: id }, supabase);
  const { error } = await supabase.from("organizations").update({
    legal_name: parsed.legalName,
    display_name: parsed.tradeName,
    business_type: parsed.businessType,
    industry_code: parsed.industry,
    address: addressJson(parsed.address),
    phone: parsed.phone || null,
    email: parsed.email || null,
    tax_identifiers: {
      ...(parsed.tin ? { tin: parsed.tin } : {}),
      ...(parsed.registrationNumber ? { registration_number: parsed.registrationNumber } : {}),
    },
    status: parsed.status,
  }).eq("id", id).select("id").single();
  if (error) throw databaseError("Business settings could not be saved.", error);
}

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requirePermission(id, PERMISSIONS.organizationRead, supabase);
  const { data, error } = await supabase.from("business_settings").select("*")
    .eq("organization_id", id).single();
  if (error) throw databaseError("Business settings could not be loaded.", error);
  return mapBusinessSettings(data);
}

export async function updateBusinessSettings(
  businessId: string,
  input: BusinessSettingsInput,
): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = BusinessSettingsInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.settingsManage, { businessId: id }, supabase);
  const { error } = await supabase.from("business_settings").update({
    locale: parsed.locale,
    date_format: parsed.dateFormat,
    week_starts_on: parsed.weekStartsOn,
    fiscal_year_start_month: parsed.fiscalYearStartMonth,
    primary_color: parsed.primaryColor,
    secondary_color: parsed.secondaryColor,
    accent_color: parsed.accentColor,
  }).eq("organization_id", id).select("organization_id").single();
  if (error) throw databaseError("Business settings could not be saved.", error);
}

const BUSINESS_LOGO_BUCKET = "organization-assets";
const BUSINESS_LOGO_MAX_BYTES = 5 * 1024 * 1024;
const BUSINESS_LOGO_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getBusinessLogoUrl(businessId: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireOrganizationMembership(id, supabase);
  if (!path.startsWith(`${id}/branding/`)) return null;
  const { data, error } = await supabase.storage.from(BUSINESS_LOGO_BUCKET).createSignedUrl(path, 3600);
  if (error) throw databaseError("Business logo could not be loaded.", error);
  return data.signedUrl;
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const extension = BUSINESS_LOGO_EXTENSIONS[file.type];
  if (!extension || file.size < 1 || file.size > BUSINESS_LOGO_MAX_BYTES) {
    throw new AppError({ code: ERROR_CODES.validationFailed, message: "Use a PNG, JPEG, or WebP logo up to 5 MB.", status: 400 });
  }
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.settingsManage, { businessId: id }, supabase);
  const { data: current, error: currentError } = await supabase.from("organizations").select("logo_path").eq("id", id).single();
  if (currentError) throw databaseError("Business logo could not be loaded.", currentError);
  const path = `${id}/branding/${randomUUID()}.${extension}`;
  const uploaded = await supabase.storage.from(BUSINESS_LOGO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) throw databaseError("Business logo could not be uploaded.", uploaded.error);
  const { error } = await supabase.from("organizations").update({ logo_path: path }).eq("id", id).select("id").single();
  if (error) {
    await supabase.storage.from(BUSINESS_LOGO_BUCKET).remove([path]);
    throw databaseError("Business logo could not be saved.", error);
  }
  if (current.logo_path && current.logo_path !== path) await supabase.storage.from(BUSINESS_LOGO_BUCKET).remove([current.logo_path]);
}

export async function removeBusinessLogo(businessId: string): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.settingsManage, { businessId: id }, supabase);
  const { data: current, error: currentError } = await supabase.from("organizations").select("logo_path").eq("id", id).single();
  if (currentError) throw databaseError("Business logo could not be loaded.", currentError);
  const { error } = await supabase.from("organizations").update({ logo_path: null }).eq("id", id).select("id").single();
  if (error) throw databaseError("Business logo could not be removed.", error);
  if (current.logo_path) await supabase.storage.from(BUSINESS_LOGO_BUCKET).remove([current.logo_path]);
}

export async function listBranches(businessId: string): Promise<readonly Branch[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requirePermission(id, PERMISSIONS.branchRead, supabase);
  const { data, error } = await supabase.from("branches").select("*")
    .eq("organization_id", id).order("name");
  if (error) throw databaseError("Branches could not be loaded.", error);
  return data.map(mapBranch);
}

export async function createBranch(businessId: string, input: BranchInput): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = BranchInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.branchManage, { businessId: id }, supabase);
  const { error } = await supabase.from("branches").insert({
    organization_id: id,
    code: parsed.code,
    name: parsed.name,
    address: addressJson(parsed.address),
    timezone: "Asia/Manila",
  });
  if (error) throw databaseError("Branch could not be created.", error);
}

export async function updateBranch(businessId: string, input: UpdateBranchInput): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = UpdateBranchInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.branchManage, {
    businessId: id,
    branchId: parsed.branchId,
  }, supabase);
  const { error } = await supabase.from("branches").update({
    code: parsed.code,
    name: parsed.name,
    address: addressJson(parsed.address),
    is_active: parsed.isActive,
  }).eq("organization_id", id).eq("id", parsed.branchId).select("id").single();
  if (error) throw databaseError("Branch could not be saved.", error);
}

export async function setBranchStatus(
  businessId: string,
  branchId: string,
  isActive: boolean,
): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsedBranchId = BusinessIdSchema.parse(branchId);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.branchManage, {
    businessId: id,
    branchId: parsedBranchId,
  }, supabase);
  const { error } = await supabase.from("branches").update({ is_active: isActive })
    .eq("organization_id", id).eq("id", parsedBranchId).select("id").single();
  if (error) throw databaseError("Branch status could not be saved.", error);
}

export async function getBusinessTrialDashboard(businessId: string): Promise<BusinessTrialDashboard> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requirePermission(id, PERMISSIONS.organizationRead, supabase);
  const { data, error } = await supabase.rpc("get_business_trial_dashboard", { requested_organization_id: id });
  if (error) throw databaseError("Trial progress could not be loaded.", error);
  return data as unknown as BusinessTrialDashboard;
}

export async function recordBusinessTrialAdoption(businessId: string, input: TrialAdoptionEvent): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = TrialAdoptionEventSchema.parse(input);
  const supabase = await createClient();
  await requirePermission(id, PERMISSIONS.organizationRead, supabase);
  const { data, error } = await supabase.rpc("record_business_trial_adoption", {
    requested_organization_id: id,
    requested_event_type: parsed.eventType,
    requested_resource_key: parsed.resourceKey,
    requested_idempotency_key: parsed.idempotencyKey,
    requested_metadata: parsed.metadata as Json,
  });
  if (error) throw databaseError("Trial activity could not be recorded.", error);
  return BusinessIdSchema.parse(data);
}

export async function convertBusinessTrial(businessId: string): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.settingsManage, { businessId: id }, supabase);
  const { error } = await supabase.rpc("convert_business_trial", { requested_organization_id: id });
  if (error) throw databaseError("Trial conversion could not be completed.", error);
}

export async function getBusinessTrialValueReport(businessId: string): Promise<TrialValueReport> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requirePermission(id, PERMISSIONS.reportRead, supabase);
  const { data, error } = await supabase.rpc("get_business_trial_value_report", { requested_organization_id: id });
  if (error) throw databaseError("The trial value report could not be calculated.", error);
  return TrialValueReportSchema.parse(data);
}
