"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  UpdatePasswordInputSchema,
  UpdateProfileInputSchema,
  requireUserFromClaims,
} from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { logger } from "@negosyo-os/core/logging";

export interface AccountActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const accountLogger = logger.child({ domain: "auth", area: "account" });

export async function updateProfileAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = UpdateProfileInputSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const user = requireUserFromClaims(await supabase.auth.getClaims());
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) {
    accountLogger.error("Profile update failed", error, { userId: user.id });
    return { status: "error", message: "Your profile could not be saved." };
  }

  revalidatePath("/account");
  return { status: "success", message: "Profile saved." };
}

export async function updatePasswordAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = UpdatePasswordInputSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const user = requireUserFromClaims(await supabase.auth.getClaims());
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    accountLogger.warn("Password update rejected", {
      userId: user.id,
      authErrorCode: error.code,
    });
    return { status: "error", message: "Your password could not be updated." };
  }

  return { status: "success", message: "Password updated." };
}

export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  requireUserFromClaims(await supabase.auth.getClaims());
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    accountLogger.warn("Local sign-out returned an error", { authErrorCode: error.code });
  }

  redirect("/login");
}
