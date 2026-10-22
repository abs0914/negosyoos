import { NextResponse } from "next/server";
import { z } from "zod";

import { safeRedirectPath } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { getServerEnvironment } from "@negosyo-os/core/env";

const confirmationSchema = z.strictObject({
  token_hash: z.string().min(1).max(2048),
  type: z.enum(["email", "signup", "invite", "magiclink", "recovery", "email_change"]),
  next: z.string().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const parsed = confirmationSchema.safeParse({
    token_hash: requestUrl.searchParams.get("token_hash"),
    type: requestUrl.searchParams.get("type"),
    next: requestUrl.searchParams.get("next") ?? undefined,
  });
  const appUrl = getServerEnvironment().APP_URL;

  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: parsed.data.token_hash,
      type: parsed.data.type,
    });

    if (!error) {
      return NextResponse.redirect(new URL(safeRedirectPath(parsed.data.next), appUrl));
    }
  }

  return NextResponse.redirect(new URL("/login?error=verification", appUrl));
}
