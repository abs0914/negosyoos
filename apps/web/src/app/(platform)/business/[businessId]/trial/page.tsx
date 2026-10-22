import Link from "next/link";

import { getBusinessTrialDashboard } from "@negosyo-os/business/server";

import { viewTrialValueReportAction } from "../../trial-actions";

const milestoneCopy = {
  day_1_os_created: ["Day 1", "Business OS created", "Your configured workspace is ready."],
  day_7_setup: ["Day 7", "Setup completion", "Add a product or customer to establish your operating data."],
  day_15_operational: ["Day 15", "Operational usage", "Record a sale or inventory movement in your normal workflow."],
  day_30_insights: ["Day 30", "Business insights", "Use a report to turn activity into a decision."],
  day_40_value_report: ["Day 40", "Trial value report", "Review what your team has accomplished during the trial."],
  day_45_conversion: ["Day 45", "Conversion", "Continue with the Business OS that is working for you."],
} as const;

const metricCopy = {
  transactionsRecorded: "Transactions recorded",
  productsCreated: "Products created",
  customersCreated: "Customers created",
  inventoryMovements: "Inventory movements",
  reportsViewed: "Reports viewed",
  aiRecommendationsUsed: "AI recommendations used",
} as const;

export default async function TrialPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const trial = await getBusinessTrialDashboard(businessId);
  if (trial.trialStatus === "not_started") return <main className="mx-auto max-w-4xl px-5 py-10"><section className="rounded-3xl border bg-card p-8 text-center"><p className="text-sm font-semibold text-primary">45-day trial</p><h1 className="mt-2 text-3xl font-semibold">Your trial starts with your first Business OS.</h1><p className="mx-auto mt-3 max-w-xl text-muted-foreground">Explore the templates first. Your 45 days begin only when you activate one, and all configured MVP features are included during the trial.</p><Link className="mt-6 inline-grid min-h-12 place-items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground" href={`/business/${businessId}/templates`}>Explore Business OS templates</Link></section></main>;
  const completed = trial.milestones.filter(item => item.status === "achieved").length;
  const canViewValue = (trial.daysElapsed ?? 0) >= 39 || trial.trialStatus === "expired" || trial.trialStatus === "converted";
  return <main className="mx-auto max-w-6xl space-y-6 px-5 py-10"><header className="overflow-hidden rounded-3xl border bg-card"><div className="grid gap-6 p-7 md:grid-cols-[1fr_auto] md:p-9"><div><p className="text-sm font-semibold text-primary">Your 45-day Business OS trial</p><h1 className="mt-2 text-3xl font-semibold">{trial.trialStatus === "converted" ? "Your Business OS is active." : trial.trialStatus === "expired" ? "Your trial period is complete." : `${trial.daysRemaining} days to explore at your pace.`}</h1><p className="mt-3 max-w-2xl text-muted-foreground">Full access to the MVP features configured in your Business OS. Your records remain yours when the trial ends.</p></div><div className="grid h-32 w-32 place-items-center rounded-full bg-primary/10 text-center text-primary"><div><b className="text-4xl">{trial.trialStatus === "converted" ? "✓" : trial.daysRemaining}</b><span className="block text-xs font-semibold">{trial.trialStatus === "converted" ? "Converted" : "days remaining"}</span></div></div></div><div className="h-2 bg-muted"><div className="h-full rounded-r-full bg-primary transition-all" style={{ width: `${Math.min(100, ((trial.daysElapsed ?? 0) / 45) * 100)}%` }} /></div></header><section><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Meaningful adoption</h2><p className="mt-1 text-sm text-muted-foreground">Real work completed since activation—not logins or time spent.</p></div><span className="text-sm font-semibold text-primary">{completed} of 6 milestones</span></div><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">{Object.entries(trial.metrics).map(([key, value]) => <article className="rounded-2xl border bg-card p-4" key={key}><b className="text-3xl">{value}</b><p className="mt-2 text-xs leading-5 text-muted-foreground">{metricCopy[key as keyof typeof metricCopy]}</p></article>)}</div></section><section><h2 className="text-xl font-semibold">Trial journey</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{trial.milestones.map(item => { const [day, title, detail] = milestoneCopy[item.key]; return <article className={`rounded-2xl border p-5 ${item.status === "achieved" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "bg-card"}`} key={item.key}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide opacity-65">{day}</p><h3 className="mt-1 font-semibold">{title}</h3></div><span className="rounded-full bg-background/70 px-3 py-1 text-xs font-semibold">{item.status === "achieved" ? "Completed" : "Ahead"}</span></div><p className="mt-2 text-sm opacity-75">{detail}</p></article>; })}</div></section>{canViewValue ? <section className="rounded-3xl bg-primary p-7 text-primary-foreground"><p className="text-sm font-semibold opacity-75">Day 40 value report</p><h2 className="mt-2 text-2xl font-semibold">See the operating habits you built.</h2><p className="mt-2 max-w-2xl opacity-80">Your report summarizes adoption from business records. Viewing it counts once, even if you return later.</p><form action={viewTrialValueReportAction.bind(null, businessId)}><button className="mt-5 min-h-11 rounded-xl bg-white px-5 font-semibold text-primary">View and update my value report</button></form></section> : null}<footer className="rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">No pressure tactics, hidden deadlines, or lost work. We’ll show your status clearly and preserve your business data.</footer></main>;
}
