import Link from "next/link";

import { getNegosyoCoach } from "@negosyo-os/onboarding/server";

import { CoachVisibilityControl } from "../negosyo-coach";

export default async function CoachPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const coach = await getNegosyoCoach(businessId);
  if (!coach) return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold text-primary">Negosyo Coach</p><h1 className="mt-2 text-3xl font-semibold">No setup tasks are assigned</h1><p className="mt-3 text-muted-foreground">Your role does not have any setup actions. Ask the business owner if you need access.</p></main>;

  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <p className="text-sm font-semibold text-primary">Negosyo Coach</p>
        <h1 className="mt-2 text-3xl font-semibold">{coach.missionTitle}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{coach.missionDescription}</p>
        <div className="mt-8 space-y-3">
          {coach.tasks.map((task, index) => <article className={`rounded-2xl border p-5 ${task.status === "current" ? "border-primary bg-primary/5 shadow-sm" : "bg-card"}`} key={task.key}>
            <div className="flex gap-4">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${task.status === "completed" ? "bg-primary text-primary-foreground" : task.status === "current" ? "border-2 border-primary text-primary" : "bg-muted text-muted-foreground"}`}>{task.status === "completed" ? "✓" : index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{task.title}</h2><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{task.status === "completed" ? "Done" : task.status === "current" ? "Next" : "Later"}</span></div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{task.description}</p>
                {task.status === "current" ? <><p className="mt-3 text-sm"><b>Why this matters:</b> {task.reason}</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" href={task.href}>{task.actionLabel} <span className="ml-2" aria-hidden="true">→</span></Link></> : null}
              </div>
            </div>
          </article>)}
        </div>
        {!coach.currentTask ? <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Review your first business results</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your available setup tasks are complete. Open the dashboard, compare recorded transactions with your receipts, and check stock alerts. Receipt totals are not profit or cash flow.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" href={`/business/${businessId}`}>Review dashboard</Link>
        </section> : null}
      </div>
      <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-8">
        <p className="text-sm font-semibold">Your setup progress</p>
        <p className="mt-2 text-4xl font-semibold text-primary">{coach.percentComplete}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${coach.percentComplete}%` }} /></div>
        <p className="mt-3 text-sm text-muted-foreground">{coach.completedCount} of {coach.totalCount} real business tasks completed.</p>
        <p className="mt-5 border-t pt-5 text-sm leading-6 text-muted-foreground">No manual checkboxes. The coach recognizes work you actually complete in NegosyoOS.</p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{coach.dismissed ? "The floating coach is hidden while you work. Open it again anytime—your progress is still here." : "Already comfortable with the system? Hide the floating guidance and work at your own pace."}</p>
        <CoachVisibilityControl businessId={businessId} dismissed={coach.dismissed} playbookKey={coach.playbookKey} />
      </aside>
    </div>
  </main>;
}
