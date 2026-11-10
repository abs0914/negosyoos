import "server-only";
// Explicit allowlist only. No production-wide default, even for the pilot UUID.
export function worldEnabled(businessId: string) {
  return (process.env.BUSINESS_WORLD_ENABLED_IDS ?? "").split(",").map(id => id.trim()).includes(businessId);
}
