import { NextResponse } from "next/server";
import { z } from "zod";

import { safeRedirectPath } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { getServerEnvironment } from "@negosyo-os/core/env";

const callbackSchema = z.strictObject({
  code: z.string().min(1).max(2048),
  next: z.string().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const parsed = callbackSchema.safeParse({
    code: requestUrl.searchParams.get("code"),
    next: requestUrl.searchParams.get("next") ?? undefined,
  });
  const appUrl = getServerEnvironment().APP_URL;

  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);

    if (!error) {
      return NextResponse.redirect(new URL(safeRedirectPath(parsed.data.next), appUrl));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", appUrl));
}
