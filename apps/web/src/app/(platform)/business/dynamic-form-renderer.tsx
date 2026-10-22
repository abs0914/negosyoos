"use client";

import { useActionState, useMemo, useState } from "react";

import type { Branch } from "@negosyo-os/business";
import { evaluateVisibilityRule, type FormDefinitionWithLayout, type FormLayoutField } from "@negosyo-os/forms";
import type { FieldDefinition, ObjectAttributeValue, ObjectRecord } from "@negosyo-os/objects";
import { Button } from "@negosyo-os/ui";

import type { FormActionState } from "./form-actions";

const inputClass = "mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-muted";

function initialValue(field: FieldDefinition, item: FormLayoutField, record?: ObjectRecord): ObjectAttributeValue | undefined {
  return record?.attributes[field.key] ?? item.defaultValue ?? field.defaultValue;
}

function FieldControl({ field, item, value, onValue, preview = false }: {
  field: FieldDefinition; item: FormLayoutField; value: ObjectAttributeValue | undefined;
  onValue: (value: ObjectAttributeValue) => void; preview?: boolean;
}) {
  const disabled = item.readOnly || field.readOnly;
  const name = preview || disabled ? undefined : `attribute.${field.key}`;
  const common = { id: `form-field-${field.id}`, name, disabled, className: inputClass };
  if (field.type === "textarea" || field.type === "attachment") {
    return <textarea {...common} defaultValue={Array.isArray(value) ? value.join(", ") : String(value ?? "")} onChange={(event) => onValue(event.target.value)} rows={field.type === "textarea" ? 4 : 2} />;
  }
  if (["select", "status"].includes(field.type)) {
    return <select {...common} value={String(value ?? "")} onChange={(event) => onValue(event.target.value)}><option value="">Select…</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  }
  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return <select {...common} multiple value={[...selected]} onChange={(event) => onValue([...event.target.selectedOptions].map((option) => option.value))}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  }
  if (field.type === "boolean") {
    return <label className="mt-2 flex items-center gap-2 text-sm"><input name={name} type="hidden" value="__unchecked__" disabled={disabled} /><input id={common.id} name={name} type="checkbox" value="true" disabled={disabled} checked={value === true} onChange={(event) => onValue(event.target.checked)} /> Yes</label>;
  }
  const type = field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "date" ? "date" : ["number", "decimal", "currency", "percentage"].includes(field.type) ? "number" : "text";
  return <input {...common} type={type} step={["decimal", "currency", "percentage"].includes(field.type) ? "any" : undefined} value={String(value ?? "")} placeholder={field.placeholder} onChange={(event) => onValue(type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value)} />;
}

export function DynamicFormFields({ form, fields, record, preview = false }: {
  form: FormDefinitionWithLayout; fields: readonly FieldDefinition[]; record?: ObjectRecord; preview?: boolean;
}) {
  const byId = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const initial = useMemo(() => Object.fromEntries(form.layout.sections.flatMap((section) => section.fields).map((item) => {
    const field = byId.get(item.fieldId);
    return [item.fieldId, field ? initialValue(field, item, record) : undefined];
  })), [byId, form.layout.sections, record]);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  return <div className="space-y-6">{form.layout.sections.map((section) => <section className="rounded-2xl border bg-card p-5" key={section.key}><h2 className="font-semibold">{section.title}</h2>{section.description ? <p className="mt-1 text-sm text-muted-foreground">{section.description}</p> : null}<div className={`mt-5 grid grid-cols-1 gap-4 ${section.columns === 2 ? "md:grid-cols-2" : ""}`}>{section.fields.map((item) => {
    const field = byId.get(item.fieldId);
    if (!field || !evaluateVisibilityRule(item.visibilityRule, values)) return null;
    const required = field.required || item.required;
    return <div className={item.width === "full" && section.columns === 2 ? "md:col-span-2" : ""} key={item.fieldId}><label className="text-sm font-medium" htmlFor={`form-field-${field.id}`}>{field.label}{required ? " *" : ""}</label><FieldControl field={field} item={item} value={values[item.fieldId] as ObjectAttributeValue | undefined} onValue={(value) => setValues((current) => ({ ...current, [item.fieldId]: value }))} preview={preview} />{field.helpText ? <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p> : null}{item.visibilityRule ? <p className="mt-1 text-xs text-primary">Shown conditionally</p> : null}</div>;
  })}</div></section>)}</div>;
}

export function DynamicFormRenderer({ action, branches, fields, form, record }: {
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  branches: readonly Branch[]; fields: readonly FieldDefinition[]; form: FormDefinitionWithLayout; record?: ObjectRecord;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-6"><div><label className="text-sm font-medium" htmlFor="branchId">Branch</label><select className={inputClass} defaultValue={record?.branchId ?? ""} id="branchId" name="branchId"><option value="">Business-wide</option>{branches.filter((branch) => branch.isActive).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><DynamicFormFields fields={fields} form={form} {...(record ? { record } : {})} />{state.message ? <p aria-live="polite" className={`text-sm ${state.status === "error" ? "text-destructive" : "text-primary"}`}>{state.message}</p> : null}<Button disabled={pending} type="submit">{pending ? "Saving…" : record ? "Save changes" : "Create record"}</Button></form>;
}
