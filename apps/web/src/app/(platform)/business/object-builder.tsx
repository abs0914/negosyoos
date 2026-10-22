"use client";

import { useActionState, useState } from "react";

import { FIELD_TYPES, type FieldDefinition, type ObjectDefinition } from "@negosyo-os/objects";
import { Button } from "@negosyo-os/ui";

import {
  archiveFieldAction,
  createFieldAction,
  createObjectAction,
  reorderFieldsAction,
  updateFieldAction,
  type ObjectActionState,
} from "./object-actions";

const initialState: ObjectActionState = {};
const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const textareaClass = "min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function StateMessage({ state }: { state: ObjectActionState }) {
  return state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null;
}

export function CreateObjectForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(createObjectAction.bind(null, businessId), initialState);
  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-semibold">Create object</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">Singular label<input className={inputClass} name="singularLabel" placeholder="Customer" required /></label>
        <label className="space-y-2 text-sm font-medium">Plural label<input className={inputClass} name="pluralLabel" placeholder="Customers" required /></label>
        <label className="space-y-2 text-sm font-medium">Stable key<input className={inputClass} name="key" placeholder="customer" required /></label>
      </div>
      <label className="space-y-2 text-sm font-medium">Description<textarea className={textareaClass} name="description" /></label>
      <StateMessage state={state} />
      <Button disabled={pending} type="submit">{pending ? "Creating…" : "Create object"}</Button>
    </form>
  );
}

function FieldDefinitionFields({
  field,
  objects,
  includeKey,
}: {
  field?: FieldDefinition;
  objects: readonly ObjectDefinition[];
  includeKey: boolean;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">Label<input className={inputClass} defaultValue={field?.label} name="label" required /></label>
        {includeKey ? <label className="space-y-2 text-sm font-medium">Stable key<input className={inputClass} name="key" placeholder="customer_name" required /></label> : <div className="space-y-2 text-sm font-medium">Stable key<div className={`${inputClass} flex items-center text-muted-foreground`}>{field?.key}</div></div>}
        <label className="space-y-2 text-sm font-medium">Type<select className={inputClass} defaultValue={field?.type ?? "text"} name="type">{FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Placeholder<input className={inputClass} defaultValue={field?.placeholder} name="placeholder" /></label>
        <label className="space-y-2 text-sm font-medium">Help text<input className={inputClass} defaultValue={field?.helpText} name="helpText" /></label>
      </div>
      <label className="space-y-2 text-sm font-medium">Options <span className="font-normal text-muted-foreground">(one `value|Label` per line)</span><textarea className={textareaClass} defaultValue={field?.options.map((option) => `${option.value}|${option.label}`).join("\n")} name="options" /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">Default value<input className={inputClass} defaultValue={Array.isArray(field?.defaultValue) ? field.defaultValue.join(",") : String(field?.defaultValue ?? "")} name="defaultValue" /></label>
        <label className="space-y-2 text-sm font-medium">Visibility<select className={inputClass} defaultValue={field?.visibility ?? "visible"} name="visibility"><option value="visible">Visible</option><option value="hidden">Hidden</option></select></label>
        <label className="space-y-2 text-sm font-medium">Relation target<select className={inputClass} defaultValue={field?.relationObjectId ?? ""} name="relationObjectId"><option value="">Not a relation</option>{objects.map((object) => <option key={object.id} value={object.id}>{object.singularLabel}</option>)}</select></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <label className="space-y-2 text-sm font-medium">Min length<input className={inputClass} defaultValue={field?.validation.minLength} min="0" name="minLength" type="number" /></label>
        <label className="space-y-2 text-sm font-medium">Max length<input className={inputClass} defaultValue={field?.validation.maxLength} min="1" name="maxLength" type="number" /></label>
        <label className="space-y-2 text-sm font-medium">Minimum<input className={inputClass} defaultValue={field?.validation.minimum} name="minimum" step="any" type="number" /></label>
        <label className="space-y-2 text-sm font-medium">Maximum<input className={inputClass} defaultValue={field?.validation.maximum} name="maximum" step="any" type="number" /></label>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        {[{ name: "required", label: "Required", checked: field?.required }, { name: "unique", label: "Unique", checked: field?.unique }, { name: "readOnly", label: "Read only", checked: field?.readOnly }].map((item) => <label key={item.name}><input name={item.name} type="hidden" value="false" /><input className="mr-2" defaultChecked={item.checked} name={item.name} type="checkbox" value="true" />{item.label}</label>)}
      </div>
    </>
  );
}

export function CreateFieldForm({ businessId, object, objects }: { businessId: string; object: ObjectDefinition; objects: readonly ObjectDefinition[] }) {
  const [state, action, pending] = useActionState(createFieldAction.bind(null, businessId, object.id, object.key), initialState);
  return <form action={action} className="space-y-5 rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">Add field</h2><FieldDefinitionFields includeKey objects={objects} /><StateMessage state={state} /><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add field"}</Button></form>;
}

export function EditFieldForm({ businessId, object, objects, field }: { businessId: string; object: ObjectDefinition; objects: readonly ObjectDefinition[]; field: FieldDefinition }) {
  const [state, action, pending] = useActionState(updateFieldAction.bind(null, businessId, object.id, object.key, field.id), initialState);
  return <details className="rounded-xl border bg-card"><summary className="cursor-pointer px-5 py-4 font-medium">{field.label} <span className="text-xs font-normal text-muted-foreground">{field.key} · {field.type}</span></summary><form action={action} className="space-y-5 border-t p-5"><FieldDefinitionFields field={field} includeKey={false} objects={objects} /><StateMessage state={state} /><div className="flex gap-3"><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save field"}</Button><Button className="border bg-background text-foreground hover:bg-muted" formAction={archiveFieldAction.bind(null, businessId, object.id, object.key, field.id)} type="submit">Archive field</Button></div></form></details>;
}

export function FieldOrderForm({ businessId, object, fields }: { businessId: string; object: ObjectDefinition; fields: readonly FieldDefinition[] }) {
  const [ordered, setOrdered] = useState(fields.filter((field) => field.status === "active"));
  const [pending, setPending] = useState(false);
  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    setOrdered(next);
  }
  return <div className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">Field order</h2><ol className="mt-4 space-y-2">{ordered.map((field, index) => <li className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" key={field.id}><span>{index + 1}. {field.label}</span><span className="flex gap-2"><button aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => move(index, -1)} type="button">↑</button><button aria-label={`Move ${field.label} down`} disabled={index === ordered.length - 1} onClick={() => move(index, 1)} type="button">↓</button></span></li>)}</ol><Button className="mt-4" disabled={pending || ordered.length === 0} onClick={async () => { setPending(true); try { await reorderFieldsAction(businessId, object.id, object.key, ordered.map((field) => field.id)); } finally { setPending(false); } }}>{pending ? "Saving…" : "Save order"}</Button></div>;
}
