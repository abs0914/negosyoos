import { z } from "zod";

export const AuthorizationContextSchema = z.strictObject({
  businessId: z.uuid(),
  branchId: z.uuid().optional(),
});

export type AuthorizationContext = z.infer<typeof AuthorizationContextSchema>;

/** Pure fail-closed decision used by the server-backed can() helper. */
export function evaluateCapabilityResult(
  authenticatedUserId: string,
  requestedUserId: string,
  granted: boolean | null,
  error: unknown,
): boolean {
  return authenticatedUserId === requestedUserId && !error && granted === true;
}
