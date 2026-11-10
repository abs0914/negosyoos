"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { NegosyoCoach } from "@negosyo-os/onboarding";
import { setCoachDismissedAction } from "./coach-actions";

export function NegosyoCoachPrompt({ businessId, coach }: { businessId: string; coach: NegosyoCoach }) {
  const pathname = usePathname();
  const base = `/business/${businessId}`;
  if (pathname === base || pathname === `${base}/coach` || coach.dismissed) return null;
  return <aside aria-label="Setup guidance" className="workspace-coach-note">
    <div><p className="design-label">Negosyo Coach</p><p className="mt-1 text-sm">{coach.currentTask ? `${coach.completedCount} of ${coach.totalCount} setup tasks complete` : 'Your setup tasks are complete'}</p></div>
    <Link className="site-text-link" href={`${base}/coach`}>{coach.currentTask ? 'Continue setup →' : 'Review setup →'}</Link>
  </aside>;
}

export function CoachVisibilityControl({ businessId, dismissed, playbookKey }: { businessId: string; dismissed: boolean; playbookKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className={`mt-5 min-h-11 w-full rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${dismissed ? "bg-primary text-primary-foreground" : "border"}`} disabled={pending} onClick={() => startTransition(async () => {
    await setCoachDismissedAction(businessId, playbookKey, !dismissed);
    router.refresh();
  })} type="button">{pending ? "Saving…" : dismissed ? "Show setup guidance" : "Hide setup guidance"}</button>;
}
