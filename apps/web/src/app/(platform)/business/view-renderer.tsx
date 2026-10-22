import Link from "next/link";

import type { Branch } from "@negosyo-os/business";
import type { FieldDefinition, ObjectAttributeValue, ObjectRecord } from "@negosyo-os/objects";
import type { RenderedView, ViewDefinition } from "@negosyo-os/views";
import { valueFor } from "@negosyo-os/views";

export interface ViewRendererProps {
  definition: ViewDefinition;
  result: RenderedView;
  fields: readonly FieldDefinition[];
  branches: readonly Branch[];
  basePath: string;
  recordHref?: ((record: ObjectRecord) => string) | undefined;
  runtime: { search?: string | undefined; branchId?: string | undefined; savedFilterKey?: string | undefined };
}

function fieldLabel(key: string, fields: readonly FieldDefinition[]): string {
  if (key === "record") return "Record";
  if (key === "branch") return "Branch";
  if (key === "created_at") return "Created";
  if (key === "updated_at") return "Updated";
  return fields.find((field) => field.key === key)?.label ?? key;
}

function optionLabel(field: FieldDefinition | undefined, value: string): string {
  return field?.options.find((option) => option.value === value)?.label ?? value;
}

function displayValue(value: ObjectAttributeValue | undefined, field: FieldDefinition | undefined, branches: readonly Branch[]): string {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  if (Array.isArray(value)) return value.map((item) => optionLabel(field, item)).join(", ");
  if (field?.type === "boolean") return value ? "Yes" : "No";
  if (field?.type === "currency" && typeof value === "number") return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
  if (field?.type === "percentage" && typeof value === "number") return `${value}%`;
  if (field?.type === "date" || field?.type === "datetime" || ["created_at", "updated_at"].includes(field?.key ?? "")) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", ...(field?.type === "datetime" ? { timeStyle: "short" as const } : {}) }).format(date);
  }
  if (field?.type === "branch") return branches.find((branch) => branch.id === value)?.name ?? String(value);
  return optionLabel(field, String(value));
}

function CellValue({ record, column, fields, branches }: { record: ObjectRecord; column: string; fields: readonly FieldDefinition[]; branches: readonly Branch[] }) {
  const field = fields.find((item) => item.key === column);
  const raw = column === "branch" ? record.branchId : valueFor(record, column);
  if (column === "branch") return <>{branches.find((branch) => branch.id === raw)?.name ?? (raw ? String(raw) : "—")}</>;
  return <>{displayValue(raw, field ?? (column === "created_at" || column === "updated_at" ? ({ key: column } as FieldDefinition) : undefined), branches)}</>;
}

function queryHref(basePath: string, definition: ViewDefinition, runtime: ViewRendererProps["runtime"], changes: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  params.set("view", definition.key);
  if (runtime.search) params.set("q", runtime.search);
  if (runtime.branchId) params.set("branch", runtime.branchId);
  if (runtime.savedFilterKey) params.set("filter", runtime.savedFilterKey);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return `${basePath}?${params.toString()}`;
}

function RecordTitle({ record, href }: { record: ObjectRecord; href?: string | undefined }) {
  return href ? <Link className="font-semibold text-primary hover:underline" href={href}>{record.displayValue}</Link> : <span className="font-semibold">{record.displayValue}</span>;
}

