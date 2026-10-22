import { z } from "zod";

import type { Tables } from "@negosyo-os/database";

import type { Branch, Business, BusinessSettings } from "./models";
import { BusinessStatusSchema, BusinessTypeSchema } from "./schemas";

const storedAddressSchema = z.looseObject({
  line1: z.string().catch(""),
  line2: z.string().optional(),
  barangay: z.string().optional(),
  city: z.string().catch(""),
  province: z.string().catch(""),
  postalCode: z.string().optional(),
});

const taxIdentifiersSchema = z.strictObject({
  tin: z.string().optional(),
  registration_number: z.string().optional(),
});

export function mapBusiness(row: Tables<"organizations">): Business {
  const taxIdentifiers = taxIdentifiersSchema.parse(row.tax_identifiers);
  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.display_name,
    businessType: BusinessTypeSchema.parse(row.business_type),
    industry: row.industry_code,
    country: z.literal("PH").parse(row.country_code),
    currency: z.literal("PHP").parse(row.currency_code),
    timezone: z.literal("Asia/Manila").parse(row.timezone),
    address: storedAddressSchema.parse(row.address),
    phone: row.phone,
    email: row.email,
    logo: row.logo_path,
    taxIdentifiers: {
      ...(taxIdentifiers.tin ? { tin: taxIdentifiers.tin } : {}),
      ...(taxIdentifiers.registration_number
        ? { registrationNumber: taxIdentifiers.registration_number }
        : {}),
    },
    status: BusinessStatusSchema.parse(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBranch(row: Tables<"branches">): Branch {
  return {
    id: row.id,
    businessId: row.organization_id,
    code: row.code,
    name: row.name,
    timezone: z.literal("Asia/Manila").parse(row.timezone),
    address: storedAddressSchema.parse(row.address),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusinessSettings(row: Tables<"business_settings">): BusinessSettings {
  return {
    businessId: row.organization_id,
    locale: z.enum(["en-PH", "fil-PH"]).parse(row.locale),
    dateFormat: z.enum(["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]).parse(row.date_format),
    weekStartsOn: row.week_starts_on,
    fiscalYearStartMonth: row.fiscal_year_start_month,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
