import Link from "next/link";
import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { listApprovalRequests } from "@negosyo-os/approvals/server";
import { getBusiness } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { getInventoryDashboard } from "@negosyo-os/inventory/server";
import { getReceivablesDashboard } from "@negosyo-os/invoices/server";
import { listModuleRegistry } from "@negosyo-os/modules/server";
import { getUnreadNotificationCount } from "@negosyo-os/notifications/server";
import { getNegosyoCoach } from "@negosyo-os/onboarding/server";
import { getSalesDashboard } from "@negosyo-os/sales/server";
import { Badge, Card, EmptyState, Icon, PageHeader, StatCard } from "@negosyo-os/ui";
import { buildBusinessDashboardViewModel } from "./business-dashboard";

async function safely<T>(enabled: boolean, loader: () => Promise<T>): Promise<T | undefined> { if (!enabled) return undefined; try { return await loader(); } catch { return undefined; } }

function WorkspaceShortcuts({ base }: { readonly base: string }) {
  const shortcuts = [[`${base}/branches`, "branches", "Branches"], [`${base}/settings`, "settings", "Settings"], [`${base}/notifications`, "bell", "Notifications"], [`${base}/modules`, "modules", "Modules"]] as const;
  return <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border">{shortcuts.map(([href, icon, label]) => <Link className="flex min-h-24 flex-col justify-between bg-card p-4 hover:bg-primary-soft" href={href} key={href}><Icon className="text-primary" name={icon} size={19}/><span className="text-sm font-bold">{label}</span></Link>)}</Card>;
}

