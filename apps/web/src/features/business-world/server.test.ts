import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  modules: ["sales", "inventory", "purchasing", "crm", "delivery", "invoicing"], denied: new Set<string>(),
  membership: vi.fn(), sales: vi.fn(), inventory: vi.fn(), purchasing: vi.fn(), receivables: vi.fn(),
  failCount: false, calls: [] as [string, string, unknown][],
}));
vi.mock("server-only", () => ({}));
vi.mock("./flag", () => ({ worldEnabled: () => true }));
vi.mock("@negosyo-os/auth", () => ({ requireAuthenticatedUser: async () => ({ id: "user" }), requireOrganizationMembership: mocks.membership, can: async (_user: unknown, permission: string) => !mocks.denied.has(permission) }));
vi.mock("@negosyo-os/auth/server", () => ({ createClient: async () => ({ rpc: async () => ({ data: mocks.modules, error: null }), from: (table: string) => query(table) }) }));
function query(table: string) {
  return {
    select: () => query(table), eq: (column: string, value: unknown) => { mocks.calls.push([table, column, value]); return query(table); },
    gte: () => query(table), lt: () => query(table), in: () => query(table),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (result: { count: number | null; error: unknown }) => unknown) => Promise.resolve({ count: mocks.failCount ? null : 0, error: mocks.failCount ? new Error("offline") : null }).then(resolve),
  };
}
vi.mock("@negosyo-os/business/server", () => ({
  getBusiness: async () => ({ tradeName: "Test Store", industry: "retail" }),
  getBusinessSettings: async () => ({ primaryColor: "#043f8d", secondaryColor: "#df1a2c", accentColor: "#f9b405" }),
  listBranches: async () => [{ id: "11111111-1111-4111-8111-111111111111", name: "Main", isActive: true }],
}));
vi.mock("@negosyo-os/sales/server", () => ({ getSalesDashboard: mocks.sales }));
vi.mock("@negosyo-os/inventory/server", () => ({ getInventoryDashboard: mocks.inventory, listInventoryLocations: async () => [], listInventoryOverview: async () => [] }));
vi.mock("@negosyo-os/purchasing/server", () => ({ getPurchasingDashboard: mocks.purchasing }));
vi.mock("@negosyo-os/invoices/server", () => ({ getReceivablesDashboard: mocks.receivables }));
import { getWorldSnapshot } from "./server";
const id = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.clearAllMocks(); mocks.denied.clear(); mocks.failCount = false; mocks.calls = [];
  mocks.modules = ["sales", "inventory", "purchasing", "crm", "delivery", "invoicing"];
  mocks.membership.mockResolvedValue({});
  mocks.sales.mockResolvedValue({ todaySales: 1500.25, todayTransactions: 3, averageSale: 500.0833 });
  mocks.inventory.mockResolvedValue({ currentInventoryValue: 900, lowStockCount: 2, outOfStockCount: 1, recentMovements: [] });
  mocks.purchasing.mockResolvedValue({ openOrders: 4, pendingApprovals: 1, partiallyReceived: 2 });
  mocks.receivables.mockResolvedValue({ totalReceivables: 900, overdueAmount: 100 });
});
describe("authorized World snapshots", () => {
  it("uses the existing receipt and inventory metric definitions", async () => {
    const s = await getWorldSnapshot(id);
    expect(s.zones.find(z => z.id === "sales")?.metrics[0]?.value).toBe(1500.25);
    expect(s.zones.find(z => z.id === "sales")?.note).toContain("before returns and refunds");
    expect(s.zones.find(z => z.id === "shelves")?.metrics.map(m => m.value)).toEqual([2, 1]);
    expect(s.zones.find(z => z.id === "shelves")?.alert).toBe(true);
  });
  it("omits denied domains and their private subscriptions", async () => {
    mocks.denied.add("sales.read"); const s = await getWorldSnapshot(id);
    expect(s.zones.some(z => z.id === "sales")).toBe(false);
    expect(s.topics).not.toContain(`world:${id}:sales`);
    expect(mocks.sales).not.toHaveBeenCalled();
  });
  it("retains other domains when one fails and never substitutes zero", async () => {
    mocks.sales.mockRejectedValue(new Error("offline")); const s = await getWorldSnapshot(id);
    expect(s.zones.find(z => z.id === "sales")).toMatchObject({ state: "unavailable", metrics: [], updatedAt: null });
    expect(s.zones.find(z => z.id === "warehouse")?.state).toBe("ready");
  });
  it("scopes supported queries and withholds unsupported branch aggregates", async () => {
    const branch = "11111111-1111-4111-8111-111111111111"; const s = await getWorldSnapshot(id, branch);
    expect(mocks.sales).toHaveBeenCalledWith(id, branch);
    expect(mocks.calls).toContainEqual(["deliveries", "source_branch_id", branch]);
    expect(s.zones.find(z => z.id === "invoicing")).toMatchObject({ state: "unavailable", metrics: [] });
    expect(mocks.receivables).not.toHaveBeenCalled();
    await expect(getWorldSnapshot(id, "33333333-3333-4333-8333-333333333333")).rejects.toMatchObject({ status: 403 });
  });
  it("does not disclose disabled tools to people without discovery permission", async () => {
    mocks.modules = []; mocks.denied.add("module.read"); expect((await getWorldSnapshot(id)).zones).toEqual([]);
  });
  it("distinguishes empty records from count failures", async () => {
    expect((await getWorldSnapshot(id)).zones.find(z => z.id === "delivery")?.state).toBe("empty");
    mocks.failCount = true;
    expect((await getWorldSnapshot(id)).zones.find(z => z.id === "delivery")).toMatchObject({ state: "unavailable", metrics: [] });
  });
  it("rechecks membership on every request", async () => {
    await getWorldSnapshot(id); mocks.membership.mockRejectedValue(new Error("revoked"));
    await expect(getWorldSnapshot(id)).rejects.toThrow("revoked"); expect(mocks.membership).toHaveBeenCalledTimes(2);
  });
});
