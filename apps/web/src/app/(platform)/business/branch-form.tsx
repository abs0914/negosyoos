"use client";

import { useActionState } from "react";

import { Button } from "@negosyo-os/ui";
import { createBranchAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

export function BranchForm({ businessId }: { businessId: string }) {
  const action = createBranchAction.bind(null, businessId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const fields = [
    ["code", "Branch code", "makati"], ["name", "Branch name", "Makati Branch"],
    ["addressLine1", "Address line 1", "123 Rizal Street"], ["addressLine2", "Address line 2", ""],
    ["barangay", "Barangay", ""], ["city", "City / municipality", "Makati City"],
    ["province", "Province", "Metro Manila"], ["postalCode", "Postal code", "1200"],
  ] as const;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([name, label, placeholder]) => (
          <label className="space-y-2 text-sm font-medium" key={name}>{label}
            <input className={inputClass} name={name} placeholder={placeholder} required={!['addressLine2', 'barangay', 'postalCode'].includes(name)} />
          </label>
        ))}
      </div>
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Creating…" : "Create branch"}</Button>
    </form>
  );
}
