import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-xl border border-border bg-card shadow-card", className)} {...props} />; }

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { readonly tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  const tones = { neutral: "bg-muted text-muted-foreground", primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning-foreground", danger: "bg-destructive/10 text-destructive" };
  return <span className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-bold", tones[tone], className)} {...props} />;
}

export function Field({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("h-11 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-inner outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-ring/20", className)} {...props} />; }

export function PageHeader({ actions, eyebrow, title, description, className }: { readonly actions?: ReactNode; readonly className?: string; readonly description?: ReactNode; readonly eyebrow?: string; readonly title: ReactNode }) {
  return <header className={cn("flex flex-col gap-5 border-b border-border pb-5 md:flex-row md:items-end md:justify-between", className)}><div className="min-w-0">{eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}<h1 className="mt-2 text-[clamp(1.9rem,3.2vw,3rem)] leading-[1.04] font-semibold tracking-[-0.055em] wrap-anywhere">{title}</h1>{description ? <div className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</div> : null}</div>{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}</header>;
}

export function EmptyState({ action, description, icon, title, className }: { readonly action?: ReactNode; readonly className?: string; readonly description: ReactNode; readonly icon?: ReactNode; readonly title: ReactNode }) {
  return <div className={cn("rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center", className)}>{icon ? <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</div> : null}<h2 className="text-lg font-bold">{title}</h2><div className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</div>{action ? <div className="mt-5 flex justify-center">{action}</div> : null}</div>;
}

export function StatCard({ detail, icon, label, tone = "primary", value, className }: { readonly className?: string; readonly detail?: ReactNode; readonly icon?: ReactNode; readonly label: ReactNode; readonly tone?: "primary" | "success" | "warning" | "neutral"; readonly value: ReactNode }) {
  const tones = { primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning-foreground", neutral: "bg-muted text-muted-foreground" };
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {icon ? <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tones[tone])}>{icon}</div> : null}
      </div>
      <p className="mt-2 text-[clamp(1.35rem,2.4vw,2.15rem)] leading-none font-semibold tracking-[-.05em] wrap-anywhere tabular-nums">{value}</p>
      {detail ? <div className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</div> : null}
    </Card>
  );
}

export function Skeleton({ className }: { readonly className?: string }) { return <span aria-hidden="true" className={cn("block animate-pulse rounded-lg bg-muted", className)} />; }
