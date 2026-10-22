import { describe, expect, it } from "vitest";

import { BranchInputSchema, BusinessSettingsInputSchema, CreateBusinessInputSchema, TrialAdoptionEventSchema, TrialStatusSchema, TrialValueReportSchema } from "./schemas";

const validBusiness = {
  legalName: "Juan Retail Enterprises",
  tradeName: "Juan Store",
  businessType: "sole_proprietorship",
  industry: "retail",
  address: {
    line1: "123 Rizal Street",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
  },
  phone: "+639171234567",
  email: "owner@example.com",
};

describe("Business domain validation", () => {
  it("accepts a Philippine business with platform defaults supplied by persistence", () => {
    expect(CreateBusinessInputSchema.safeParse(validBusiness).success).toBe(true);
  });

  it("rejects unknown fields and invalid contact data", () => {
    expect(CreateBusinessInputSchema.safeParse({
      ...validBusiness,
      phone: "09171234567",
      organizationId: "client-controlled-tenant",
    }).success).toBe(false);
  });

  it("normalizes branch codes", () => {
    const branch = BranchInputSchema.parse({
      code: "  MAKATI-01 ",
      name: "Makati Branch",
      address: validBusiness.address,
    });
    expect(branch.code).toBe("makati-01");
  });

  it("normalizes an industry label into a machine key", () => {
    const business = CreateBusinessInputSchema.parse({
      ...validBusiness,
      industry: "  Laundry ",
    });
    expect(business.industry).toBe("laundry");
  });

  it("normalizes business theme colors and rejects invalid values", () => {
    const settings = BusinessSettingsInputSchema.parse({ locale: "en-PH", dateFormat: "MM/dd/yyyy", weekStartsOn: 0, fiscalYearStartMonth: 1, primaryColor: " #043F8D ", secondaryColor: "#df1a2c", accentColor: "#f9b405" });
    expect(settings.primaryColor).toBe("#043f8d");
    expect(BusinessSettingsInputSchema.safeParse({ ...settings, accentColor: "yellow" }).success).toBe(false);
  });

  it("validates trial lifecycle values and strict adoption events", () => {
    expect(TrialStatusSchema.safeParse("expiring").success).toBe(true);
    expect(TrialStatusSchema.safeParse("extended").success).toBe(false);
    expect(TrialAdoptionEventSchema.safeParse({ eventType: "report_viewed", resourceKey: "aging", idempotencyKey: "report-aging-1" }).success).toBe(true);
    expect(TrialAdoptionEventSchema.safeParse({ eventType: "login", resourceKey: "home", idempotencyKey: "login-home-1" }).success).toBe(false);
  });

  it("rejects unsupported values in calculated trial reports", () => {
    const result = TrialValueReportSchema.safeParse({ generatedAt: "now", estimatedSavings: 5000 });
    expect(result.success).toBe(false);
  });
});
