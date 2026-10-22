/* eslint-disable @next/next/no-img-element -- Private signed logo URLs cannot use the static Next Image allowlist. */
import Link from "next/link";

import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { getBusiness, getBusinessLogoUrl, getBusinessSettings, getBusinessTrialDashboard } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { BusinessForm } from "../../business-form";
import { BusinessLogoForm, SettingsForm } from "../../settings-form";

export default async function BusinessSettingsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const [business, settings, user, trial] = await Promise.all([getBusiness(businessId), getBusinessSettings(businessId), requireAuthenticatedUser(), getBusinessTrialDashboard(businessId)]);
  const canManageSettings = await can(user, PERMISSIONS.settingsManage, { businessId });
  const logoUrl = await getBusinessLogoUrl(businessId, business.logo);
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Business settings</h1>
      {canManageSettings ? <><section className="mt-8 rounded-2xl border bg-card p-6"><p className="text-xs font-black uppercase tracking-[.14em] text-primary">Brand identity</p><h2 className="mb-2 mt-1 text-xl font-semibold">Business logo</h2><p className="mb-6 text-sm text-muted-foreground">Make this workspace feel familiar to your team.</p><BusinessLogoForm businessId={businessId} businessName={business.tradeName} logoUrl={logoUrl}/></section><section className="mt-6 rounded-2xl border bg-card p-6"><h2 className="mb-6 text-xl font-semibold">Business details</h2><BusinessForm business={business} /></section>
      <section className="mt-6 rounded-2xl border bg-card p-6"><h2 className="mb-1 text-xl font-semibold">Appearance and defaults</h2><p className="mb-6 text-sm text-muted-foreground">Personalize this workspace and set how dates and periods behave.</p><SettingsForm settings={settings} /></section></> : <section className="mt-8 rounded-2xl border bg-card p-6"><div className="flex items-center gap-4">{logoUrl ? <img alt="" className="h-14 w-14 rounded-xl border object-contain p-1" src={logoUrl}/> : null}<div><h2 className="text-xl font-semibold">{business.tradeName}</h2><p className="mt-1 text-sm text-muted-foreground">You have read-only access to these settings. Locale: {settings.locale}; date format: {settings.dateFormat}.</p></div></div></section>}
      <section className="mt-6 rounded-2xl border bg-card p-6" id="subscription"><p className="text-sm font-semibold text-primary">Subscription</p><h2 className="mt-1 text-xl font-semibold">Continue with your configured Business OS</h2><p className="mt-2 text-sm text-muted-foreground">Current status: <b className="capitalize text-foreground">{trial.trialStatus.replace("_"," ")}</b>. Choose monthly or annual billing and pay securely through PayMongo.</p><Link className="mt-5 inline-block rounded-lg border px-4 py-2 text-sm font-semibold" href={`/business/${businessId}/billing`}>View plans and billing</Link></section>
    </main>
  );
}
