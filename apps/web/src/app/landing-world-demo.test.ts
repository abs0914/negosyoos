import { describe, expect, it } from "vitest";
import { ConfigSchema, resolveScene } from "@/features/business-world/model";
import { demoWorldConfig, demoWorldSnapshot } from "./landing-world-demo";

describe("homepage Business World demo", () => {
  it("uses a valid configuration and places every example area", () => {
    expect(ConfigSchema.parse(demoWorldConfig)).toEqual(demoWorldConfig);
    expect(resolveScene(demoWorldConfig, demoWorldSnapshot.zones)).toHaveLength(demoWorldSnapshot.zones.length);
  });
  it("shows a mix of healthy and attention areas with a headline metric each", () => {
    const alerts = demoWorldSnapshot.zones.filter(zone => zone.alert).length;
    expect(alerts).toBeGreaterThan(0);
    expect(alerts).toBeLessThan(demoWorldSnapshot.zones.length);
    expect(demoWorldSnapshot.zones.every(zone => zone.metrics.length > 0 && zone.actions.length === 0)).toBe(true);
  });
});
