import { z } from "zod";

export const industries = { retail: "Retail & hardware", food_restaurant: "Food & restaurant", salon_service: "Salon & services", repair_services: "Repair & laundry", wholesale_distribution: "Wholesale & distribution", professional_services: "Professional services", other: "Other / mixed" } as const;
export const zoneIds = ["sales", "shelves", "warehouse", "purchasing", "crm", "delivery", "invoicing", "appointments", "job_orders", "employees"] as const;
export type ZoneId = typeof zoneIds[number];
export const ConfigSchema = z.strictObject({
  version: z.literal(1), industry: z.enum(Object.keys(industries) as [keyof typeof industries, ...(keyof typeof industries)[]]),
  service: z.enum(["in_store", "online", "both"]), storage: z.enum(["none", "stockroom", "warehouse", "both"]),
  fulfillment: z.enum(["pickup", "delivery", "both"]), presentation: z.enum(["compact", "spacious"]),
  visibleZones: z.array(z.enum(zoneIds)).max(zoneIds.length).optional(),
});
export type BusinessWorldConfig = z.infer<typeof ConfigSchema>;
export const PreferencesSchema = z.strictObject({ landing_view: z.enum(["dashboard", "world"]), branch_id: z.uuid().nullable(), motion: z.enum(["system", "paused", "enabled"]), representation: z.enum(["3d", "2d"]) });
export type WorldPreferences = z.infer<typeof PreferencesSchema>;
export const defaultPreferences: WorldPreferences = { landing_view: "dashboard", branch_id: null, motion: "system", representation: "3d" };
export type WorldMetric = { label: string; value: number; format: "count" | "money"; note?: string };
export type WorldZone = { id: ZoneId; domain: string; label: string; state: "ready" | "empty" | "disabled" | "unavailable"; scope: "business" | "branch"; period: string; metrics: WorldMetric[]; actions: { label: string; href: string }[]; alert: boolean; note?: string; updatedAt: string | null; revision: string };
export interface BusinessWorldSnapshot {
  businessId: string; businessName: string; branchId: string | null; branchName: string | null;
  generatedAt: string; date: string; zones: WorldZone[]; topics: string[];
  config: BusinessWorldConfig; suggested: BusinessWorldConfig; suggestionKey: string; suggestionChanged: boolean;
  configCompatible: boolean; canManage: boolean; branches: { id: string; name: string }[];
  colors: { primary: string; secondary: string; accent: string }; preferences: WorldPreferences;
}
export function suggestWorld(industry: string, modules: readonly string[], locationTypes: readonly string[], branches: number): BusinessWorldConfig {
  const warehouse = locationTypes.includes("warehouse");
  const stockroom = locationTypes.some(t => t !== "warehouse");
  return { version: 1, industry: industry in industries ? industry as keyof typeof industries : "other", service: "in_store", storage: warehouse && stockroom ? "both" : warehouse ? "warehouse" : stockroom ? "stockroom" : "none", fulfillment: modules.includes("delivery") ? "both" : "pickup", presentation: branches > 1 || warehouse ? "spacious" : "compact" };
}
export function suggestionKey(industry: string, modules: readonly string[], locations: readonly string[], branches: readonly string[]) {
  return JSON.stringify([industry, [...modules].sort(), [...locations].sort(), [...branches].sort()]);
}
const labels: Record<ZoneId, string> = { sales: "Storefront & checkout", shelves: "Shop shelves", warehouse: "Stock storage", purchasing: "Supplier bay", crm: "Customers", delivery: "Delivery area", invoicing: "Accounts desk", appointments: "Appointment desk", job_orders: "Workstations", employees: "Team area" };
const industryLabels: Partial<Record<BusinessWorldConfig["industry"], Partial<Record<ZoneId, string>>>> = {
  food_restaurant: { sales: "Dining & cashier", shelves: "Ingredient storage", warehouse: "Kitchen stores", delivery: "Takeaway & delivery", job_orders: "Kitchen" },
  salon_service: { sales: "Reception & checkout", shelves: "Product shelves", appointments: "Service stations", crm: "Client lounge" },
  repair_services: { sales: "Intake counter", shelves: "Parts & materials", job_orders: "Repair & laundry stations", delivery: "Collection area" },
  wholesale_distribution: { sales: "Trade counter", shelves: "Warehouse racks", purchasing: "Purchasing office", delivery: "Loading docks", crm: "Customer accounts" },
  professional_services: { sales: "Reception", crm: "Customer & project desk", invoicing: "Billing office", employees: "Team work area" },
  other: { sales: "Business hub" },
};
export function zoneLabel(id: ZoneId, config: BusinessWorldConfig) { return industryLabels[config.industry]?.[id] ?? (id === "sales" && config.service === "online" ? "Online storefront" : labels[id]); }
export function resolveScene(config: BusinessWorldConfig, zones: readonly WorldZone[]) {
  const step = config.presentation === "spacious" ? 4.8 : 4.1;
  return zoneIds.filter(id => zones.some(z => z.id === id) && (!config.visibleZones || config.visibleZones.includes(id)))
    .map((id, index, all) => ({ id, label: zoneLabel(id, config), position: [((index % 3) - 1) * step, 0, (Math.floor(index / 3) - (Math.ceil(all.length / 3) - 1) / 2) * step] as [number, number, number] }));
}
export function formatWorldMetric(metric: WorldMetric) { return new Intl.NumberFormat("en-PH", metric.format === "money" ? { style: "currency", currency: "PHP", maximumFractionDigits: 2 } : {}).format(metric.value); }
