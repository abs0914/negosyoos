import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <section className="auth-form">
      <p className="design-label">Account recovery</p>
      <h1>Reset your password</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        We will send a secure reset link if the email belongs to an account.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link className="text-primary hover:underline" href="/login">Back to sign in</Link>
      </p>
    </section>
  );
}
