import Link from "next/link";
import { Icon } from "@negosyo-os/ui";

/** Shared navigation, deliberately independent of the lazy 3D renderer. */
export function DashboardViewSwitch({ businessId, active }: { businessId: string; active: "numbers" | "world" }) {
  const base = `/business/${businessId}`;
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Business dashboard</p><p className="mt-1 text-xs text-muted-foreground">Choose how you see your business.</p></div>
    <nav aria-label="Dashboard view" className="inline-flex rounded-xl border border-border bg-card p-1">
      {([{ key: "numbers", label: "Numbers", icon: "reports", href: base }, { key: "world", label: "3D World", icon: "business", href: `${base}/world` }] as const).map(view => <Link key={view.key} href={view.href} prefetch={false} aria-current={active === view.key ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active === view.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary-soft hover:text-primary"}`}><Icon name={view.icon} size={17} />{view.label}</Link>)}
    </nav>
  </div>;
}

export function WorldDashboardFeature({ businessId }: { businessId: string }) {
  return <section aria-labelledby="world-dashboard-feature" className="my-5 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-primary/20 bg-primary-soft p-5 sm:p-6">
    <div className="flex min-w-0 flex-1 items-start gap-4"><span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Icon name="business" size={28} /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">A new way to see your business</p><h2 id="world-dashboard-feature" className="mt-1 text-xl font-bold tracking-tight">Your dashboard, in 3D.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Explore your store, stock, customers, and deliveries in an interactive world. Select an area to see its recorded numbers and what needs attention.</p></div></div>
    <Link href={`/business/${businessId}/world`} prefetch={false} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Explore 3D dashboard <Icon name="chevron-right" size={17} /></Link>
  </section>;
}
