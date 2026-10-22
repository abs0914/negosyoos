import Link from "next/link";

import { SignupForm } from "./signup-form";

export default async function SignupPage({searchParams}:{searchParams:Promise<{next?:string;assessment?:string}>}) {
  const query=await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Link className="text-sm font-semibold text-primary" href="/">NegosyoOS</Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mb-8 mt-2 text-sm text-muted-foreground">
          Start with a verified email. Your business workspace comes next.
        </p>
        <SignupForm assessment={query.assessment==="1"} {...(query.next?{next:query.next}:{})}/>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered? <Link className="text-primary hover:underline" href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
