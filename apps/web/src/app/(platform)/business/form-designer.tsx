"use client";

import { useActionState, useMemo, useState } from "react";

import type { FormDefinitionWithLayout, FormLayoutField, FormSection } from "@negosyo-os/forms";
import type { FieldDefinition, ObjectAttributeValue, ObjectDefinition } from "@negosyo-os/objects";
import { Button } from "@negosyo-os/ui";

import type { FormActionState } from "./form-actions";
import { DynamicFormFields } from "./dynamic-form-renderer";

const control = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

function layoutField(field: FieldDefinition): FormLayoutField {
  return { fieldId: field.id, width: "full", required: false, readOnly: false };
}

function cloneSections(sections: readonly FormSection[]): FormSection[] {
  return sections.map((section) => ({ ...section, fields: section.fields.map((field) => ({
    ...field,
    ...(field.visibilityRule ? { visibilityRule: { ...field.visibilityRule, conditions: field.visibilityRule.conditions.map((condition) => ({ ...condition })) } } : {}),
  })) }));
}

function designerValue(field: FieldDefinition | undefined, raw: string): ObjectAttributeValue | undefined {
  if (raw === "") return undefined;
  if (!field) return raw;
  if (["number", "decimal", "currency", "percentage"].includes(field.type)) return Number(raw);
  if (field.type === "boolean") return raw === "true";
  if (["multiselect", "attachment"].includes(field.type)) return raw.split(",").map((item) => item.trim()).filter(Boolean);
  return raw;
}

