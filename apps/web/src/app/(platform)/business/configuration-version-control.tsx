"use client";

import { useActionState } from "react";

import { restoreConfigurationVersionAction, type ConfigurationVersionActionState } from "./configuration-version-actions";

const initial:ConfigurationVersionActionState={};
export function ConfigurationVersionRestoreControl({businessId,targetVersion}:{businessId:string;targetVersion:number}){const[actionState,action,pending]=useActionState(restoreConfigurationVersionAction.bind(null,businessId,targetVersion),initial);return <form action={action} className="space-y-2"><button className="min-h-10 rounded-lg border border-primary px-3 text-sm font-semibold text-primary disabled:opacity-50" disabled={pending} type="submit">{pending?"Restoring…":`Restore v${targetVersion}`}</button>{actionState.message?<p className={`text-xs ${actionState.status==="error"?"text-destructive":"text-emerald-700"}`} role="status">{actionState.message}</p>:null}</form>}
