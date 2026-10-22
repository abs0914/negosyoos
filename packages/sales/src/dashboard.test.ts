import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), capability: vi.fn(), from: vi.fn(), calls: [] as unknown[][],
  pages: [] as Array<{ data: Array<{ id: string; total: number }> | null; count: number | null; error: unknown }>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@negosyo-os/auth", () => ({ requireAuthenticatedUser: mocks.user, requireCapability: mocks.capability }));
vi.mock("@negosyo-os/auth/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
import { getSalesDashboard } from "./server";

const business = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  // October 19 in Manila, October 18 in UTC.
  vi.setSystemTime(new Date("2026-10-18T16:30:00Z"));
  mocks.calls.length = 0;
  mocks.pages.length = 0;
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.capability.mockResolvedValue(undefined);
  mocks.from.mockImplementation((table: string) => {
    mocks.calls.push(["from", table]);
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "gte", "lt", "order"]) {
      chain[method] = (...args: unknown[]) => { mocks.calls.push([method, ...args]); return chain; };
    }
    chain.range = (from: number, to: number) => { mocks.calls.push(["range", from, to]); return Promise.resolve(mocks.pages.shift()); };
    chain.limit = (limit: number) => { mocks.calls.push(["limit", limit]); return Promise.resolve({ data: [], error: null }); };
    return chain;
  });
});
afterEach(() => vi.useRealTimers());

describe("daily receipt summary", () => {
  it("includes more than 20 receipts and follows a server cap smaller than the requested page", async () => {
    mocks.pages.push(
      { data: Array.from({ length: 20 }, (_, i) => ({ id: String(i), total: 10.01 })), count: 25, error: null },
      { data: Array.from({ length: 5 }, (_, i) => ({ id: String(i + 20), total: 10.01 })), count: 25, error: null },
    );
    const result = await getSalesDashboard(business);
    expect(result.todayTransactions).toBe(25);
    expect(result.todaySales).toBe(250.25);
    expect(result.averageSale).toBe(10.01);
    expect(mocks.calls).toContainEqual(["range", 20, 519]);
    expect(mocks.calls).toContainEqual(["eq", "organization_id", business]);
    expect(mocks.calls).toContainEqual(["gte", "completed_at", "2026-10-18T16:00:00.000Z"]);
    expect(mocks.calls).toContainEqual(["lt", "completed_at", "2026-10-19T16:00:00.000Z"]);
    expect(mocks.calls).toContainEqual(["in", "status", ["completed", "partially_returned", "returned", "refunded"]]);
    expect(mocks.calls).toContainEqual(["limit", 20]);
    expect(mocks.capability).toHaveBeenCalledWith({ id: "owner" }, "sales.read", { businessId: business }, expect.anything());
  });

  it("returns real zero totals for a successfully queried empty day", async () => {
    mocks.pages.push({ data: [], count: 0, error: null });
    expect(await getSalesDashboard(business)).toMatchObject({ todaySales: 0, todayTransactions: 0, averageSale: 0 });
  });

  it("does not return a partial financial total after a later page fails", async () => {
    mocks.pages.push(
      { data: [{ id: "one", total: 100 }], count: 2, error: null },
      { data: null, count: null, error: { message: "unavailable" } },
    );
    await expect(getSalesDashboard(business)).rejects.toThrow("could not be calculated");
  });

  it("rejects a changing result set instead of presenting an inconsistent count", async () => {
    mocks.pages.push(
      { data: [{ id: "one", total: 100 }], count: 2, error: null },
      { data: [{ id: "two", total: 100 }], count: 3, error: null },
    );
    await expect(getSalesDashboard(business)).rejects.toThrow("Sales changed");
  });

  it("rejects prematurely empty pages instead of silently understating sales", async () => {
    mocks.pages.push(
      { data: [{ id: "one", total: 100 }], count: 2, error: null },
      { data: [], count: 2, error: null },
    );
    await expect(getSalesDashboard(business)).rejects.toThrow("incomplete");
  });

  it("does not query sales if the caller lacks sales access", async () => {
    mocks.capability.mockRejectedValue(new Error("Forbidden"));
    await expect(getSalesDashboard(business)).rejects.toThrow("Forbidden");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
