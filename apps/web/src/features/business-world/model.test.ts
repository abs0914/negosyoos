import { describe, expect, it } from "vitest";
import { ConfigSchema, PreferencesSchema, resolveScene, suggestWorld, suggestionKey, zoneLabel, type WorldZone } from "./model";
const zones = ["sales", "shelves", "warehouse", "crm"].map(id => ({ id } as WorldZone));
describe("business world configuration", () => {
  it("generates deterministic suggestions independently of input order", () => {
    expect(suggestionKey("retail", ["sales", "inventory"], ["b", "a"], ["2", "1"])).toBe(suggestionKey("retail", ["inventory", "sales"], ["a", "b"], ["1", "2"]));
    const config = suggestWorld("retail", ["delivery"], ["warehouse", "stockroom"], 2);
    expect(config).toMatchObject({ storage: "both", fulfillment: "both", presentation: "spacious" });
    expect(resolveScene(config, zones)).toEqual(resolveScene(config, [...zones].reverse()));
  });
  it("requires no questionnaire and handles unknown industries", () => {
    expect(suggestWorld("new-industry", [], [], 0)).toEqual({ version: 1, industry: "other", service: "in_store", storage: "none", fulfillment: "pickup", presentation: "compact" });
  });
  it("does not silently accept future versions or operational fields", () => {
    const config = suggestWorld("retail", [], [], 1);
    expect(ConfigSchema.safeParse({ ...config, version: 2 }).success).toBe(false);
    expect(ConfigSchema.safeParse({ ...config, createBranch: true }).success).toBe(false);
    expect(ConfigSchema.parse(JSON.parse(JSON.stringify(config)))).toEqual(config);
  });
  it("supports mixed industries without adding unauthorized zones", () => {
    const config = suggestWorld("salon_service", ["sales", "inventory"], [], 1);
    expect(zoneLabel("shelves", config)).toBe("Product shelves");
    expect(resolveScene(config, zones).map(z => z.id)).not.toContain("appointments");
    expect(resolveScene({ ...config, visibleZones: ["shelves", "delivery"] }, zones).map(z => z.id)).toEqual(["shelves"]);
  });
  it("keeps shared layout and personal controls separate", () => {
    expect(ConfigSchema.safeParse({ ...suggestWorld("retail", [], [], 1), motion: "paused" }).success).toBe(false);
    expect(PreferencesSchema.safeParse({ landing_view: "world", branch_id: "another-tenant", motion: "paused", representation: "2d" }).success).toBe(false);
  });
});
