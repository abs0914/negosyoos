import Link from "next/link";

import { BusinessForm } from "../business-form";

export default function NewBusinessPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <Link className="text-sm font-semibold text-primary hover:underline" href="/dashboard">← Businesses</Link>
      <h1 className="mt-6 text-3xl font-semibold">Create a business</h1>
      <p className="mb-8 mt-2 text-muted-foreground">Give your business a workspace for its team, records, and daily operations. You can add branches and tools as you grow.</p>
      <section className="rounded-2xl border bg-card p-6"><BusinessForm /></section>
    </main>
  );
}
