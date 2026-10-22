import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const requireUser = vi.fn(), requireCapability = vi.fn(), begin = vi.fn();
  const single = vi.fn(), eq = vi.fn(), select = vi.fn(), from = vi.fn(), rpc = vi.fn();
  return { requireUser, requireCapability, begin, single, eq, select, from, rpc };
});
vi.mock("server-only", () => ({}));
vi.mock("@negosyo-os/auth", () => ({ requireAuthenticatedUser: mocks.requireUser, requireCapability: mocks.requireCapability }));
vi.mock("@negosyo-os/auth/server", () => ({ createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("./paymongo-server", () => ({ beginPaymongoCheckout: mocks.begin, receivePaymongoWebhook: vi.fn() }));

import { startSubscriptionCheckout } from "./server";

const business = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "user-id" });
  mocks.requireCapability.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ error: null, data: {
    id: business, planKey: "free_assessment", status: "active", provider: "internal",
    currentPeriodStart: null, currentPeriodEnd: null, gracePeriodEnd: null, pendingPlanKey: null,
    cancelAtPeriodEnd: false, features: [], limits: [],
  } });
  mocks.single.mockResolvedValue({ error: null, data: { name: "Multi-branch" } });
  const chain = { eq: mocks.eq, select: mocks.select, single: mocks.single };
  mocks.from.mockReturnValue(chain); mocks.select.mockReturnValue(chain);
  mocks.eq.mockImplementation((key: string) => key === "organization_id" ? Promise.resolve({ error: null, count: 4 }) : chain);
  mocks.begin.mockResolvedValue("https://checkout.paymongo.com/example");
});

describe("checkout authorization boundary", () => {
  it("requires subscription.manage for the requested business before starting payment", async () => {
    await startSubscriptionCheckout(business, "multi_branch", "annual", 4);
    expect(mocks.requireCapability).toHaveBeenCalledWith({ id: "user-id" }, "subscription.manage", { businessId: business }, expect.anything());
    expect(mocks.begin).toHaveBeenCalledWith(business, "multi_branch", "Multi-branch", "annual", 4);
  });
  it("never reaches the provider for an unauthenticated caller", async () => {
    mocks.requireUser.mockRejectedValue(new Error("Not signed in"));
    await expect(startSubscriptionCheckout(business, "starter", "monthly", 3)).rejects.toThrow();
    expect(mocks.begin).not.toHaveBeenCalled();
  });
  it("never reaches the provider when management access is denied", async () => {
    mocks.requireCapability.mockRejectedValue(new Error("Forbidden"));
    await expect(startSubscriptionCheckout(business, "starter", "monthly", 3)).rejects.toThrow("Forbidden");
    expect(mocks.begin).not.toHaveBeenCalled();
  });
  it("rejects inadequate branch capacity and malformed plan choices", async () => {
    await expect(startSubscriptionCheckout(business, "starter", "monthly", 3)).rejects.toThrow("existing branches");
    await expect(startSubscriptionCheckout(business, "invented", "monthly", 3)).rejects.toThrow();
    await expect(startSubscriptionCheckout(business, "multi_branch", "weekly", 4)).rejects.toThrow();
    expect(mocks.begin).not.toHaveBeenCalled();
  });
  it("rejects inactive or unavailable plans", async () => {
    mocks.single.mockResolvedValue({ error: { code: "PGRST116" }, data: null });
    await expect(startSubscriptionCheckout(business, "multi_branch", "annual", 4)).rejects.toThrow("unavailable");
    expect(mocks.begin).not.toHaveBeenCalled();
  });
});
