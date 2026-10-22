"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@negosyo-os/core/env";
import type { Database } from "@negosyo-os/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
  if (browserClient) {
    return browserClient;
  }

  const environment = getPublicEnvironment();
  browserClient = createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}
