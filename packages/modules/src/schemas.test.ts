import { describe, expect, it } from "vitest";

import {
  ModuleConfigurationSchemaSchema,
  ModuleDefinitionSchema,
  parseModuleConfiguration,
} from "./schemas";

describe("module configuration", () => {
  const schema = ModuleConfigurationSchemaSchema.parse({
    properties: {
      receipt_footer: { type: "string", label: "Receipt footer", maxLength: 20, default: "Thanks!" },
      copies: { type: "integer", label: "Copies", minimum: 1, maximum: 3, required: true },
      print_logo: { type: "boolean", label: "Print logo", default: false },
    },
    additionalProperties: false,
  });

  it("applies defaults and validates configured values with Zod", () => {
    expect(parseModuleConfiguration(schema, { copies: 2 })).toEqual({
      receipt_footer: "Thanks!",
      copies: 2,
      print_logo: false,
    });
  });

  it("rejects unknown, incorrectly typed, and out-of-range configuration", () => {
    expect(() => parseModuleConfiguration(schema, { copies: 4 })).toThrow();
    expect(() => parseModuleConfiguration(schema, { copies: "2" })).toThrow();
    expect(() => parseModuleConfiguration(schema, { copies: 2, sql: "drop table" })).toThrow();
  });
});

describe("ModuleDefinitionSchema", () => {
  it("accepts underscore module keys and rejects duplicate dependencies", () => {
    const base = {
      key: "job_orders",
      name: "Job Orders",
      description: "Coordinate jobs.",
      category: "operations",
      icon: "clipboard-list",
      minimumPlan: "growth",
      configurationSchema: { properties: {}, additionalProperties: false },
      version: 1,
    };
    expect(ModuleDefinitionSchema.parse({ ...base, dependencies: ["crm"] }).key).toBe("job_orders");
    expect(() => ModuleDefinitionSchema.parse({ ...base, dependencies: ["crm", "crm"] })).toThrow();
  });
});
