import Link from "next/link";

import { SignupForm } from "./signup-form";

export default async function SignupPage({searchParams}:{searchParams:Promise<{next?:string;assessment?:string}>}) {
  const query=await searchParams;
  return (
    <section className="auth-form">
      <p className="design-label">Get started</p>
      <h1>Create your account</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Start with a verified email. Your business workspace comes next.
      </p>
      <SignupForm assessment={query.assessment==="1"} {...(query.next?{next:query.next}:{})}/>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered? <Link className="text-primary hover:underline" href="/login">Sign in</Link>
      </p>
    </section>
  );
}
