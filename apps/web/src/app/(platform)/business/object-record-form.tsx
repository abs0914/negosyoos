"use client";

import { useActionState } from "react";

import type { Branch } from "@negosyo-os/business";
import type { FieldDefinition, ObjectDefinition, ObjectRecord } from "@negosyo-os/objects";
import { Button } from "@negosyo-os/ui";

import { saveRecordAction, type ObjectActionState } from "./object-actions";

const initialState: ObjectActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const textareaClass = "min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function valueFor(field: FieldDefinition, record?: ObjectRecord) {
  return record?.attributes[field.key] ?? field.defaultValue;
}

function RecordField({ field, record, branches }: { field: FieldDefinition; record?: ObjectRecord | undefined; branches: readonly Branch[] }) {
  if (field.status !== "active" || field.visibility === "hidden") return null;
  const value = valueFor(field, record);
  const name = `attribute.${field.key}`;
  const label = <span>{field.label}{field.required ? " *" : ""}{field.helpText ? <span className="block text-xs font-normal text-muted-foreground">{field.helpText}</span> : null}</span>;
  const disabled = field.readOnly;
  if (field.readOnly) return <div className="space-y-2 text-sm font-medium">{label}<div className={`${inputClass} flex items-center text-muted-foreground`}>{Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</div></div>;
  if (field.type === "boolean") return <label className="flex items-start gap-3 text-sm font-medium"><input name={name} type="hidden" value="__unchecked__" /><input className="mt-1" defaultChecked={value === true} disabled={disabled} name={name} type="checkbox" value="true" />{label}</label>;
  if (["select", "status"].includes(field.type)) return <label className="space-y-2 text-sm font-medium">{label}<select className={inputClass} defaultValue={String(value ?? "")} disabled={disabled} name={name} required={field.required}><option value="">Select…</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  if (field.type === "multiselect") { const selected = new Set(Array.isArray(value) ? value : []); return <fieldset><legend className="text-sm font-medium">{label}</legend><div className="mt-2 flex flex-wrap gap-4">{field.options.map((option) => <label className="text-sm" key={option.value}><input className="mr-2" defaultChecked={selected.has(option.value)} disabled={disabled} name={name} type="checkbox" value={option.value} />{option.label}</label>)}</div></fieldset>; }
  if (field.type === "branch") return <label className="space-y-2 text-sm font-medium">{label}<select className={inputClass} defaultValue={String(value ?? "")} disabled={disabled} name={name} required={field.required}><option value="">Select Branch…</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>;
  if (field.type === "textarea") return <label className="space-y-2 text-sm font-medium">{label}<textarea className={textareaClass} defaultValue={String(value ?? "")} disabled={disabled} name={name} placeholder={field.placeholder} required={field.required} /></label>;
  if (field.type === "attachment") return <label className="space-y-2 text-sm font-medium">{label}<textarea className={textareaClass} defaultValue={Array.isArray(value) ? value.join(", ") : ""} disabled={disabled} name={name} placeholder="business-id/path/to/file.pdf" /><span className="block text-xs font-normal text-muted-foreground">Comma-separated paths in Business storage.</span></label>;
  const htmlType = field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "date" ? "date" : ["number", "decimal", "currency", "percentage"].includes(field.type) ? "number" : "text";
  return <label className="space-y-2 text-sm font-medium">{label}<input className={inputClass} defaultValue={String(value ?? "")} disabled={disabled} max={field.validation.maximum} maxLength={field.validation.maxLength} min={field.validation.minimum} minLength={field.validation.minLength} name={name} placeholder={field.placeholder ?? (field.type === "relation" || field.type === "user" ? "UUID" : undefined)} required={field.required} step={["decimal", "currency", "percentage"].includes(field.type) ? "any" : undefined} type={htmlType} /></label>;
}

export function ObjectRecordForm({ businessId, object, fields, branches, record }: { businessId: string; object: ObjectDefinition; fields: readonly FieldDefinition[]; branches: readonly Branch[]; record?: ObjectRecord }) {
  const action = saveRecordAction.bind(null, businessId, object.key, object.id, record?.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction} className="space-y-6 rounded-2xl border bg-card p-6"><label className="space-y-2 text-sm font-medium">Record Branch<select className={inputClass} defaultValue={record?.branchId ?? ""} name="branchId"><option value="">Business-wide</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>{fields.map((field) => <RecordField branches={branches} field={field} key={field.id} record={record} />)}{state.message ? <p className="text-sm text-destructive" role="status">{state.message}</p> : null}<Button disabled={pending} type="submit">{pending ? "Saving…" : record ? "Save record" : `Create ${object.singularLabel}`}</Button></form>;
}
