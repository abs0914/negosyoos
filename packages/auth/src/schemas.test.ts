import { describe, expect, it } from "vitest";

import { OAuthProviderSchema, PhoneOtpInputSchema, SignUpInputSchema } from "./schemas";

describe("authentication input schemas", () => {
  it("normalizes valid signup input", () => {
    const result = SignUpInputSchema.parse({
      displayName: "  Ana Reyes  ",
      email: "ANA@EXAMPLE.COM ",
      password: "a-secure-password-123",
      passwordConfirmation: "a-secure-password-123",
    });

    expect(result.displayName).toBe("Ana Reyes");
    expect(result.email).toBe("ana@example.com");
  });

  it("rejects weak or mismatched passwords", () => {
    expect(SignUpInputSchema.safeParse({
      displayName: "Ana Reyes",
      email: "ana@example.com",
      password: "short",
      passwordConfirmation: "different",
    }).success).toBe(false);
  });

  it("defines future providers without enabling arbitrary providers", () => {
    expect(OAuthProviderSchema.parse("google")).toBe("google");
    expect(OAuthProviderSchema.safeParse("github").success).toBe(false);
    expect(PhoneOtpInputSchema.safeParse({ phone: "+639171234567" }).success).toBe(true);
  });
});
