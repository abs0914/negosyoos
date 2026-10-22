import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link className="text-sm font-semibold text-primary" href="/">NegosyoOS</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mb-8 mt-2 text-sm text-muted-foreground">
          We will send a secure reset link if the email belongs to an account.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm">
          <Link className="text-primary hover:underline" href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
