import { describe, expect, it } from "vitest";

import type { ModuleDefinition, ModuleRegistryEntry } from "./models";
import { blockingDependents, buildModuleNavigation, missingDependencies } from "./registry";

const emptySchema = { properties: {}, additionalProperties: false } as const;
const definition = (key: string, dependencies: readonly string[] = []): ModuleDefinition => ({
  key,
  name: key.replaceAll("_", " "),
  description: `${key} capability`,
  category: "operations",
  dependencies,
  icon: "boxes",
  minimumPlan: "starter",
  configurationSchema: emptySchema,
  version: 1,
});

describe("module dependency graph", () => {
  it("finds missing activation dependencies", () => {
    expect(missingDependencies(definition("pos", ["sales", "inventory"]), new Set(["sales"])))
      .toEqual(["inventory"]);
  });

  it("finds only enabled modules blocking deactivation", () => {
    const definitions = [definition("sales"), definition("pos", ["sales"]), definition("delivery", ["sales"])];
    expect(blockingDependents("sales", definitions, new Set(["pos"]))).toEqual(["pos"]);
  });
});

describe("module navigation", () => {
  it("derives links only from enabled registry entries", () => {
    const registry: ModuleRegistryEntry[] = [
      { definition: definition("sales"), businessModule: { businessId: "business", moduleKey: "sales", enabled: true, configuration: {}, activatedAt: "2026-01-01" } },
      { definition: definition("inventory"), businessModule: null },
    ];
    expect(buildModuleNavigation("business", registry)).toEqual([{ key: "sales", label: "sales", icon: "boxes", href: "/business/business/modules/sales" }]);
  });

  it("uses the configured Job Order name in business navigation", () => {
    const registry: ModuleRegistryEntry[] = [{
      definition: definition("job_orders"),
      businessModule: { businessId: "business", moduleKey: "job_orders", enabled: true, configuration: { plural_label: "Repair Orders" }, activatedAt: "2026-01-01" },
    }];
    expect(buildModuleNavigation("business", registry)[0]).toMatchObject({ label: "Repair Orders", href: "/business/business/job-orders" });
  });
});
