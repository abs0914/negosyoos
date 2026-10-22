import "server-only";

import { cookies } from "next/headers";

import { requireOrganizationMembership } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { getServerEnvironment } from "@negosyo-os/core/env";

import { BusinessIdSchema } from "./schemas";

export const ACTIVE_BUSINESS_COOKIE = "negosyo-active-business";

export async function requireTenantContext(businessId: string): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireOrganizationMembership(id, supabase);
  return id;
}

export async function selectTenant(businessId: string): Promise<string> {
  const id = await requireTenantContext(businessId);
  const environment = getServerEnvironment();
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: environment.APP_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

export async function getSelectedTenant(): Promise<string | null> {
  const cookieStore = await cookies();
  const parsed = BusinessIdSchema.safeParse(cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value);
  if (!parsed.success) return null;

  try {
    return await requireTenantContext(parsed.data);
  } catch {
    return null;
  }
}
