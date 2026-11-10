import type { LucideIcon, LucideProps } from "lucide-react";
import { createElement } from "react";
import { createLucideIcon } from "lucide-react";
import { Activity, Bell, Boxes, BriefcaseBusiness, Building2, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, ClipboardList, Clock3, CreditCard, FileCheck2, FileText, HandCoins, HeartHandshake, House, LayoutDashboard, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, Plus, ReceiptText, Search, Settings, ShieldCheck, ShoppingBasket, ShoppingCart, Sparkles, Store, Truck, UserRound, UsersRound, WalletCards, WandSparkles, Workflow, X } from "lucide-react";

const CirclePeso = createLucideIcon("circle-peso", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "circle" }],
  ["path", { d: "M9 17V7h3.5a3 3 0 0 1 0 6H9M7 9.5h10M7 12h10", key: "peso" }],
]);

const icons = {
  activity: Activity, alerts: Bell, approvals: ClipboardCheck, attendance: Clock3, bell: Bell, boxes: Boxes,
  branches: Building2, business: BriefcaseBusiness, calendar: CalendarDays, catalog: ShoppingBasket, check: Check,
  "chevron-down": ChevronDown, "chevron-left": ChevronLeft, "chevron-right": ChevronRight, coach: Sparkles, customers: UsersRound,
  dashboard: LayoutDashboard, delivery: Truck, expenses: ReceiptText, file: FileText, forms: ClipboardList,
  help: CircleHelp, home: House, inventory: Boxes, invoices: FileCheck2, loyalty: HeartHandshake, menu: Menu,
  modules: PackageSearch, notifications: Bell, objects: Boxes, payments: HandCoins, peso: CirclePeso, pos: Store,
  purchasing: ShoppingCart, quotations: FileText, receipt: ReceiptText, reports: ChartNoAxesCombined, sales: CirclePeso,
  search: Search, settings: Settings, shield: ShieldCheck, subscription: CreditCard, team: UsersRound,
  user: UserRound, wallet: WalletCards, wand: WandSparkles, workflow: Workflow, close: X,
  "panel-close": PanelLeftClose, "panel-open": PanelLeftOpen, plus: Plus,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
const aliases: Readonly<Record<string, IconName>> = {
  "badge-dollar-sign": "peso", product_catalog: "catalog", invoicing: "invoices", job_orders: "workflow", accounting: "reports", payroll: "wallet", compliance: "shield", "address-book": "customers", appointment: "calendar", "calendar-clock": "calendar",
  "clipboard-list": "approvals", crm: "customers", employees: "team", expense: "expenses",
  invoice: "invoices", "job-orders": "workflow", package: "inventory", quote: "quotations", truck: "delivery",
};

export function getIcon(name: string): LucideIcon {
  const normalized = aliases[name] ?? name;
  return icons[normalized as IconName] ?? BriefcaseBusiness;
}

export function Icon({ name, ...props }: LucideProps & { readonly name: string | undefined }) {
  const Component = getIcon(name ?? "business");
  return createElement(Component, { "aria-hidden": true, ...props });
}
