import Link from "next/link";

import { LoginForm } from "@/app/(auth)/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link className="text-sm font-semibold text-primary" href="/">NegosyoOS</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mb-8 mt-2 text-sm text-muted-foreground">
          Sign in with your Supabase-authenticated account.
        </p>
        {error ? (
          <p className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            The authentication link is invalid or expired. Please try again.
          </p>
        ) : null}
        <LoginForm next={next} />
      </section>
    </main>
  );
}
