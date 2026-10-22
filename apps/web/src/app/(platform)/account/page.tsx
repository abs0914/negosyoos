import Link from "next/link";

import { requireAuthenticatedUser } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { Button } from "@negosyo-os/ui";
import { signOutAction } from "./actions";
import { ProfileForm } from "./profile-form";

export default async function AccountPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, locale, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const locale = profile?.locale === "fil-PH" ? "fil-PH" : "en-PH";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-primary">Account</p>
          <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email ?? "Verified account"}</p>
        </div>
        <form action={signOutAction}><Button type="submit">Sign out</Button></form>
      </div>
      <section className="mt-10 rounded-2xl border bg-card p-6">
        <h2 className="mb-6 text-xl font-semibold">Profile</h2>
        <ProfileForm
          displayName={profile?.display_name ?? ""}
          locale={locale}
          timezone="Asia/Manila"
        />
      </section>
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">Change your password using a server-verified session.</p>
        <Link className="text-sm font-semibold text-primary hover:underline" href="/account/password">Change password</Link>
      </section>
    </main>
  );
}
