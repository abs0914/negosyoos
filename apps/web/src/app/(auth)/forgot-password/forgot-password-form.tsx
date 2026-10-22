"use client";

import { useActionState } from "react";

import { Button } from "@negosyo-os/ui";
import { forgotPasswordAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Email address</label>
        <input
          autoComplete="email"
          className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email?.map((error) => (
          <p className="text-sm text-destructive" key={error}>{error}</p>
        ))}
      </div>
      {state.message ? (
        <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
