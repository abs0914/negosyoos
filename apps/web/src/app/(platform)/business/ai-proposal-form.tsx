"use client";

import Link from "next/link";
import { useActionState } from "react";
import { proposeAiConfigurationAction, type AiBuilderActionState } from "./ai-builder-actions";

const initial:AiBuilderActionState={};
const example=JSON.stringify([{operation:"rename_entity",entityKey:"customer",singularLabel:"Client",pluralLabel:"Clients"}],null,2);

export function AiProposalForm({businessId,revision}:{businessId:string;revision:number}){
 const[state,action,pending]=useActionState(proposeAiConfigurationAction.bind(null,businessId,revision),initial);
 return <form action={action} className="space-y-4 rounded-2xl border bg-card p-5">
  <div><h2 className="text-xl font-semibold">New AI proposal</h2><p className="mt-1 text-sm text-muted-foreground">Accept only declarative DSL operations from an AI provider. Nothing here executes code.</p></div>
  <label className="block text-sm font-medium">Title<input className="mt-1 min-h-11 w-full rounded-lg border px-3" maxLength={160} name="title" placeholder="Improve customer terminology" required/></label>
  <label className="block text-sm font-medium">Summary<textarea className="mt-1 min-h-20 w-full rounded-lg border p-3" maxLength={1000} name="summary" placeholder="Explain the business outcome and proposed changes." required/></label>
  <label className="block text-sm font-medium">Operations JSON<textarea className="mt-1 min-h-64 w-full rounded-lg border bg-background p-3 font-mono text-xs" defaultValue={example} name="operations" required spellCheck={false}/></label>
  <p className="text-xs text-muted-foreground">Base revision {revision}. A stale proposal is rejected if configuration changes before apply.</p>
  <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={pending}>{pending?"Validating…":"Validate and create preview"}</button>
  {state.message?<p className={state.status==="error"?"text-sm text-destructive":"text-sm text-primary"}>{state.message}{state.proposalId?<Link className="ml-2 font-semibold underline" href={`/business/${businessId}/ai-builder/${state.proposalId}`}>Review proposal →</Link>:null}</p>:null}
 </form>;
}
