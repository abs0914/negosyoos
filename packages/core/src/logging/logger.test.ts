import { describe, expect, it } from "vitest";

import { sanitizeLogValue } from "./logger";

describe("log sanitization", () => {
  it("redacts nested secrets while preserving operational fields", () => {
    expect(
      sanitizeLogValue({
        requestId: "request-1",
        authorization: "Bearer unsafe",
        nested: { refreshToken: "unsafe", status: "failed" },
      }),
    ).toEqual({
      requestId: "request-1",
      authorization: "[REDACTED]",
      nested: { refreshToken: "[REDACTED]", status: "failed" },
    });
  });
});