export function ViewRenderer({ definition, result, fields, branches, basePath, recordHref, runtime }: ViewRendererProps) {
  const details = definition.selectedColumns.filter((column) => column !== "record");
  const grouped = definition.grouping ? result.groups : [{ key: "all", label: "All records", records: result.records }];
  return (
    <section className="mt-8" aria-label={definition.name}>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        {definition.search.enabled ? <form className="flex min-w-64 flex-1 gap-2" method="get"><input name="view" type="hidden" value={definition.key} />{runtime.branchId ? <input name="branch" type="hidden" value={runtime.branchId} /> : null}{runtime.savedFilterKey ? <input name="filter" type="hidden" value={runtime.savedFilterKey} /> : null}<label className="sr-only" htmlFor="view-search">Search</label><input className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={runtime.search} id="view-search" name="q" placeholder={definition.search.placeholder} /><button className="rounded-lg border px-4 py-2 text-sm font-semibold" type="submit">Search</button></form> : null}
        {definition.branchFiltering.enabled ? <form className="flex gap-2" method="get"><input name="view" type="hidden" value={definition.key} />{runtime.search ? <input name="q" type="hidden" value={runtime.search} /> : null}{runtime.savedFilterKey ? <input name="filter" type="hidden" value={runtime.savedFilterKey} /> : null}<label className="sr-only" htmlFor="view-branch">Branch</label><select className="rounded-lg border bg-background px-3 py-2 text-sm" defaultValue={runtime.branchId ?? ""} id="view-branch" name="branch" required={definition.branchFiltering.required}><option disabled={definition.branchFiltering.required} value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><button className="rounded-lg border px-3 py-2 text-sm font-semibold" type="submit">Apply</button></form> : null}
      </div>
      {definition.savedFilters.length > 0 ? <nav aria-label="Saved filters" className="mt-3 flex flex-wrap gap-2"><Link className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${runtime.savedFilterKey ? "" : "bg-primary text-primary-foreground"}`} href={queryHref(basePath, definition, runtime, { filter: undefined, page: undefined })}>All</Link>{definition.savedFilters.map((filter) => <Link className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${runtime.savedFilterKey === filter.key ? "bg-primary text-primary-foreground" : ""}`} href={queryHref(basePath, definition, runtime, { filter: filter.key, page: undefined })} key={filter.key}>{filter.name}</Link>)}</nav> : null}

      {definition.type === "table" ? <div className="mt-4 overflow-x-auto rounded-2xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/40"><tr>{definition.selectedColumns.map((column) => <th className="px-4 py-3" key={column}>{fieldLabel(column, fields)}</th>)}</tr></thead><tbody>{grouped.flatMap((group) => [definition.grouping ? <tr className="border-b bg-muted/30" key={`group-${group.key}`}><th className="px-4 py-2 text-xs uppercase tracking-wide" colSpan={definition.selectedColumns.length}>{fieldLabel(definition.grouping.fieldKey, fields)}: {optionLabel(fields.find((field) => field.key === definition.grouping?.fieldKey), group.label)} · {group.records.length}</th></tr> : null, ...group.records.map((record) => <tr className="border-b last:border-0" key={record.id}>{definition.selectedColumns.map((column) => <td className="max-w-64 truncate px-4 py-3" key={column}>{column === "record" ? <RecordTitle href={recordHref?.(record)} record={record} /> : <CellValue branches={branches} column={column} fields={fields} record={record} />}</td>)}</tr>)])}{result.records.length === 0 ? <tr><td className="px-4 py-10 text-center text-muted-foreground" colSpan={definition.selectedColumns.length}>No records match this view.</td></tr> : null}</tbody></table></div> : null}

      {definition.type === "cards" ? <div className="mt-4 space-y-6">{grouped.map((group) => <div key={group.key}>{definition.grouping ? <h3 className="mb-3 text-sm font-semibold">{optionLabel(fields.find((field) => field.key === definition.grouping?.fieldKey), group.label)} <span className="text-muted-foreground">({group.records.length})</span></h3> : null}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{group.records.map((record) => <article className="rounded-2xl border bg-card p-5" key={record.id}><RecordTitle href={recordHref?.(record)} record={record} /><dl className="mt-4 space-y-2">{details.map((column) => <div className="flex justify-between gap-4 text-sm" key={column}><dt className="text-muted-foreground">{fieldLabel(column, fields)}</dt><dd className="max-w-48 truncate text-right"><CellValue branches={branches} column={column} fields={fields} record={record} /></dd></div>)}</dl></article>)}</div></div>)}{result.records.length === 0 ? <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">No records match this view.</p> : null}</div> : null}

      {definition.type === "kanban" ? <div className="mt-4 flex gap-4 overflow-x-auto pb-3">{result.groups.map((group) => <section className="w-80 shrink-0 rounded-2xl bg-muted/60 p-3" key={group.key}><h3 className="px-1 pb-3 text-sm font-semibold">{optionLabel(fields.find((field) => field.key === definition.grouping?.fieldKey), group.label)} <span className="text-muted-foreground">{group.records.length}</span></h3><div className="space-y-3">{group.records.map((record) => <article className="rounded-xl border bg-card p-4" key={record.id}><RecordTitle href={recordHref?.(record)} record={record} /><dl className="mt-3 space-y-1.5">{details.filter((column) => column !== definition.grouping?.fieldKey).map((column) => <div className="flex justify-between gap-3 text-xs" key={column}><dt className="text-muted-foreground">{fieldLabel(column, fields)}</dt><dd className="max-w-40 truncate"><CellValue branches={branches} column={column} fields={fields} record={record} /></dd></div>)}</dl></article>)}</div></section>)}{result.groups.length === 0 ? <p className="w-full rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">No records match this view.</p> : null}</div> : null}

      <div className="mt-5 flex items-center justify-between text-sm"><p className="text-muted-foreground">{result.totalCount} {result.totalCount === 1 ? "record" : "records"} · Page {result.page} of {result.pageCount}</p><div className="flex gap-2">{result.hasPreviousPage ? <Link className="rounded-lg border px-3 py-1.5 font-medium" href={queryHref(basePath, definition, runtime, { page: String(result.page - 1) })}>Previous</Link> : null}{result.hasNextPage ? <Link className="rounded-lg border px-3 py-1.5 font-medium" href={queryHref(basePath, definition, runtime, { page: String(result.page + 1) })}>Next</Link> : null}</div></div>
    </section>
  );
}
