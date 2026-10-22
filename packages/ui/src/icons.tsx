import type { LucideIcon, LucideProps } from "lucide-react";
import { createElement } from "react";
import { Activity, Bell, Boxes, BriefcaseBusiness, Building2, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, CircleHelp, ClipboardCheck, ClipboardList, Clock3, CreditCard, FileCheck2, FileText, HandCoins, HeartHandshake, House, LayoutDashboard, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, Plus, ReceiptText, Search, Settings, ShieldCheck, ShoppingBasket, ShoppingCart, Sparkles, Store, Truck, UserRound, UsersRound, WalletCards, WandSparkles, Workflow, X } from "lucide-react";

const icons = {
  activity: Activity, alerts: Bell, approvals: ClipboardCheck, attendance: Clock3, bell: Bell, boxes: Boxes,
  branches: Building2, business: BriefcaseBusiness, calendar: CalendarDays, catalog: ShoppingBasket, check: Check,
  "chevron-down": ChevronDown, "chevron-left": ChevronLeft, "chevron-right": ChevronRight, coach: Sparkles, customers: UsersRound,
  dashboard: LayoutDashboard, delivery: Truck, expenses: ReceiptText, file: FileText, forms: ClipboardList,
  help: CircleHelp, home: House, inventory: Boxes, invoices: FileCheck2, loyalty: HeartHandshake, menu: Menu,
  modules: PackageSearch, notifications: Bell, objects: Boxes, payments: HandCoins, pos: Store,
  purchasing: ShoppingCart, quotations: FileText, reports: ChartNoAxesCombined, sales: CircleDollarSign,
  search: Search, settings: Settings, shield: ShieldCheck, subscription: CreditCard, team: UsersRound,
  user: UserRound, wallet: WalletCards, wand: WandSparkles, workflow: Workflow, close: X,
  "panel-close": PanelLeftClose, "panel-open": PanelLeftOpen, plus: Plus,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
const aliases: Readonly<Record<string, IconName>> = {
  "address-book": "customers", appointment: "calendar", "calendar-clock": "calendar",
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
