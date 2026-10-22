import { z } from "zod";

import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";

const verifiedClaimsSchema = z.object({
  sub: z.uuid(),
  email: z.email().optional(),
});

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface ClaimsResult {
  data: { claims?: unknown } | null;
  error: unknown;
}

/** Converts verified Supabase claims into the minimum identity exposed by the app. */
export function requireUserFromClaims(result: ClaimsResult): AuthenticatedUser {
  const parsed = verifiedClaimsSchema.safeParse(result.data?.claims);

  if (result.error || !parsed.success) {
    throw new AppError({
      code: ERROR_CODES.authenticationRequired,
      message: "Authentication is required.",
      status: 401,
      cause: result.error,
    });
  }

  return {
    id: parsed.data.sub,
    ...(parsed.data.email ? { email: parsed.data.email } : {}),
  };
}

export function hasVerifiedUser(result: ClaimsResult): boolean {
  return !result.error && verifiedClaimsSchema.safeParse(result.data?.claims).success;
}
