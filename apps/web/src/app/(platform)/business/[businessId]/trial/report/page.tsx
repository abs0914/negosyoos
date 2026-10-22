import Link from "next/link";

import {
  getBusiness,
  getBusinessTrialDashboard,
  getBusinessTrialValueReport,
} from "@negosyo-os/business/server";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const number = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 });
const when = (value: string) => new Date(value).toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" });

function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{children}</p>; }

export default async function TrialValueReportPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const [business, trial] = await Promise.all([
    getBusiness(businessId),
    getBusinessTrialDashboard(businessId),
  ]);

  if (trial.trialStatus === "not_started") {
    return <ReportUnavailable
      actionHref={`/business/${businessId}/templates`}
      actionLabel="Explore Business OS templates"
      businessId={businessId}
      description="Your 45-day report begins collecting factual activity after you activate your first Business OS. Your trial has not started yet."
      title="Activate a Business OS to start your report."
    />;
  }

  const canViewReport = (trial.daysElapsed ?? 0) >= 39 ||
    trial.trialStatus === "expired" ||
    trial.trialStatus === "converted";

  if (!canViewReport) {
    const daysUntilReport = Math.max(1, 40 - (trial.daysElapsed ?? 0));
    return <ReportUnavailable
      actionHref={`/business/${businessId}/trial`}
      actionLabel="View trial progress"
      businessId={businessId}
      description={`The transformation report becomes available on Day 40, after NegosyoOS has enough real activity to summarize. Check back in ${daysUntilReport} day${daysUntilReport === 1 ? "" : "s"}.`}
      title="Your transformation report is still being prepared."
    />;
  }

  const report = await getBusinessTrialValueReport(businessId);
  const setup = report.businessSetupCompleted;
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,var(--muted),transparent_38%)] px-5 py-10"><div className="mx-auto max-w-6xl space-y-6"><header className="overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl"><div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto]"><div><Link className="text-sm font-semibold opacity-75 hover:opacity-100" href={`/business/${businessId}/trial`}>← Trial progress</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.22em] opacity-70">45-Day Business Transformation Report</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{business.tradeName}</h1><p className="mt-4 max-w-2xl text-lg leading-8 opacity-85">A factual summary of what your business recorded and configured in NegosyoOS.</p></div><div className="self-end rounded-2xl bg-white/10 p-5 ring-1 ring-white/20"><p className="text-xs opacity-70">Report period</p><b className="mt-1 block">{when(report.periodStart)}</b><span className="text-sm opacity-70">through {when(report.periodEnd)}</span></div></div></header><section className="rounded-3xl border bg-card p-6 sm:p-8"><p className="text-sm font-semibold text-primary">Business Setup Completed</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Business OS",setup.businessOs],["Template version",`v${setup.templateVersion}`],["Branches",setup.branchesConfigured],["Modules enabled",setup.modulesEnabled],["Products configured",setup.productsConfigured]].map(([label,value])=><article className="rounded-2xl bg-muted/60 p-4" key={label}><p className="text-xs text-muted-foreground">{label}</p><b className="mt-2 block text-xl">{value}</b></article>)}</div><p className="mt-4 text-sm text-muted-foreground">Setup milestone: <b className="text-foreground">{setup.setupMilestoneCompleted?"Completed":"Still in progress"}</b></p></section><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Transactions Recorded",number.format(report.transactionsRecorded)],["Sales Recorded",money.format(report.salesRecorded)],["Expenses Tracked",`${report.expensesTracked.records} records`],["Customers Added",number.format(report.customersAdded)]].map(([label,value])=><article className="rounded-2xl border bg-card p-5" key={label}><p className="text-sm text-muted-foreground">{label}</p><b className="mt-2 block text-3xl">{value}</b></article>)}</section><div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">Inventory Managed</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted p-4"><b className="text-3xl">{report.inventoryManaged.stockMovements}</b><p className="mt-1 text-xs text-muted-foreground">Stock movements</p></div><div className="rounded-xl bg-muted p-4"><b className="text-3xl">{report.inventoryManaged.itemsAtOrBelowThreshold}</b><p className="mt-1 text-xs text-muted-foreground">At or below threshold now</p></div></div></section><section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">Outstanding Receivables</h2><b className="mt-4 block text-3xl">{money.format(report.outstandingReceivables.amount)}</b><p className="mt-1 text-sm text-muted-foreground">Across {report.outstandingReceivables.openInvoices} current open invoice{report.outstandingReceivables.openInvoices===1?"":"s"}</p></section></div><div className="grid gap-6 lg:grid-cols-2"><ProductList title="Most Popular Products" products={report.mostPopularProducts.map(item=>({name:`${item.productName} · ${item.variantName}`,detail:`${item.sku} · ${number.format(item.unitsSold)} units sold`}))} empty="No qualifying product sales were recorded during the report period."/><ProductList title="Slow Moving Products" products={report.slowMovingProducts.map(item=>({name:`${item.productName} · ${item.variantName}`,detail:`${item.sku} · ${number.format(item.quantityOnHand)} on hand · no recorded trial sales`}))} empty="No active tracked products currently meet the slow-moving definition."/></div><section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">Operational Insights</h2>{report.operationalInsights.length?<div className="mt-4 grid gap-3 sm:grid-cols-2">{report.operationalInsights.map(item=><article className="rounded-xl bg-muted/60 p-4" key={item.label}><p className="text-sm font-semibold">{item.label}</p><b className="mt-1 block text-2xl">{item.unit==="PHP"?money.format(item.value):`${number.format(item.value)} ${item.unit}`}</b><p className="mt-2 text-xs text-muted-foreground">Based on {item.evidence}.</p></article>)}</div>:<div className="mt-4"><Empty>More operational insights will appear as qualifying records are added.</Empty></div>}</section><div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">AI Recommendations</h2>{report.aiRecommendations.length?<ul className="mt-4 space-y-3">{report.aiRecommendations.map(item=><li className="rounded-xl bg-muted p-4" key={`${item.appliedAt}-${item.description}`}><b>{item.description}</b><p className="mt-1 text-xs text-muted-foreground">Applied after human review · {when(item.appliedAt)}</p></li>)}</ul>:<div className="mt-4"><Empty>No AI-proposed configuration change was approved during this period.</Empty></div>}</section><section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950"><h2 className="text-xl font-semibold">Potential Areas for Improvement</h2><ul className="mt-4 space-y-3">{report.potentialAreasForImprovement.map((item,index)=><li className="flex gap-3" key={item}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-200 text-sm font-bold">{index+1}</span><span>{item}</span></li>)}</ul></section></div><section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">System Features Used</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{report.systemFeaturesUsed.map(item=><article className="rounded-xl border p-4" key={item.name}><b>{item.name}</b><p className="mt-2 text-2xl font-semibold text-primary">{item.activityCount}</p><p className="text-xs text-muted-foreground">{item.evidence}</p></article>)}</div></section><details className="rounded-2xl border bg-card p-5 text-sm"><summary className="cursor-pointer font-semibold">How these results were calculated</summary><dl className="mt-4 grid gap-4 text-muted-foreground sm:grid-cols-2">{Object.entries(report.methodology).map(([key,value])=><div key={key}><dt className="font-semibold capitalize text-foreground">{key.replace(/([A-Z])/g," $1")}</dt><dd className="mt-1">{value}</dd></div>)}</dl><p className="mt-4 border-t pt-4 text-xs">Generated {new Date(report.generatedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}. No financial savings or unrecorded activity are estimated.</p></details><section className="rounded-3xl bg-foreground p-8 text-center text-background sm:p-12"><p className="text-sm font-semibold text-primary">Your next chapter</p><h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold sm:text-4xl">Your Business OS is now configured around how your business operates.</h2><p className="mx-auto mt-4 max-w-2xl opacity-70">Continue using the workflows, records, and insights your team has established.</p><Link className="mt-7 inline-grid min-h-12 place-items-center rounded-xl bg-primary px-7 font-bold text-primary-foreground" href={`/business/${businessId}/settings#subscription`}>View subscription options</Link></section></div></main>;
}

