import Link from "next/link";

import { PasswordForm } from "./password-form";

export default function PasswordPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link className="text-sm font-semibold text-primary hover:underline" href="/account">← Account settings</Link>
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Change password</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">Use at least 12 characters with a letter and number.</p>
        <PasswordForm />
      </section>
    </main>
  );
}
