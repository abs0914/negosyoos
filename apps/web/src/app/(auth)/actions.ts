"use server";

import { redirect } from "next/navigation";

import {
  ForgotPasswordInputSchema,
  SignInInputSchema,
  SignUpInputSchema,
  safeRedirectPath,
} from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { getServerEnvironment } from "@negosyo-os/core/env";
import { logger } from "@negosyo-os/core/logging";

export interface AuthActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const authLogger = logger.child({ domain: "auth" });

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = SignInInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    authLogger.warn("Sign-in attempt rejected", { authErrorCode: error.code });
    return { status: "error", message: "The email or password is incorrect." };
  }

  redirect(safeRedirectPath(parsed.data.next));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = SignUpInputSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  const next=safeRedirectPath(String(formData.get("next")??"/dashboard"));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const environment = getServerEnvironment();
  const confirmationUrl = new URL("/auth/confirm", environment.APP_URL);
  confirmationUrl.searchParams.set("next", next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmationUrl.toString(),
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    authLogger.warn("Sign-up attempt rejected", { authErrorCode: error.code });
    return {
      status: "error",
      message: "We could not create the account. Please try again shortly.",
    };
  }

  if (data.session) {
    redirect(next);
  }

  return {
    status: "success",
    message: "Check your email to verify your account and finish signing in.",
  };
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = ForgotPasswordInputSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const environment = getServerEnvironment();
  const callbackUrl = new URL("/auth/callback", environment.APP_URL);
  callbackUrl.searchParams.set("next", "/account/password");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    authLogger.warn("Password reset request was not accepted", {
      authErrorCode: error.code,
    });
  }

  // Deliberately identical for registered and unregistered addresses.
  return {
    status: "success",
    message: "If an account exists for that email, a password reset link is on its way.",
  };
}