function ReportUnavailable({ actionHref, actionLabel, businessId, description, title }: {
  actionHref: string;
  actionLabel: string;
  businessId: string;
  description: string;
  title: string;
}) {
  return <main className="mx-auto max-w-4xl px-5 py-10"><section className="rounded-3xl border bg-card p-8 text-center sm:p-12"><Link className="text-sm font-semibold text-primary hover:underline" href={`/business/${businessId}/trial`}>← Trial progress</Link><p className="mt-8 text-sm font-semibold text-primary">45-Day Business Transformation Report</p><h1 className="mt-2 text-3xl font-semibold">{title}</h1><p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{description}</p><Link className="mt-7 inline-grid min-h-12 place-items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground" href={actionHref}>{actionLabel}</Link></section></main>;
}

function ProductList({title,products,empty}:{title:string;products:readonly{name:string;detail:string}[];empty:string}){return <section className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">{title}</h2>{products.length?<ol className="mt-4 space-y-3">{products.map((item,index)=><li className="flex items-center gap-3 rounded-xl bg-muted/60 p-3" key={item.detail}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background text-sm font-bold">{index+1}</span><div><b>{item.name}</b><p className="text-xs text-muted-foreground">{item.detail}</p></div></li>)}</ol>:<div className="mt-4"><Empty>{empty}</Empty></div>}</section>}
