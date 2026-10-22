import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnvironment } from "@negosyo-os/core/env";
import type { Database } from "@negosyo-os/database";

import { hasVerifiedUser } from "../identity";
import { isProtectedRoute } from "../route-guard";

export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const environment = getServerEnvironment();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headersToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headersToSet).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  // Keep this immediately after client creation; it verifies and refreshes claims.
  const claimsResult = await supabase.auth.getClaims();

  if (isProtectedRoute(request.nextUrl.pathname) && !hasVerifiedUser(claimsResult)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = new URLSearchParams({
      next: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    }).toString();
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}
