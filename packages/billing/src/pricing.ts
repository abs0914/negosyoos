import { z } from "zod";
import type { PlanKey } from "./index";

export const BillingIntervalSchema = z.enum(["monthly", "annual"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;
export const PLAN_PRICES = {
  starter: { monthly: 49900, annual: 499000 },
  pro: { monthly: 129900, annual: 1299000 },
  growth: { monthly: 249900, annual: 2499000 },
  multi_branch: { monthly: 499900, annual: 4999000 },
} as const;
export const EXTRA_BRANCH_PRICES = { monthly: 125000, annual: 1250000 } as const;
export const BASE_BRANCH_LIMITS = { free_assessment: 1, starter: 1, pro: 1, growth: 3, multi_branch: 3 } as const;
export function checkoutQuote(plan: PlanKey, interval: BillingInterval, branches = 3) {
  BillingIntervalSchema.parse(interval);
  if (plan === "free_assessment") throw new Error("Free Assessment does not require payment.");
  const branchLimit = plan === "multi_branch" ? z.number().int().min(3).max(100).parse(branches) : BASE_BRANCH_LIMITS[plan];
  const extraBranches = plan === "multi_branch" ? branchLimit - 3 : 0;
  return { amount: PLAN_PRICES[plan][interval] + extraBranches * EXTRA_BRANCH_PRICES[interval], branchLimit, interval };
}
