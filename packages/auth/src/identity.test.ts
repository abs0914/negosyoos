import { describe, expect, it } from "vitest";

import { AppError } from "@negosyo-os/core/errors";

import { hasVerifiedUser, requireUserFromClaims } from "./identity";

const validClaims = {
  data: {
    claims: {
      sub: "6c9326d1-2e5f-43cd-a616-5a95113d3148",
      email: "owner@example.com",
      user_metadata: { role: "owner", private_note: "not exposed" },
    },
  },
  error: null,
};

describe("verified identity", () => {
  it("returns only the minimal authenticated identity", () => {
    expect(requireUserFromClaims(validClaims)).toEqual({
      id: "6c9326d1-2e5f-43cd-a616-5a95113d3148",
      email: "owner@example.com",
    });
  });

  it("rejects missing, malformed, and errored claims", () => {
    expect(hasVerifiedUser({ data: null, error: null })).toBe(false);
    expect(() => requireUserFromClaims({ data: { claims: { sub: "bad" } }, error: null }))
      .toThrow(AppError);
    expect(() => requireUserFromClaims({ data: validClaims.data, error: new Error("invalid") }))
      .toThrow(AppError);
  });
});