export function FormDesigner({ action, fields, form, object }: {
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  fields: readonly FieldDefinition[]; form?: FormDefinitionWithLayout; object: ObjectDefinition;
}) {
  const visibleFields = fields.filter((field) => field.status === "active" && field.visibility === "visible");
  const [sections, setSections] = useState<FormSection[]>(() => form
    ? cloneSections(form.layout.sections)
    : [{ key: "details", title: "Details", description: "", columns: 1, fields: visibleFields.map(layoutField) }]);
  const [state, formAction, pending] = useActionState(action, {});
  const byId = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const previewForm: FormDefinitionWithLayout = {
    definition: form?.definition ?? { id: "preview", businessId: object.businessId, objectDefinitionId: object.id, key: "preview", name: "Preview", description: null, mode: "create", status: "active", createdAt: "", updatedAt: "" },
    layout: { id: "preview", businessId: object.businessId, formDefinitionId: "preview", version: form?.layout.version ?? 1, sections, createdAt: "", updatedAt: "" },
  };

  function updateSection(index: number, patch: Partial<FormSection>) {
    setSections((current) => current.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section));
  }
  function updateField(sectionIndex: number, fieldIndex: number, patch: Partial<FormLayoutField>) {
    setSections((current) => current.map((section, itemIndex) => itemIndex !== sectionIndex ? section : {
      ...section, fields: section.fields.map((item, index) => index === fieldIndex ? { ...item, ...patch } : item),
    }));
  }
  function moveField(sectionIndex: number, fieldIndex: number, direction: -1 | 1) {
    setSections((current) => {
      const next = cloneSections(current);
      const items = [...(next[sectionIndex]?.fields ?? [])];
      const target = fieldIndex + direction;
      if (target < 0 || target >= items.length) return current;
      [items[fieldIndex], items[target]] = [items[target]!, items[fieldIndex]!];
      next[sectionIndex] = { ...next[sectionIndex]!, fields: items };
      return next;
    });
  }
  function moveToSection(fromSection: number, fieldIndex: number, destination: number) {
    if (fromSection === destination) return;
    setSections((current) => {
      const next = cloneSections(current);
      const source = [...next[fromSection]!.fields];
      const [item] = source.splice(fieldIndex, 1);
      if (!item) return current;
      next[fromSection] = { ...next[fromSection]!, fields: source };
      next[destination] = { ...next[destination]!, fields: [...next[destination]!.fields, item] };
      return next;
    });
  }
  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current]; [next[index], next[target]] = [next[target]!, next[index]!]; return next;
    });
  }

  const earlierIds = (sectionIndex: number, fieldIndex: number) => sections.slice(0, sectionIndex).flatMap((section) => section.fields.map((item) => item.fieldId)).concat(sections[sectionIndex]?.fields.slice(0, fieldIndex).map((item) => item.fieldId) ?? []);
  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]"><form action={formAction} className="space-y-6"><input name="layout" type="hidden" value={JSON.stringify({ sections })} /><div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2"><label className="text-sm font-medium">Form name<input className={control} defaultValue={form?.definition.name} name="name" required /></label><label className="text-sm font-medium">Stable key<input className={control} defaultValue={form?.definition.key} name="key" pattern="[a-z][a-z0-9_]*" readOnly={Boolean(form)} required /></label><label className="text-sm font-medium">Mode<select className={control} defaultValue={form?.definition.mode ?? "create"} name="mode"><option value="create">Create</option><option value="edit">Edit</option></select></label><label className="text-sm font-medium md:col-span-2">Description<textarea className={control} defaultValue={form?.definition.description ?? ""} name="description" rows={2} /></label></div>
  <div className="space-y-5">{sections.map((section, sectionIndex) => <section className="rounded-2xl border bg-card p-5" key={`${section.key}-${sectionIndex}`}><div className="flex flex-wrap items-end gap-3"><label className="min-w-40 flex-1 text-sm font-medium">Section title<input className={control} value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} /></label><label className="w-36 text-sm font-medium">Key<input className={control} value={section.key} onChange={(event) => updateSection(sectionIndex, { key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></label><label className="w-28 text-sm font-medium">Columns<select className={control} value={section.columns} onChange={(event) => updateSection(sectionIndex, { columns: Number(event.target.value) as 1 | 2 })}><option value={1}>One</option><option value={2}>Two</option></select></label><button className="rounded border px-2 py-2 text-xs" type="button" onClick={() => moveSection(sectionIndex, -1)}>↑</button><button className="rounded border px-2 py-2 text-xs" type="button" onClick={() => moveSection(sectionIndex, 1)}>↓</button></div><textarea className={`${control} mt-3`} value={section.description ?? ""} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} placeholder="Section description" rows={2} /><div className="mt-4 space-y-3">{section.fields.map((item, fieldIndex) => {
    const field = byId.get(item.fieldId); if (!field) return null;
    const sourceIds = earlierIds(sectionIndex, fieldIndex);
    const rule = item.visibilityRule;
    const condition = rule?.conditions[0];
    const sourceField = condition ? byId.get(condition.sourceFieldId) : undefined;
    return <div className="rounded-xl border p-4" key={item.fieldId}><div className="flex flex-wrap items-center gap-2"><strong className="mr-auto text-sm">{field.label}</strong><button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => moveField(sectionIndex, fieldIndex, -1)}>↑</button><button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => moveField(sectionIndex, fieldIndex, 1)}>↓</button><select className="rounded border bg-background px-2 py-1 text-xs" value={sectionIndex} onChange={(event) => moveToSection(sectionIndex, fieldIndex, Number(event.target.value))}>{sections.map((target, targetIndex) => <option key={`${target.key}-${targetIndex}`} value={targetIndex}>{target.title || `Section ${targetIndex + 1}`}</option>)}</select></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs">Width<select className={control} value={item.width} onChange={(event) => updateField(sectionIndex, fieldIndex, { width: event.target.value as "full" | "half" })}><option value="full">Full</option><option value="half">Half</option></select></label><label className="text-xs">Default value<input className={control} value={Array.isArray(item.defaultValue) ? item.defaultValue.join(",") : String(item.defaultValue ?? "")} onChange={(event) => updateField(sectionIndex, fieldIndex, { defaultValue: designerValue(field, event.target.value) })} /></label></div><div className="mt-3 flex flex-wrap gap-4 text-xs"><label><input checked={item.required} type="checkbox" onChange={(event) => updateField(sectionIndex, fieldIndex, { required: event.target.checked })} /> Required</label><label><input checked={item.readOnly} type="checkbox" onChange={(event) => updateField(sectionIndex, fieldIndex, { readOnly: event.target.checked })} /> Read-only</label><label><input checked={Boolean(rule)} disabled={sourceIds.length === 0} type="checkbox" onChange={(event) => updateField(sectionIndex, fieldIndex, { visibilityRule: event.target.checked && sourceIds[0] ? { logic: "all", conditions: [{ sourceFieldId: sourceIds[0], operator: "equals", value: true }] } : undefined })} /> Conditional</label></div>{rule && condition ? <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-3"><select className={control} value={condition.sourceFieldId} onChange={(event) => updateField(sectionIndex, fieldIndex, { visibilityRule: { logic: rule.logic, conditions: [{ ...condition, sourceFieldId: event.target.value, value: undefined, operator: "is_not_empty" }] } })}>{sourceIds.map((id) => <option key={id} value={id}>{byId.get(id)?.label}</option>)}</select><select className={control} value={condition.operator} onChange={(event) => { const operator = event.target.value as typeof condition.operator; updateField(sectionIndex, fieldIndex, { visibilityRule: { logic: rule.logic, conditions: [{ sourceFieldId: condition.sourceFieldId, operator, ...(["equals", "not_equals"].includes(operator) ? { value: sourceField?.type === "boolean" ? true : "" } : {}) }] } }); }}><option value="equals">equals</option><option value="not_equals">does not equal</option><option value="is_empty">is empty</option><option value="is_not_empty">is not empty</option></select>{["equals", "not_equals"].includes(condition.operator) ? <input className={control} value={String(condition.value ?? "")} onChange={(event) => updateField(sectionIndex, fieldIndex, { visibilityRule: { logic: rule.logic, conditions: [{ ...condition, value: designerValue(sourceField, event.target.value) }] } })} placeholder="Comparison value" /> : <span />}</div> : null}</div>;
  })}{section.fields.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Move at least one field into this section before saving.</p> : null}</div></section>)}</div><Button className="border bg-background text-foreground" type="button" onClick={() => setSections((current) => [...current, { key: `section_${current.length + 1}`, title: `Section ${current.length + 1}`, description: "", columns: 1, fields: [] }])}>Add section</Button>{state.message ? <p aria-live="polite" className={`text-sm ${state.status === "error" ? "text-destructive" : "text-primary"}`}>{state.message}</p> : null}<Button disabled={pending} type="submit">{pending ? "Saving…" : "Save form"}</Button></form><aside className="xl:sticky xl:top-6 xl:self-start"><p className="mb-3 text-sm font-semibold text-primary">Live mobile-responsive preview</p><div className="rounded-2xl border bg-muted/20 p-4"><DynamicFormFields fields={fields} form={previewForm} key={JSON.stringify(sections)} preview /></div></aside></div>;
}
