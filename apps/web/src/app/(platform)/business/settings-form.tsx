"use client";

/* eslint-disable @next/next/no-img-element -- Private signed logo URLs cannot use the static Next Image allowlist. */

import { useActionState, useState } from "react";

import type { BusinessSettings } from "@negosyo-os/business";
import { Button } from "@negosyo-os/ui";
import { removeBusinessLogoAction, updateBusinessSettingsAction, uploadBusinessLogoAction, type BusinessActionState } from "./actions";

const initialState: BusinessActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const action = updateBusinessSettingsAction.bind(null, settings.businessId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [colors, setColors] = useState({ primary: settings.primaryColor, secondary: settings.secondaryColor, accent: settings.accentColor });

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <fieldset className="grid gap-4 rounded-xl border bg-muted/35 p-4 sm:col-span-2">
        <legend className="px-2 text-sm font-bold">Workspace colors</legend>
        <p className="text-sm text-muted-foreground">These colors apply only inside this business workspace. Text contrast is adjusted automatically.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {([['primaryColor', 'Primary', 'primary'], ['secondaryColor', 'Secondary', 'secondary'], ['accentColor', 'Accent', 'accent']] as const).map(([name, label, key]) => <label className="space-y-2 text-sm font-medium" key={name}>{label}<span className="flex h-11 items-center gap-3 rounded-lg border bg-background px-3"><input aria-label={`${label} color`} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" name={name} onChange={(event) => setColors((current) => ({ ...current, [key]: event.target.value }))} type="color" value={colors[key]}/><span className="font-mono text-xs uppercase text-muted-foreground">{colors[key]}</span></span></label>)}
        </div>
        <div className="flex min-h-20 items-center gap-3 overflow-hidden rounded-xl border bg-background p-4" style={{ borderTopColor: colors.accent, borderTopWidth: 4 }}>
          <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-black text-white" style={{ background: colors.primary }}>MY</span>
          <div className="min-w-0 flex-1"><p className="font-bold">Your business workspace</p><p className="text-xs text-muted-foreground">A live preview of your brand colors</p></div>
          <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: colors.secondary }}>Ready</span>
        </div>
      </fieldset>
      <label className="space-y-2 text-sm font-medium">Language
        <select className={inputClass} defaultValue={settings.locale} name="locale">
          <option value="en-PH">English (Philippines)</option><option value="fil-PH">Filipino</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">Date format
        <select className={inputClass} defaultValue={settings.dateFormat} name="dateFormat">
          <option value="MM/dd/yyyy">MM/DD/YYYY</option><option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="yyyy-MM-dd">YYYY-MM-DD</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">Week starts on
        <select className={inputClass} defaultValue={settings.weekStartsOn} name="weekStartsOn">
          <option value="0">Sunday</option><option value="1">Monday</option>
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">Fiscal year starts
        <select className={inputClass} defaultValue={settings.fiscalYearStartMonth} name="fiscalYearStartMonth">
          {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2024, index).toLocaleString("en-PH", { month: "long" })}</option>)}
        </select>
      </label>
      <div className="sm:col-span-2">
        {state.message ? <p className={state.status === "success" ? "mb-4 text-sm text-primary" : "mb-4 text-sm text-destructive"} role="status">{state.message}</p> : null}
        <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save preferences"}</Button>
      </div>
    </form>
  );
}

export function BusinessLogoForm({ businessId, businessName, logoUrl }: { businessId: string; businessName: string; logoUrl: string | null }) {
  const upload = uploadBusinessLogoAction.bind(null, businessId);
  const remove = removeBusinessLogoAction.bind(null, businessId);
  const [state, formAction, pending] = useActionState(upload, initialState);
  return <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
    <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border bg-muted text-2xl font-black text-primary">
      {logoUrl ? <img alt={`${businessName} logo`} className="h-full w-full object-contain p-2" src={logoUrl}/> : businessName.slice(0, 2).toUpperCase()}
    </div>
    <div><p className="text-sm text-muted-foreground">Use a square or horizontal PNG, JPEG, or WebP. Maximum 5 MB.</p>
      <form action={formAction} className="mt-4 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted"><span>{pending ? "Uploading…" : "Choose logo"}</span><input accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={pending} name="logo" onChange={(event) => event.currentTarget.form?.requestSubmit()} type="file"/></label>
        {logoUrl ? <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-muted" formAction={remove} type="submit">Remove logo</button> : null}
      </form>
      {state.message ? <p className={`mt-3 text-sm ${state.status === "success" ? "text-primary" : "text-destructive"}`} role="status">{state.message}</p> : null}
    </div>
  </div>;
}
