import type { BusinessAddress, BusinessStatus, BusinessType, TrialMilestoneKey, TrialStatus } from "./schemas";

export interface Business {
  id: string;
  legalName: string;
  tradeName: string;
  businessType: BusinessType;
  industry: string;
  country: "PH";
  currency: "PHP";
  timezone: "Asia/Manila";
  address: BusinessAddress;
  phone: string | null;
  email: string | null;
  logo: string | null;
  taxIdentifiers: {
    tin?: string;
    registrationNumber?: string;
  };
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  status: "invited" | "active" | "suspended";
  joinedAt: string | null;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  businessId: string;
  code: string;
  name: string;
  timezone: "Asia/Manila";
  address: BusinessAddress;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  businessId: string;
  locale: "en-PH" | "fil-PH";
  dateFormat: "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  weekStartsOn: number;
  fiscalYearStartMonth: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrialAdoptionMetrics {
  transactionsRecorded: number;
  productsCreated: number;
  customersCreated: number;
  inventoryMovements: number;
  reportsViewed: number;
  aiRecommendationsUsed: number;
}

export interface TrialMilestone {
  key: TrialMilestoneKey;
  dueDay: 1 | 7 | 15 | 30 | 40 | 45;
  status: "pending" | "achieved";
  achievedAt: string | null;
  evidence: Record<string, unknown>;
}

export interface BusinessTrialDashboard {
  trialStartDate?: string;
  trialEndDate?: string;
  trialStatus: TrialStatus;
  convertedAt?: string | null;
  daysElapsed?: number;
  daysRemaining?: number;
  metrics: TrialAdoptionMetrics;
  milestones: readonly TrialMilestone[];
}
