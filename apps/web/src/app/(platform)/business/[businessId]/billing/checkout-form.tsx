"use client";

import { useActionState, useState } from "react";
import { checkoutQuote, EXTRA_BRANCH_PRICES, type BillingInterval, type PlanKey } from "@negosyo-os/billing";
import { checkoutSubscriptionAction } from "../../billing-actions";

const money = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount / 100);

export function CheckoutForm({ businessId, plan, available, current, minimumBranches, currentBranchLimit }: {
  businessId: string; plan: Exclude<PlanKey, "free_assessment">; available: boolean; current: boolean; minimumBranches: number; currentBranchLimit: number;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [branches, setBranches] = useState(Math.min(100, Math.max(3, minimumBranches, current ? currentBranchLimit : 3)));
  const [state, action, pending] = useActionState(checkoutSubscriptionAction.bind(null, businessId, plan), { error: null });
  const quote = checkoutQuote(plan, interval, branches);
  const insufficient = minimumBranches > quote.branchLimit;
  return <form action={action} className="mt-auto space-y-3 pt-5">
    <label className="block text-xs font-semibold">Billing period
      <select name="interval" value={interval} onChange={event => setInterval(event.target.value as BillingInterval)} className="mt-1 min-h-10 w-full rounded-lg border bg-background px-2 text-sm">
        <option value="monthly">Monthly</option><option value="annual">Annual · 2 months free</option>
      </select>
    </label>
    {plan === "multi_branch" ? <label className="block text-xs font-semibold">Total branches
      <input name="branches" type="number" min={Math.max(3, minimumBranches)} max={100} value={branches}
        onChange={event => setBranches(Math.min(100, Math.max(3, Math.trunc(Number(event.target.value)) || 3)))} className="mt-1 min-h-10 w-full rounded-lg border bg-background px-3 text-sm" />
      <span className="mt-1 block font-normal text-muted-foreground">3 included; each extra {money(EXTRA_BRANCH_PRICES[interval])}/{interval === "annual" ? "year" : "month"}.</span>
    </label> : null}
    <p className="text-xl font-semibold">{money(quote.amount)}<span className="text-xs font-normal text-muted-foreground"> / {interval === "annual" ? "year" : "month"}</span></p>
    <button disabled={!available || pending || insufficient} className="min-h-11 w-full rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? "Opening checkout…" : current && quote.branchLimit === currentBranchLimit ? "Renew with PayMongo" : "Pay with PayMongo"}
    </button>
    {insufficient ? <p className="text-xs text-muted-foreground">Choose enough capacity for your {minimumBranches} existing branches.</p> : null}
    {state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
  </form>;
}
