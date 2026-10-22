"use client";

import { useActionState } from "react";

import { Button } from "@negosyo-os/ui";
import { signUpAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

export function SignupForm({next,assessment}:{next?:string;assessment?:boolean}) {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={action} className="space-y-5">
      {next?<input name="next" type="hidden" value={next}/>:null}
      {assessment?<p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">Your Business Health Report will be carried into your workspace after you create your business.</p>:null}
      {[
        { name: "displayName", label: "Full name", type: "text", autoComplete: "name" },
        { name: "email", label: "Email address", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        { name: "passwordConfirmation", label: "Confirm password", type: "password", autoComplete: "new-password" },
      ].map((field) => (
        <div className="space-y-2" key={field.name}>
          <label className="text-sm font-medium" htmlFor={field.name}>{field.label}</label>
          <input
            autoComplete={field.autoComplete}
            className={inputClass}
            id={field.name}
            name={field.name}
            type={field.type}
            required
            aria-invalid={Boolean(state.fieldErrors?.[field.name])}
          />
          {state.fieldErrors?.[field.name]?.map((error) => (
            <p className="text-sm text-destructive" key={error}>{error}</p>
          ))}
        </div>
      ))}
      {state.message ? (
        <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">
          {state.message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending || state.status === "success"} type="submit">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
