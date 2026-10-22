"use client";

import { useActionState } from "react";

import type {
  ModuleConfigurationField,
  ModuleConfigurationValue,
  ModuleRegistryEntry,
} from "@negosyo-os/modules";
import { Button } from "@negosyo-os/ui";

import {
  setBusinessModuleStateAction,
  type ModuleActionState,
} from "./module-actions";

const initialState: ModuleActionState = {};
const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function ConfigurationInput({
  fieldKey,
  field,
  value,
}: {
  fieldKey: string;
  field: ModuleConfigurationField;
  value: ModuleConfigurationValue | undefined;
}) {
  const name = `configuration.${fieldKey}`;
  const description = field.description
    ? <span className="block text-xs font-normal text-muted-foreground">{field.description}</span>
    : null;

  if (field.type === "boolean") {
    return (
      <label className="flex items-start gap-3 text-sm font-medium">
        <input name={name} type="hidden" value="false" />
        <input className="mt-1" defaultChecked={value === true || (value === undefined && field.default === true)} name={name} type="checkbox" value="true" />
        <span>{field.label}{description}</span>
      </label>
    );
  }

  if (field.type === "enum") {
    return (
      <label className="space-y-2 text-sm font-medium">{field.label}{description}
        <select className={inputClass} defaultValue={String(value ?? field.default ?? "")} name={name} required={field.required}>
          {!field.required ? <option value="">Select…</option> : null}
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return (
    <label className="space-y-2 text-sm font-medium">{field.label}{description}
      <input
        className={inputClass}
        defaultValue={String(value ?? field.default ?? "")}
        max={field.type === "string" ? undefined : field.maximum}
        maxLength={field.type === "string" ? field.maxLength : undefined}
        min={field.type === "string" ? undefined : field.minimum}
        minLength={field.type === "string" ? field.minLength : undefined}
        name={name}
        required={field.required}
        step={field.type === "number" ? "any" : field.type === "integer" ? 1 : undefined}
        type={field.type === "string" ? "text" : "number"}
      />
    </label>
  );
}

function ModuleCard({
  businessId,
  entry,
  canManage,
}: {
  businessId: string;
  entry: ModuleRegistryEntry;
  canManage: boolean;
}) {
  const action = setBusinessModuleStateAction.bind(null, businessId, entry.definition.key);
  const [state, formAction, pending] = useActionState(action, initialState);
  const enabled = entry.businessModule?.enabled ?? false;
  const fields = Object.entries(entry.definition.configurationSchema.properties);

  return (
    <article className="rounded-2xl border bg-card p-6" id={entry.definition.key}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{entry.definition.category} · {entry.definition.icon}</p>
          <h2 className="mt-1 text-xl font-semibold">{entry.definition.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{entry.definition.description}</p>
        </div>
        <span className={enabled ? "rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary" : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div><dt className="text-muted-foreground">Version</dt><dd className="font-medium">v{entry.definition.version}</dd></div>
        <div><dt className="text-muted-foreground">Minimum plan</dt><dd className="font-medium capitalize">{entry.definition.minimumPlan}</dd></div>
      </dl>
      {entry.definition.dependencies.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">Requires: <span className="font-medium text-foreground">{entry.definition.dependencies.join(", ")}</span></p>
      ) : null}

      {canManage ? (
        <form action={formAction} className="mt-6 space-y-4">
          <input name="enabled" type="hidden" value="true" />
          {fields.map(([fieldKey, field]) => (
            <ConfigurationInput
              field={field}
              fieldKey={fieldKey}
              key={fieldKey}
              value={entry.businessModule?.configuration[fieldKey]}
            />
          ))}
          {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={pending} type="submit">{pending ? "Saving…" : enabled ? "Save configuration" : "Activate module"}</Button>
            {enabled ? (
              <Button className="border bg-background text-foreground hover:bg-muted" formAction={formAction} name="enabled" type="submit" value="false">Deactivate</Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </article>
  );
}

export function ModuleRegistry({
  businessId,
  entries,
  canManage,
}: {
  businessId: string;
  entries: readonly ModuleRegistryEntry[];
  canManage: boolean;
}) {
  const categories = Map.groupBy(entries, (entry) => entry.definition.category);
  return (
    <div className="space-y-12">
      {[...categories.entries()].map(([category, categoryEntries]) => (
        <section key={category}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {categoryEntries.map((entry) => <ModuleCard businessId={businessId} canManage={canManage} entry={entry} key={entry.definition.key} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
