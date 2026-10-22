"use client";

import { useActionState } from "react";

import { Button } from "@negosyo-os/ui";
import { signInAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};

export function LoginForm({ next }: { next?: string | undefined }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <input name="next" type="hidden" value={next ?? ""} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">Email address</label>
        <input
          className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email?.map((error) => (
          <p className="text-sm text-destructive" key={error}>{error}</p>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">Password</label>
        <input
          className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password?.map((error) => (
          <p className="text-sm text-destructive" key={error}>{error}</p>
        ))}
      </div>
      {state.message ? <p className="text-sm text-destructive" role="alert">{state.message}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm">
        <a className="text-primary hover:underline" href="/forgot-password">Forgot password?</a>
        <a className="text-primary hover:underline" href="/signup">Create account</a>
      </div>
    </form>
  );
}
