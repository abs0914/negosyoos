import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { refreshSession } from "@negosyo-os/auth/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/webhooks/paymongo") return NextResponse.next();
  return refreshSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
