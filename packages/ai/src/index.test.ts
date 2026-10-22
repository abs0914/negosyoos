import { describe, expect, it } from "vitest";

import { AiConfigurationProposalSchema } from "./index";

describe("AI configuration proposal", () => {
  it("rejects responses containing arbitrary implementation code", () => {
    expect(() => AiConfigurationProposalSchema.parse({
      kind: "configuration_proposal",
      confidence: 0.8,
      assumptions: [],
      warnings: [],
      changeSet: {
        id: "48d6d4b9-4b27-4c85-9b35-f2c0eec68074",
        title: "Add contractor name",
        summary: "Adds a contractor name field to quotations.",
        operations: [{
          operation: "add_field",
          objectKey: "quotation",
          field: { key: "contractor_name", label: "Contractor Name", type: "text" },
        }],
      },
      sql: "alter table quotations add column contractor_name text",
    })).toThrow();
  });
});
