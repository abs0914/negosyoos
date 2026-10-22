const PROTECTED_ROUTE_PREFIXES = ["/account", "/business", "/dashboard"] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n]/.test(value)
  ) {
    return fallback;
  }

  return value;
}

export function loginRedirectPath(pathname: string, search: string): string {
  const next = safeRedirectPath(`${pathname}${search}`);
  return `/login?next=${encodeURIComponent(next)}`;
}
