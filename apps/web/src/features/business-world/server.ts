import "server-only";
import { can, requireAuthenticatedUser, requireOrganizationMembership } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { getBusiness, getBusinessSettings, listBranches } from "@negosyo-os/business/server";
import { getSalesDashboard } from "@negosyo-os/sales/server";
import { getInventoryDashboard, listInventoryLocations } from "@negosyo-os/inventory/server";
import { getPurchasingDashboard } from "@negosyo-os/purchasing/server";
import { getReceivablesDashboard } from "@negosyo-os/invoices/server";
import { PERMISSIONS, type Permission } from "@negosyo-os/core/permissions";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { z } from "zod";
import { ConfigSchema, PreferencesSchema, defaultPreferences, suggestWorld, suggestionKey, zoneLabel, type BusinessWorldSnapshot, type WorldMetric, type WorldZone, type ZoneId } from "./model";
import { worldEnabled } from "./flag";

export async function worldAccess(id: string) {
  z.uuid().parse(id);
  if (!worldEnabled(id)) throw new AppError({ code: ERROR_CODES.resourceNotFound, status: 404, message: "World is not enabled for this business." });
  const client = await createClient();
  await requireOrganizationMembership(id, client);
  const user = await requireAuthenticatedUser(client);
  return { client, user };
}
const metric = (label: string, value: number, format: WorldMetric["format"] = "count"): WorldMetric => ({ label, value, format });
// Count in Postgres, never infer a business total from a capped list response.
async function counted(request: PromiseLike<{ count: number | null; error: unknown }>) {
  const result = await request;
  if (result.error || result.count === null) throw new Error("Metric unavailable");
  return result.count;
}
export async function getWorldSnapshot(businessId: string, requestedBranch: string | null = null): Promise<BusinessWorldSnapshot> {
  const { client, user } = await worldAccess(businessId);
  if (requestedBranch) z.uuid().parse(requestedBranch);
  const allowed = async (permission: Permission, branch = requestedBranch) => can(user, permission, { businessId, ...(branch ? { branchId: branch } : {}) }, client);
  const [business, settings, modulesResult, saved, preferences, manage, readBranches, readInventory, discover] = await Promise.all([
    getBusiness(businessId), getBusinessSettings(businessId), client.rpc("business_world_modules", { requested_organization_id: businessId }),
    client.from("business_world_configs").select("*").eq("organization_id", businessId).maybeSingle(),
    client.from("business_world_preferences").select("*").eq("organization_id", businessId).eq("user_id", user.id).maybeSingle(),
    allowed(PERMISSIONS.settingsManage, null), allowed(PERMISSIONS.branchRead, null), allowed(PERMISSIONS.inventoryRead, null), allowed(PERMISSIONS.moduleRead, null),
  ]);
  if (modulesResult.error || saved.error || preferences.error) throw new Error("World configuration could not be loaded");
  const modules = modulesResult.data ?? [];
  const branches = readBranches ? (await listBranches(businessId)).filter(b => b.isActive) : [];
  const accessibleBranches = (await Promise.all(branches.map(async b => await allowed(PERMISSIONS.organizationRead, b.id) ? b : null))).filter(b => b !== null);
  if (requestedBranch && !accessibleBranches.some(b => b.id === requestedBranch)) throw new AppError({ code: ERROR_CODES.permissionDenied, status: 403, message: "Branch access unavailable." });
  const locations = readInventory && modules.includes("inventory") ? await listInventoryLocations(businessId).catch(() => null) : [];
  const suggested = suggestWorld(business.industry, modules, (locations ?? []).filter(l => l.isActive).map(l => l.type), accessibleBranches.length);
  const key = suggestionKey(business.industry, modules, (locations ?? []).map(l => `${l.id}:${l.type}:${l.isActive}`), accessibleBranches.map(b => b.id));
  const parsedConfig = ConfigSchema.safeParse(saved.data?.config);
  const config = parsedConfig.success ? parsedConfig.data : suggested;
  const now = new Date().toISOString();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const dayStart = new Date(`${date}T00:00:00+08:00`).toISOString();
  const dayEnd = new Date(new Date(dayStart).getTime() + 86400000).toISOString();
  const base = `/business/${businessId}`;
  const topics = new Set([`world:${businessId}:config`]);
  const zones: WorldZone[] = [];
  type Spec = { id: ZoneId; domain: string; permission: Permission; path: string; period?: string; branch?: boolean; load: () => Promise<{ metrics: WorldMetric[]; alert?: boolean; note?: string }>; extra?: { label: string; path: string; permission: Permission; module?: string }[] };
  const inventory = () => getInventoryDashboard(businessId, requestedBranch ?? undefined);
  let inventoryPromise: ReturnType<typeof inventory> | undefined;
  const loadInventory = () => inventoryPromise ??= inventory();
  const specs: Spec[] = [
    { id: "sales", domain: "sales", permission: PERMISSIONS.salesRead, path: "/sales", period: `Today · ${date} · Asia/Manila`, branch: true,
      load: async () => { const d = await getSalesDashboard(businessId, requestedBranch ?? undefined); return { metrics: [metric("Receipt totals", d.todaySales, "money"), metric("Transactions", d.todayTransactions), metric("Average receipt", d.averageSale, "money")], note: "Original completed receipts, including tax, before returns and refunds. Not profit or cash flow." }; }, extra: [{ label: "Open POS", path: "/pos", permission: PERMISSIONS.salesCreate, module: "pos" }] },
    { id: "shelves", domain: "inventory", permission: PERMISSIONS.inventoryRead, path: "/inventory", branch: true, load: async () => { const d = await loadInventory(); return { metrics: [metric("Low-stock item/location pairs", d.lowStockCount), metric("Out-of-stock item/location pairs", d.outOfStockCount)], alert: d.lowStockCount + d.outOfStockCount > 0 }; } },
    { id: "warehouse", domain: "inventory", permission: PERMISSIONS.inventoryRead, path: "/inventory", branch: true, load: async () => { const d = await loadInventory(); if (!locations) throw new Error("Locations unavailable"); return { metrics: [metric("Inventory value", d.currentInventoryValue, "money"), metric("Active locations", locations.filter(l => l.isActive && (!requestedBranch || l.branchId === requestedBranch)).length), metric("Recent movements shown", d.recentMovements.length), ...(d.locationTotals ?? []).slice(0, 6).map(l => metric(`${l.name} · stock units`, l.quantity))], note: "Up to six grouped locations are shown. Review inventory for all locations and dated movement history." }; }, extra: [{ label: "Receive stock", path: "/purchasing", permission: PERMISSIONS.purchasingReceive, module: "purchasing" }, { label: "Transfer stock", path: "/inventory", permission: PERMISSIONS.inventoryTransfer }] },
    { id: "purchasing", domain: "purchasing", permission: PERMISSIONS.purchasingRead, path: "/purchasing", load: async () => { const d = await getPurchasingDashboard(businessId); return { metrics: [metric("Open purchase orders", d.openOrders), metric("Partially received", d.partiallyReceived), metric("Pending approvals", d.pendingApprovals)], alert: d.pendingApprovals > 0 }; }, extra: [{ label: "Create purchase order", path: "/purchasing/new", permission: PERMISSIONS.purchasingManage }] },
    { id: "crm", domain: "crm", permission: PERMISSIONS.crmRead, path: "/customers", branch: true, load: async () => {
      const query = () => { const q = client.from("sales_customers").select("id", { count: "exact", head: true }).eq("organization_id", businessId); return requestedBranch ? q.eq("branch_id", requestedBranch) : q; };
      const [total, recent] = await Promise.all([counted(query()), counted(query().gte("last_transaction_at", dayStart).lt("last_transaction_at", dayEnd))]);
      return { metrics: [metric("Recorded customers", total), metric("Customers with activity today", recent)], note: "Recorded customer activity only; decorative people do not measure foot traffic." };
    }, extra: [{ label: "Add a customer", path: "/customers", permission: PERMISSIONS.crmManage }] },
    { id: "delivery", domain: "delivery", permission: PERMISSIONS.deliveryRead, path: "/deliveries", branch: true, load: async () => {
      const query = () => { const q = client.from("deliveries").select("id", { count: "exact", head: true }).eq("organization_id", businessId); return requestedBranch ? q.eq("source_branch_id", requestedBranch) : q; };
      const [scheduled, moving, failed, overdue] = await Promise.all([counted(query().eq("status", "scheduled")), counted(query().eq("status", "out_for_delivery")), counted(query().eq("status", "failed")), counted(query().in("status", ["pending", "scheduled", "assigned", "out_for_delivery"]).lt("scheduled_at", now))]);
      return { metrics: [metric("Scheduled", scheduled), metric("Out for delivery", moving), metric("Failed", failed), metric("Overdue scheduled work", overdue)], alert: failed + overdue > 0, note: "Recorded delivery status, not geographic or GPS tracking." };
    } },
    { id: "invoicing", domain: "invoicing", permission: PERMISSIONS.invoicesRead, path: "/invoices", load: async () => { const d = await getReceivablesDashboard(businessId); return { metrics: [metric("Receivables", d.totalReceivables, "money"), metric("Overdue balances", d.overdueAmount, "money")], alert: d.overdueAmount > 0 }; } },
    { id: "appointments", domain: "appointments", permission: PERMISSIONS.appointmentsRead, path: "/appointments", branch: true, period: `Today · ${date}`, load: async () => { let q = client.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", businessId).eq("appointment_date", date); if (requestedBranch) q = q.eq("branch_id", requestedBranch); return { metrics: [metric("Recorded appointments today", await counted(q))] }; } },
    { id: "job_orders", domain: "job_orders", permission: PERMISSIONS.jobOrdersRead, path: "/job-orders", branch: true, load: async () => { let q = client.from("job_orders").select("id", { count: "exact", head: true }).eq("organization_id", businessId); if (requestedBranch) q = q.eq("branch_id", requestedBranch); return { metrics: [metric("Recorded jobs", await counted(q))] }; } },
    { id: "employees", domain: "employees", permission: PERMISSIONS.employeeRead, path: "/employees", branch: true, load: async () => { let q = client.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", businessId).eq("employment_status", "active"); if (requestedBranch) q = q.eq("branch_id", requestedBranch); return { metrics: [metric("Active team members", await counted(q))] }; } },
  ];
  await Promise.all(specs.map(async spec => {
    if (!(await allowed(spec.permission))) return;
    const enabled = modules.includes(spec.domain);
    // Expansion zones appear for compatible enabled modules; retail setup remains focused.
    if (!enabled && (!discover || ["appointments", "job_orders", "employees"].includes(spec.id))) return;
    const zone: WorldZone = { id: spec.id, domain: spec.domain, label: zoneLabel(spec.id, config), state: "disabled", scope: requestedBranch ? "branch" : "business", period: spec.period ?? "Current records", metrics: [], actions: [], alert: false, updatedAt: null, revision: "" };
    if (!enabled) { zone.note = "Tool not enabled. Configure it in Business tools."; zone.actions = [{ label: "Explore setup", href: `${base}/modules` }]; zones.push(zone); return; }
    topics.add(`world:${businessId}:${spec.domain}`);
    zone.actions = [{ label: `Review ${zone.label.toLowerCase()}`, href: `${base}${spec.path}` }];
    for (const action of spec.extra ?? []) if ((!action.module || modules.includes(action.module)) && await allowed(action.permission)) zone.actions.push({ label: action.label, href: `${base}${action.path}` });
    if (requestedBranch && !spec.branch) { zone.state = "unavailable"; zone.note = "This metric supports business-wide scope only. Select All accessible branches to view it."; zones.push(zone); return; }
    try {
      const result = await spec.load(); zone.metrics = result.metrics; zone.alert = result.alert ?? false;
      if (result.note) zone.note = result.note;
      zone.state = result.metrics.some(m => m.value !== 0) ? "ready" : "empty"; zone.updatedAt = now; zone.revision = JSON.stringify(result.metrics);
    } catch { zone.state = "unavailable"; zone.note = "This area's data could not be refreshed. Open its page or retry."; }
    zones.push(zone);
  }));
  return { businessId, businessName: business.tradeName, branchId: requestedBranch, branchName: accessibleBranches.find(b => b.id === requestedBranch)?.name ?? null, generatedAt: now, date, zones, topics: [...topics].sort(), config, suggested, suggestionKey: key, suggestionChanged: !!saved.data && locations !== null && saved.data.suggestion_key !== key, configCompatible: !saved.data || parsedConfig.success, canManage: manage, branches: accessibleBranches.map(b => ({ id: b.id, name: b.name })), colors: { primary: settings.primaryColor, secondary: settings.secondaryColor, accent: settings.accentColor }, preferences: PreferencesSchema.parse(preferences.data ? { landing_view: preferences.data.landing_view, branch_id: preferences.data.branch_id, motion: preferences.data.motion, representation: preferences.data.representation } : defaultPreferences) };
}
