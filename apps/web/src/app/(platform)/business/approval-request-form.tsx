"use client";
import { useActionState } from "react";
import type { ApprovalActionState } from "./approval-actions";
const input="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm";
export function ApprovalRequestForm({action}:{action:(state:ApprovalActionState,data:FormData)=>Promise<ApprovalActionState>}) {
  const [state,formAction,pending]=useActionState(action,{});
  return <form action={formAction} className="mt-8 space-y-5 rounded-2xl border bg-card p-6">
    <label className="block text-sm font-medium">Category<select className={input} name="category" defaultValue="discount"><option value="discount">Discount</option><option value="expense">Expense</option><option value="purchase">Purchase</option><option value="refund">Refund</option><option value="inventory_adjustment">Inventory adjustment</option><option value="custom">Custom</option></select></label>
    <label className="block text-sm font-medium">Title<input className={input} name="title" placeholder="Discount approval for Quotation Q-1042" required /></label>
    <label className="block text-sm font-medium">Description<textarea className={input} name="description" rows={3} placeholder="Explain what the approvers should review." /></label>
    <label className="block text-sm font-medium">Approval steps <span className="font-normal text-muted-foreground">(ordered metadata)</span><textarea className={`${input} font-mono text-xs`} name="steps" rows={10} defaultValue={'[\n  {"key":"manager_review","name":"Store Manager review","approverRoleKey":"manager"}\n]'} required /></label>
    <p className="text-xs text-muted-foreground">Each step accepts exactly one <code>approverRoleKey</code> or <code>approverUserId</code>. Add more array items for sequential approval.</p>
    {state.message?<p className={`text-sm ${state.status==="error"?"text-destructive":"text-primary"}`}>{state.message}</p>:null}
    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60" disabled={pending}>{pending?"Requesting…":"Request approval"}</button>
  </form>;
}