export default async function BusinessPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params; const base = `/business/${businessId}`;
  const [business, user] = await Promise.all([getBusiness(businessId), requireAuthenticatedUser()]);
  const [moduleRead, salesRead, inventoryRead, invoicesRead, approvalRead, notificationRead, salesCreate, quotationsManage, expensesCreate, crmManage] = await Promise.all([
    can(user, PERMISSIONS.moduleRead, { businessId }), can(user, PERMISSIONS.salesRead, { businessId }), can(user, PERMISSIONS.inventoryRead, { businessId }), can(user, PERMISSIONS.invoicesRead, { businessId }), can(user, PERMISSIONS.approvalRead, { businessId }), can(user, PERMISSIONS.notificationRead, { businessId }), can(user, PERMISSIONS.salesCreate, { businessId }), can(user, PERMISSIONS.quotationsManage, { businessId }), can(user, PERMISSIONS.expensesCreate, { businessId }), can(user, PERMISSIONS.crmManage, { businessId }),
  ]);
  const registry = await safely(moduleRead, () => listModuleRegistry(businessId));
  const enabled = new Set((registry ?? []).filter((item) => item.businessModule?.enabled).map((item) => item.definition.key));
  const has = (key: string) => enabled.has(key);
  const [sales, inventory, receivables, approvals, unread, coach] = await Promise.all([
    safely(salesRead && has("sales"), () => getSalesDashboard(businessId)),
    safely(inventoryRead && has("inventory"), () => getInventoryDashboard(businessId)),
    safely(invoicesRead && has("invoicing"), () => getReceivablesDashboard(businessId)),
    safely(approvalRead, () => listApprovalRequests(businessId)),
    safely(notificationRead, () => getUnreadNotificationCount(businessId)),
    safely(true, () => getNegosyoCoach(businessId)),
  ]);
  const sources = {
    ...(sales ? { sales: { average: sales.averageSale, today: sales.todaySales, transactions: sales.todayTransactions } } : {}),
    ...(inventory ? { inventory: { lowStock: inventory.lowStockCount, outOfStock: inventory.outOfStockCount } } : {}),
    ...(receivables ? { receivables: { overdue: receivables.overdueAmount, total: receivables.totalReceivables } } : {}),
    ...(approvals ? { approvals: { pending: approvals.filter((item) => item.request.status === "pending").length } } : {}),
    ...(unread !== undefined ? { notifications: { unread } } : {}),
    ...(coach ? { coach: { completed: coach.completedCount, total: coach.totalCount } } : {}),
  };
  const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: business.currency, maximumFractionDigits: 0 });
  const quickActions = [
    ...(salesCreate && has("pos") ? [{ href: `${base}/pos`, icon: "sales", label: "New sale" }] : []),
    ...(quotationsManage && has("quotations") ? [{ href: `${base}/quotations/new`, icon: "quotations", label: "New quotation" }] : []),
    ...(expensesCreate && has("expenses") ? [{ href: `${base}/expenses/new`, icon: "expenses", label: "Add expense" }] : []),
    ...(crmManage && has("crm") ? [{ href: `${base}/customers/new`, icon: "customers", label: "Add customer" }] : []),
  ];
  const unavailable = [moduleRead && !registry ? "modules" : null, approvalRead && !approvals ? "approvals" : null, notificationRead && unread === undefined ? "notifications" : null, salesRead && has("sales") && !sales ? "sales" : null, inventoryRead && has("inventory") && !inventory ? "inventory" : null, invoicesRead && has("invoicing") && !receivables ? "receivables" : null].filter((item): item is string => item !== null);
  const view = buildBusinessDashboardViewModel(base, sources, unavailable);
  const today = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: business.timezone }).format(new Date());
  return <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:py-10 lg:px-8"><PageHeader eyebrow={today} title={<>Magandang araw. Here’s what’s happening at <span className="text-primary">{business.tradeName}</span>.</>} description="Start with the items that need attention, then move into today’s work." actions={quickActions.length ? <div className="flex flex-wrap gap-2">{quickActions.slice(0,2).map((action) => <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-bold shadow-sm hover:border-primary/25 hover:bg-primary-soft" href={action.href} key={action.href}><Icon name={action.icon} size={16}/>{action.label}</Link>)}</div> : undefined}/>
    {quickActions.length ? <section aria-label="Quick actions" className="mt-8 flex gap-2 overflow-x-auto pb-1 sm:hidden">{quickActions.map((action) => <Link className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-bold" href={action.href} key={action.href}><Icon name={action.icon} size={16}/>{action.label}</Link>)}</section> : null}
    <section aria-label="Today’s business summary" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Today’s receipt totals" value={sales ? money.format(sales.todaySales) : "—"} detail={sales ? `${sales.todayTransactions} transaction${sales.todayTransactions === 1 ? "" : "s"} completed today · before refunds` : has("sales") ? "Temporarily unavailable" : "Enable Sales to start tracking"} icon={<Icon name="sales" size={18}/>} tone="success"/><StatCard label="Average sale" value={sales ? money.format(sales.averageSale) : "—"} detail="Completed receipts before refunds, including tax" icon={<Icon name="reports" size={18}/>} tone="primary"/><StatCard label="Receivables" value={receivables ? money.format(receivables.totalReceivables) : "—"} detail={receivables?.overdueAmount ? `${money.format(receivables.overdueAmount)} overdue` : receivables ? "No recorded overdue balances" : "Receivables have not been checked"} icon={<Icon name="invoices" size={18}/>} tone={receivables?.overdueAmount ? "warning" : "neutral"}/><StatCard label="Stock alerts" value={inventory ? inventory.lowStockCount + inventory.outOfStockCount : "—"} detail={inventory ? `${inventory.outOfStockCount} out · ${inventory.lowStockCount} low` : has("inventory") ? "Temporarily unavailable" : "Enable Inventory to start tracking"} icon={<Icon name="inventory" size={18}/>} tone={inventory && inventory.lowStockCount + inventory.outOfStockCount > 0 ? "warning" : "neutral"}/></section>
    {unavailable.length ? <p className="mt-3 text-xs text-muted-foreground" role="status">Some {unavailable.join(", ")} information is temporarily unavailable. The rest of your workspace is ready.</p> : null}
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Needs your attention</h2><Badge tone={view.attention.length || unavailable.length ? "warning" : "neutral"}>{view.attention.length ? `${view.attention.length} to review` : view.attentionLabel}</Badge></div>{view.attention.length ? <Card className="divide-y overflow-hidden">{view.attention.slice(0,6).map((item, index) => <Link className="group flex min-h-17 items-center gap-4 px-5 py-4 hover:bg-muted/60" href={item.href} key={`${item.icon}-${index}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.tone === "warning" ? "bg-warning-soft text-warning-foreground" : "bg-primary-soft text-primary"}`}><Icon name={item.icon} size={18}/></span><p className="min-w-0 flex-1 text-sm font-semibold"><b className="tabular-nums">{item.icon === "invoices" ? money.format(item.count) : item.count}</b> {item.label}</p><Icon className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" name="chevron-right" size={17}/></Link>)}</Card> : <EmptyState icon={<Icon name="check" size={22}/>} title={view.attentionTitle} description={view.attentionDescription}/>}</section>
      <section><h2 className="mb-3 text-lg font-bold">Your next best step</h2>{coach ? <Card className="relative overflow-hidden bg-primary p-6 text-primary-foreground"><div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-accent/20 blur-2xl"/><div className="relative"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/12 text-accent"><Icon name="coach" size={20}/></span><p className="mt-6 text-[10px] font-black uppercase tracking-[.15em] text-accent">Negosyo Coach</p><h3 className="mt-2 text-2xl font-bold tracking-tight">{coach.currentTask ? coach.currentTask.title : "Review your first business results"}</h3><p className="mt-3 text-sm leading-6 text-white/72">{coach.currentTask ? coach.currentTask.reason : "Your available setup tasks are complete. Review your recorded sales and compare a receipt with the daily total. Receipt totals are not profit or cash flow."}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-accent" style={{ width: `${coach.totalCount ? Math.round(coach.completedCount / coach.totalCount * 100) : 0}%` }}/></div><Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-primary" href={coach.currentTask?.href ?? (salesRead && has("sales") ? `${base}/sales` : `${base}/coach`)}>{coach.currentTask?.actionLabel ?? (salesRead && has("sales") ? "Review sales" : "Review setup")} <Icon name="chevron-right" size={16}/></Link></div></Card> : <Card className="p-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name="modules" size={20}/></span><h3 className="mt-5 text-xl font-bold">Shape your workspace</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Enable the tools that match how this business sells, serves customers, and manages daily work.</p><Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground" href={`${base}/modules`}>Browse modules <Icon name="chevron-right" size={16}/></Link></Card>}</section></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent sales</h2>{sales?.recentSales.length ? <Link className="text-xs font-bold text-primary hover:underline" href={`${base}/sales`}>View all</Link> : null}</div>{sales?.recentSales.length ? <Card className="overflow-hidden"><div className="divide-y">{sales.recentSales.slice(0,5).map((sale) => <Link className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-muted/60" href={`${base}/sales/${sale.id}`} key={sale.id}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success"><Icon name="sales" size={16}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{sale.receiptNumber}</span><span className="block truncate text-xs text-muted-foreground">{sale.customer?.name ?? "Walk-in customer"}</span></span><span className="text-right"><b className="block text-sm tabular-nums">{money.format(sale.total)}</b><span className="text-[10px] capitalize text-muted-foreground">{sale.status.replaceAll("_", " ")}</span></span></Link>)}</div></Card> : <EmptyState title={sales ? "No sales recorded yet" : "Sales history is unavailable"} description={sales ? "Your recorded sales will appear here." : "Sales may be disabled, inaccessible to your role, or temporarily unavailable."} icon={<Icon name="sales" size={22}/>}/>}</section>
      <section><h2 className="mb-3 text-lg font-bold">Workspace shortcuts</h2><WorkspaceShortcuts base={base}/></section>
    </div>
    {!view.hasOperationalData ? <Card className="mt-6 border-dashed p-6 text-center"><p className="font-bold">Your workspace is ready for its first tools.</p><p className="mt-2 text-sm text-muted-foreground">Choose modules or follow Negosyo Coach to set up the way this business works.</p></Card> : null}
  </main>;
}
