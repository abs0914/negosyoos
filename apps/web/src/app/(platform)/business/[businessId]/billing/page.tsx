import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { getSubscriptionDashboard, listPlans, listPaymentCheckouts, checkSubscriptionLimit, checkoutAvailability } from "@negosyo-os/billing/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { requestSubscriptionAction } from "../../billing-actions";
import { CheckoutForm } from "./checkout-form";

const human = (value: string) => value.replaceAll("_", " ");
const money = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount / 100);
const date = (value: string) => new Date(value).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" });
const limitLabel: Record<string, string> = { max_branches: "Branches", max_active_users: "Active users", monthly_transactions: "Monthly transactions" };

export default async function BillingPage({ params, searchParams }: {
  params: Promise<{ businessId: string }>; searchParams: Promise<{ checkout?: string; canceled?: string }>;
}) {
  const { businessId } = await params;
  const query = await searchParams;
  const [subscription, plans, user, payments, branches] = await Promise.all([
    getSubscriptionDashboard(businessId), listPlans(), requireAuthenticatedUser(), listPaymentCheckouts(businessId), checkSubscriptionLimit(businessId, "max_branches"),
  ]);
  const manage = await can(user, PERMISSIONS.subscriptionManage, { businessId });
  const current = plans.find(plan => plan.key === subscription.planKey);
  const available = checkoutAvailability();
  const returned = payments.find(payment => payment.id === query.checkout);
  const pending = payments.find(payment => payment.status === "open" || payment.status === "creating");
  const base = `/business/${businessId}/billing`;
  return <main className="mx-auto max-w-7xl space-y-8 px-5 py-10">
    <header className="rounded-3xl bg-primary p-8 text-primary-foreground">
      <p className="text-sm font-semibold opacity-75">Subscription & Billing</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
        <div><h1 className="text-3xl font-semibold">{current?.name ?? human(subscription.planKey)}</h1><p className="mt-2 opacity-80">Choose the plan that fits your business, and pay securely with PayMongo.</p></div>
        <div className="rounded-2xl bg-white/10 px-5 py-4"><p className="text-xs opacity-70">Current status</p><b className="mt-1 block capitalize">{human(subscription.status)}</b>
          {subscription.currentPeriodEnd ? <p className="mt-1 text-xs">Paid or trial access through {date(subscription.currentPeriodEnd)}</p> : null}
        </div>
      </div>
      {subscription.cancelAtPeriodEnd ? <p className="mt-5 text-sm">Your subscription is set to end after the current period.</p> : null}
    </header>
    {returned ? <section role="status" className="rounded-2xl border bg-card p-5">
      <p className="font-semibold">{returned.status === "paid" ? "Payment confirmed. Your subscription has been updated." : query.canceled === "1" ? "You returned without completing checkout. You can resume below." : "Waiting for payment confirmation from PayMongo."}</p>
      {returned.status !== "paid" ? <p className="mt-2 text-sm text-muted-foreground">Access updates after payment is confirmed. <a href={`${base}?checkout=${returned.id}`} className="font-semibold text-primary underline">Refresh payment status</a></p> : null}
    </section> : null}
    {pending ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <p className="font-semibold">Unfinished {human(pending.plan_key)} checkout · {money(pending.amount_centavos)} · {pending.billing_interval}</p>
      <p className="mt-1 text-sm">{pending.branch_limit} branch{pending.branch_limit === 1 ? "" : "es"} covered. Complete this checkout, or contact support to cancel it before selecting another plan.</p>
      {manage && pending.checkout_url ? <a href={pending.checkout_url} className="mt-3 inline-block font-semibold underline">Resume PayMongo checkout</a> : <p className="mt-2 text-sm">Checkout is being prepared. Contact support if it does not become available.</p>}
    </section> : null}
    {!available ? <p role="status" className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Online payments are not available yet. Contact your administrator to enable PayMongo.</p> : null}
    <section><h2 className="text-xl font-semibold">Plans</h2><p className="mt-1 text-sm text-muted-foreground">Annual billing includes two months free. Payments renew access for one month or one year; there are no automatic charges.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{plans.map(plan => {
        const active = plan.key === subscription.planKey;
        return <article className={`flex flex-col rounded-2xl border bg-card p-5 ${active ? "border-primary ring-2 ring-primary/10" : ""}`} key={plan.key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{active ? "Current plan" : `Tier ${plan.tierRank}`}</p>
          <h3 className="mt-1 text-xl font-semibold">{plan.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
          <ul className="mt-4 space-y-2 text-sm">{plan.features.slice(0, 7).map(feature => <li key={feature}>✓ {human(feature)}</li>)}</ul>
          <dl className="mt-4 space-y-2 border-t pt-4 text-xs">{plan.limits.map(limit => <div className="flex justify-between gap-2" key={limit.key}><dt className="text-muted-foreground">{limitLabel[limit.key]}</dt><dd className="font-semibold">{plan.key === "multi_branch" && limit.key === "max_branches" ? "3 + paid extras" : limit.limit ?? "No configured cap"}</dd></div>)}</dl>
          {plan.key === "free_assessment" ? <p className="mt-auto pt-5 text-xl font-semibold">Free</p> : manage ? <CheckoutForm businessId={businessId} plan={plan.key} available={available && !pending} current={active && subscription.provider === "paymongo"} minimumBranches={branches.used} currentBranchLimit={branches.limit ?? 3} /> : null}
        </article>;
      })}</div>
    </section>
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Renewal and cancellation</h2>
        <p className="mt-2 text-sm text-muted-foreground">Renewing the same plan and branch capacity adds time after your paid period. Changing plan or branch capacity starts a new period immediately, at the full price, without credit for unused time.</p>
        {manage && subscription.provider === "paymongo" && subscription.status === "active" && !subscription.cancelAtPeriodEnd ? <form className="mt-4" action={requestSubscriptionAction.bind(null, businessId, "cancel", subscription.planKey)}><button className="rounded-lg border px-4 py-2 text-sm font-semibold">End at period expiry</button></form> : null}
      </article>
      <article className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Secure hosted checkout</h2><p className="mt-2 text-sm text-muted-foreground">Choose from the payment methods available on PayMongo’s checkout page. Your payment details stay with PayMongo. A redirect back here alone does not confirm a payment.</p>
        <p className="mt-3 text-sm">Current branch capacity: <b>{subscription.limits.find(limit => limit.key === "max_branches")?.limit ?? "No configured cap"}</b> · {branches.used} in use</p>
      </article>
    </section>
    <section className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Payment history</h2>
      {payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Plan</th><th className="p-2">Period</th><th className="p-2">Amount</th><th className="p-2">Status</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id} className="border-b last:border-0"><td className="p-2">{date(payment.created_at)}</td><td className="p-2 capitalize">{human(payment.plan_key)}</td><td className="p-2">{payment.billing_interval}</td><td className="p-2">{money(payment.amount_centavos)}</td><td className="p-2 capitalize">{payment.status === "paid" ? "Paid" : payment.status === "void" ? "Canceled" : "Awaiting payment"}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>}
    </section>
  </main>;
}
