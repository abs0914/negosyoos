import { z } from "zod";

export const BusinessIdSchema = z.uuid("Invalid business identifier.");

export const BusinessTypeSchema = z.enum([
  "sole_proprietorship",
  "partnership",
  "corporation",
  "cooperative",
  "other",
]);

export const BusinessStatusSchema = z.enum(["active", "suspended", "archived"]);

export const BusinessAddressSchema = z.strictObject({
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  barangay: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Use a four-digit Philippine postal code.").optional(),
});

const OptionalPhoneSchema = z.union([
  z.literal(""),
  z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +639171234567."),
]);

const OptionalEmailSchema = z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email())]);

export const CreateBusinessInputSchema = z.strictObject({
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().min(2).max(200),
  businessType: BusinessTypeSchema,
  industry: z.string().trim().toLowerCase().regex(
    /^[a-z][a-z0-9-]*$/,
    "Use letters, numbers, and hyphens, starting with a letter.",
  ).max(80),
  address: BusinessAddressSchema,
  phone: OptionalPhoneSchema,
  email: OptionalEmailSchema,
  tin: z.string().trim().max(40).optional(),
  registrationNumber: z.string().trim().max(80).optional(),
});

export const UpdateBusinessInputSchema = CreateBusinessInputSchema.extend({
  status: BusinessStatusSchema,
});

export const ThemeColorSchema = z.string().trim().toLowerCase().regex(/^#[0-9a-f]{6}$/, "Use a six-digit hex color, for example #043f8d.");

export const BusinessSettingsInputSchema = z.strictObject({
  locale: z.enum(["en-PH", "fil-PH"]),
  dateFormat: z.enum(["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  primaryColor: ThemeColorSchema.default("#043f8d"),
  secondaryColor: ThemeColorSchema.default("#df1a2c"),
  accentColor: ThemeColorSchema.default("#f9b405"),
});

export const BranchInputSchema = z.strictObject({
  code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9-]*$/).max(40),
  name: z.string().trim().min(2).max(160),
  address: BusinessAddressSchema,
});

export const UpdateBranchInputSchema = BranchInputSchema.extend({
  branchId: z.uuid(),
  isActive: z.boolean(),
});

export const TrialStatusSchema = z.enum(["not_started", "active", "expiring", "expired", "converted"]);
export const TrialMilestoneKeySchema = z.enum([
  "day_1_os_created", "day_7_setup", "day_15_operational", "day_30_insights", "day_40_value_report", "day_45_conversion",
]);
export const TrialAdoptionEventSchema = z.strictObject({
  eventType: z.enum(["report_viewed", "trial_value_report_viewed"]),
  resourceKey: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(8).max(180),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const ReportProductSchema = z.strictObject({
  productName: z.string(), variantName: z.string(), sku: z.string(), unitsSold: z.number(),
});
export const TrialValueReportSchema = z.strictObject({
  generatedAt: z.string(), periodStart: z.string(), periodEnd: z.string(), currency: z.literal("PHP"), trialStatus: TrialStatusSchema,
  businessSetupCompleted: z.strictObject({ businessOs: z.string(), templateVersion: z.number().int(), branchesConfigured: z.number().int().nonnegative(), modulesEnabled: z.number().int().nonnegative(), productsConfigured: z.number().int().nonnegative(), setupMilestoneCompleted: z.boolean() }),
  transactionsRecorded: z.number().int().nonnegative(), salesRecorded: z.number(),
  expensesTracked: z.strictObject({ records: z.number().int().nonnegative(), approvedAmount: z.number().nonnegative() }),
  inventoryManaged: z.strictObject({ stockMovements: z.number().int().nonnegative(), itemsAtOrBelowThreshold: z.number().int().nonnegative() }),
  customersAdded: z.number().int().nonnegative(), mostPopularProducts: z.array(ReportProductSchema),
  slowMovingProducts: z.array(ReportProductSchema.omit({ unitsSold: true }).extend({ quantityOnHand: z.number(), unitsSold: z.literal(0) })),
  outstandingReceivables: z.strictObject({ openInvoices: z.number().int().nonnegative(), amount: z.number().nonnegative() }),
  operationalInsights: z.array(z.strictObject({ label: z.string(), value: z.number(), unit: z.string(), evidence: z.string() })),
  aiRecommendations: z.array(z.strictObject({ description: z.string(), appliedAt: z.string() })),
  potentialAreasForImprovement: z.array(z.string()),
  systemFeaturesUsed: z.array(z.strictObject({ name: z.string(), activityCount: z.number().int().nonnegative(), evidence: z.string() })),
  methodology: z.strictObject({ sales: z.string(), expenses: z.string(), slowMoving: z.string(), receivables: z.string() }),
});

export type BusinessType = z.infer<typeof BusinessTypeSchema>;
export type BusinessStatus = z.infer<typeof BusinessStatusSchema>;
export type BusinessAddress = z.infer<typeof BusinessAddressSchema>;
export type CreateBusinessInput = z.infer<typeof CreateBusinessInputSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessInputSchema>;
export type BusinessSettingsInput = z.infer<typeof BusinessSettingsInputSchema>;
export type BranchInput = z.infer<typeof BranchInputSchema>;
export type UpdateBranchInput = z.infer<typeof UpdateBranchInputSchema>;
export type TrialStatus = z.infer<typeof TrialStatusSchema>;
export type TrialMilestoneKey = z.infer<typeof TrialMilestoneKeySchema>;
export type TrialAdoptionEvent = z.infer<typeof TrialAdoptionEventSchema>;
export type TrialValueReport = z.infer<typeof TrialValueReportSchema>;
