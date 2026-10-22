export interface BusinessDashboardSources {
  readonly approvals?: { readonly pending: number };
  readonly coach?: { readonly completed: number; readonly total: number };
  readonly inventory?: { readonly lowStock: number; readonly outOfStock: number };
  readonly notifications?: { readonly unread: number };
  readonly receivables?: { readonly overdue: number; readonly total: number };
  readonly sales?: { readonly average: number; readonly today: number; readonly transactions: number };
}

export interface DashboardAttentionItem { readonly count: number; readonly href: string; readonly icon: string; readonly label: string; readonly tone: "warning" | "primary"; }
export interface BusinessDashboardViewModel {
  readonly attention: readonly DashboardAttentionItem[];
  readonly hasOperationalData: boolean;
  readonly attentionLabel: string;
  readonly attentionTitle: string;
  readonly attentionDescription: string;
}

export function buildBusinessDashboardViewModel(base: string, sources: BusinessDashboardSources, unavailable: readonly string[] = []): BusinessDashboardViewModel {
  const attention: DashboardAttentionItem[] = [];
  if (sources.inventory?.outOfStock) attention.push({ count: sources.inventory.outOfStock, href: `${base}/inventory`, icon: "inventory", label: "items are out of stock", tone: "warning" });
  if (sources.inventory?.lowStock) attention.push({ count: sources.inventory.lowStock, href: `${base}/inventory`, icon: "inventory", label: "items are running low", tone: "warning" });
  if (sources.receivables?.overdue) attention.push({ count: sources.receivables.overdue, href: `${base}/invoices`, icon: "invoices", label: "in overdue receivables", tone: "warning" });
  if (sources.approvals?.pending) attention.push({ count: sources.approvals.pending, href: `${base}/approvals`, icon: "approvals", label: "approvals are waiting", tone: "primary" });
  if (sources.notifications?.unread) attention.push({ count: sources.notifications.unread, href: `${base}/notifications`, icon: "bell", label: "unread notifications", tone: "primary" });
  const hasOperationalData = Boolean(sources.sales || sources.inventory || sources.receivables || sources.approvals || sources.notifications || sources.coach);
  return {
    attention, hasOperationalData,
    attentionLabel: unavailable.length ? "Incomplete summary" : "Recorded alerts",
    attentionTitle: unavailable.length ? "Some checks could not be completed" : "No alerts in the available records",
    attentionDescription: unavailable.length
      ? "Refresh to try again. Missing information does not mean there is nothing to review."
      : "This summary covers the records and tools you can access. Record today's work to keep it useful.",
  };
}
