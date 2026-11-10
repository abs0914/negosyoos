import { defaultPreferences, type BusinessWorldConfig, type BusinessWorldSnapshot, type WorldMetric, type WorldZone } from "@/features/business-world/model";

// Fictional, static marketing data. It never reads or writes business records.
const metric = (label: string, value: number, format: WorldMetric["format"] = "count"): WorldMetric => ({ label, value, format });
const zone = (id: WorldZone["id"], label: string, metrics: WorldMetric[], alert: boolean, note: string): WorldZone => ({
  id, domain: id, label, state: "ready", scope: "business", period: "Example day", metrics, actions: [], alert, note, updatedAt: null, revision: "demo",
});

export const demoWorldConfig: BusinessWorldConfig = { version: 1, industry: "retail", service: "in_store", storage: "both", fulfillment: "both", presentation: "spacious" };

export const demoWorldSnapshot: BusinessWorldSnapshot = {
  businessId: "demo", businessName: "Sampaguita Home Supply", branchId: null, branchName: null,
  generatedAt: "2026-11-09T10:00:00.000Z", date: "Example day",
  zones: [
    zone("sales", "Storefront & checkout", [metric("Receipt totals", 18967, "money"), metric("Transactions", 32), metric("Average receipt", 592.72, "money")], false, "A steady day at the counter."),
    zone("shelves", "Shop shelves", [metric("Low-stock items", 3), metric("Out of stock", 1)], true, "Interior paint is running low. Time to plan a restock."),
    zone("warehouse", "Stock storage", [metric("Inventory value", 226242, "money"), metric("Stock locations", 2)], false, "The warehouse has stock ready to move to the store."),
    zone("purchasing", "Supplier bay", [metric("Open purchase orders", 2), metric("Waiting for approval", 1)], true, "One draft order is waiting for the owner's review."),
    zone("crm", "Customers", [metric("Customers", 13), metric("Visited today", 9)], false, "Regulars and contractors, all in one list."),
    zone("delivery", "Delivery area", [metric("Scheduled", 4), metric("Out for delivery", 1)], false, "One order is on its way. Status comes from your records, not GPS."),
    zone("invoicing", "Accounts desk", [metric("Receivables", 19950, "money"), metric("Overdue balances", 11500, "money")], true, "Two contractor accounts are past due."),
  ],
  topics: [], config: demoWorldConfig, suggested: demoWorldConfig, suggestionKey: "demo", suggestionChanged: false, configCompatible: true, canManage: false, branches: [],
  colors: { primary: "#043f8d", secondary: "#df1a2c", accent: "#f9b405" },
  preferences: { ...defaultPreferences, landing_view: "world" },
};
