import { describe, expect, it } from "vitest";

import { parsePublicEnvironment, parseServerEnvironment } from "./env";

const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1234567890",
  APP_URL: "https://app.example.com",
};

describe("environment validation", () => {
  it("accepts a valid Supabase public configuration", () => {
    expect(parsePublicEnvironment(validEnvironment)).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: validEnvironment.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        validEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  });

  it("applies safe server defaults", () => {
    expect(parseServerEnvironment(validEnvironment)).toMatchObject({
      APP_ENV: "development",
      LOG_LEVEL: "info",
    });
  });

  it("rejects non-local insecure Supabase URLs", () => {
    expect(() =>
      parsePublicEnvironment({
        ...validEnvironment,
        NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
      }),
    ).toThrow();
  });

  it("rejects an insecure production application URL", () => {
    expect(() => parseServerEnvironment({ ...validEnvironment, APP_URL: "http://example.com" }))
      .toThrow();
  });
});
