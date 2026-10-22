"use client";
import { useActionState } from "react";
import type { WorkflowActionState } from "./workflow-actions";
export function WorkflowRunForm({ action, label, showIdempotency = false }: { action: (state: WorkflowActionState, data: FormData) => Promise<WorkflowActionState>; label: string; showIdempotency?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-3"><label className="block text-sm font-medium">Source record ID <span className="font-normal text-muted-foreground">(optional)</span><input className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" name="sourceRecordId" placeholder="UUID" /></label>{showIdempotency ? <label className="block text-sm font-medium">Idempotency reference<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" name="idempotencyKey" placeholder="e.g. Q-1042-approval" /></label> : null}<button className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={pending}>{pending ? "Running…" : label}</button>{state.message ? <p className={`text-sm ${state.status === "error" ? "text-destructive" : "text-primary"}`}>{state.message}{state.executionId ? ` Execution ${state.executionId.slice(0, 8)}.` : ""}</p> : null}</form>;
}
