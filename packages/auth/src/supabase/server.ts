import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServerEnvironment } from "@negosyo-os/core/env";
import type { Database } from "@negosyo-os/database";

export type ServerSupabaseClient = SupabaseClient<Database>;

export async function createClient(): Promise<ServerSupabaseClient> {
  const cookieStore = await cookies();
  const environment = getServerEnvironment();

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies. src/proxy.ts performs refreshes.
          }
        },
      },
    },
  );
}
