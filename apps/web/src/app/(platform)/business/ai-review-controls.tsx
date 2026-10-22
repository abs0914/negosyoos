"use client";

import { useActionState } from "react";
import { progressAiConfigurationAction, type AiBuilderActionState } from "./ai-builder-actions";

const initial:AiBuilderActionState={};
export function AiReviewControls({businessId,proposalId,status}:{businessId:string;proposalId:string;status:string}){
 const[state,action,pending]=useActionState(progressAiConfigurationAction.bind(null,businessId,proposalId),initial);
 return <form action={action} className="rounded-2xl border bg-card p-5">
  <h2 className="font-semibold">Human decision</h2><p className="mt-1 text-sm text-muted-foreground">Approval never applies a change automatically. Apply is a separate, explicit action.</p>
  <div className="mt-4 grid gap-2 sm:grid-cols-2">
   {status==="validated"?<><button className="min-h-11 rounded-lg bg-primary font-semibold text-primary-foreground" disabled={pending} name="action" value="approve">Approve preview</button><button className="min-h-11 rounded-lg border font-semibold text-destructive" disabled={pending} name="action" value="reject">Reject</button></>:null}
   {status==="approved"?<button className="min-h-11 rounded-lg bg-primary font-semibold text-primary-foreground sm:col-span-2" disabled={pending} name="action" value="apply">Apply configuration</button>:null}
   {status==="applied"?<button className="min-h-11 rounded-lg border font-semibold text-destructive sm:col-span-2" disabled={pending} name="action" value="rollback">Roll back latest revision</button>:null}
   {!["validated","approved","applied"].includes(status)?<p className="text-sm text-muted-foreground sm:col-span-2">No action is available for this proposal state.</p>:null}
  </div>
  {state.message?<p className={state.status==="error"?"mt-3 text-sm text-destructive":"mt-3 text-sm text-primary"}>{state.message}</p>:null}
 </form>;
}
