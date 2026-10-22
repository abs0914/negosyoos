"use client";

import { useActionState } from "react";

import { Button } from "@negosyo-os/ui";
import { updatePasswordAction, type AccountActionState } from "../actions";

const initialState: AccountActionState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);
  const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

  return (
    <form action={action} className="space-y-5">
      {[
        { name: "password", label: "New password" },
        { name: "passwordConfirmation", label: "Confirm new password" },
      ].map((field) => (
        <div className="space-y-2" key={field.name}>
          <label className="text-sm font-medium" htmlFor={field.name}>{field.label}</label>
          <input autoComplete="new-password" className={inputClass} id={field.name} name={field.name} type="password" required />
          {state.fieldErrors?.[field.name]?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
        </div>
      ))}
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
