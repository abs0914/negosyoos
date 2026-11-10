import { LoginForm } from "@/app/(auth)/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <section className="auth-form">
      <p className="design-label">Sign in</p>
      <h1>Welcome back</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Sign in to open your business workspace.
      </p>
      {error ? (
        <p className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          The authentication link is invalid or expired. Please try again.
        </p>
      ) : null}
      <LoginForm next={next} />
    </section>
  );
}
