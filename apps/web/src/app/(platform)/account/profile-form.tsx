"use client";

import { useActionState } from "react";

import { Button } from "@negosyo-os/ui";
import { updateProfileAction, type AccountActionState } from "./actions";

const initialState: AccountActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

export function ProfileForm({
  displayName,
  locale,
  timezone,
}: {
  displayName: string;
  locale: "en-PH" | "fil-PH";
  timezone: "Asia/Manila";
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="displayName">Full name</label>
        <input className={inputClass} defaultValue={displayName} id="displayName" name="displayName" required />
        {state.fieldErrors?.displayName?.map((error) => <p className="text-sm text-destructive" key={error}>{error}</p>)}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="locale">Language</label>
        <select className={inputClass} defaultValue={locale} id="locale" name="locale">
          <option value="en-PH">English (Philippines)</option>
          <option value="fil-PH">Filipino</option>
        </select>
      </div>
      <input name="timezone" type="hidden" value={timezone} />
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}
