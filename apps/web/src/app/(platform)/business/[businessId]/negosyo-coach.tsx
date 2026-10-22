"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { NegosyoCoach } from "@negosyo-os/onboarding";

import { setCoachDismissedAction } from "./coach-actions";

export function NegosyoCoachPrompt({ businessId, coach }: { businessId: string; coach: NegosyoCoach }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"responsive" | "open" | "closed">("responsive");
  const [pending, startTransition] = useTransition();
  const setupHref = `/business/${businessId}/coach`;

  const dismiss = () => startTransition(async () => {
    await setCoachDismissedAction(businessId, coach.playbookKey, true);
    setMode("closed");
    router.refresh();
  });

  if (pathname === setupHref) return null;
  if (coach.dismissed) return null;

  if (!coach.currentTask) {
    return <Link className="fixed bottom-4 right-4 z-30 rounded-full border bg-card px-4 py-3 text-sm font-semibold shadow-lg hover:border-primary" href={setupHref}>✓ Setup complete</Link>;
  }

  return <div className="fixed bottom-4 right-4 z-30 w-[min(24rem,calc(100vw-2rem))]">
    <section aria-label="Negosyo Coach" className={`${mode === "closed" ? "hidden" : mode === "open" ? "block" : "hidden sm:block"} overflow-hidden rounded-2xl border bg-card shadow-2xl`}>
      <div className="flex items-start justify-between gap-3 border-b bg-primary/5 p-4">
        <div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Negosyo Coach</p><p className="mt-1 text-sm font-semibold">{coach.completedCount} of {coach.totalCount} setup tasks done</p></div>
        <button aria-label="Minimize coach" className="grid h-9 w-9 place-items-center rounded-lg border bg-card text-lg" onClick={() => setMode("closed")} type="button">−</button>
      </div>
      <div className="p-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coach.percentComplete}%` }} /></div>
        <p className="mt-4 text-xs font-semibold text-muted-foreground">YOUR NEXT STEP</p>
        <h2 className="mt-1 text-lg font-semibold">{coach.currentTask.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{coach.currentTask.description}</p>
        <p className="mt-3 rounded-xl bg-muted p-3 text-sm"><b>Why this matters:</b> {coach.currentTask.reason}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link className="min-h-11 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground" href={coach.currentTask.href}>{coach.currentTask.actionLabel}</Link>
          <Link className="min-h-11 rounded-xl border px-4 py-3 text-center text-sm font-semibold" href={setupHref}>See all steps</Link>
        </div>
        <button className="mt-3 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50" disabled={pending} onClick={dismiss} type="button">{pending ? "Saving…" : "Explore on my own"}</button>
      </div>
    </section>
    <button className={`${mode === "open" ? "hidden" : mode === "closed" ? "flex" : "flex sm:hidden"} ml-auto min-h-12 items-center gap-3 rounded-full border bg-card px-4 text-sm font-semibold shadow-lg hover:border-primary`} onClick={() => setMode("open")} type="button"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{coach.completedCount}/{coach.totalCount}</span><span>Continue setup</span></button>
  </div>;
}

export function CoachVisibilityControl({ businessId, dismissed, playbookKey }: { businessId: string; dismissed: boolean; playbookKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className={`mt-5 min-h-11 w-full rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${dismissed ? "bg-primary text-primary-foreground" : "border"}`} disabled={pending} onClick={() => startTransition(async () => {
    await setCoachDismissedAction(businessId, playbookKey, !dismissed);
    router.refresh();
  })} type="button">{pending ? "Saving…" : dismissed ? "Open Negosyo Coach" : "Explore on my own"}</button>;
}
