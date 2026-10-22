import Link from "next/link";

import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { listBranches } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { listFormsForObject } from "@negosyo-os/forms/server";
import { getObjectByKey } from "@negosyo-os/objects/server";
import type { ViewDefinition } from "@negosyo-os/views";
import { listViewsForObject, renderViewDefinition } from "@negosyo-os/views/server";

import { ViewRenderer } from "../../../view-renderer";

function defaultView(businessId: string, objectDefinitionId: string, columns: readonly string[], userId: string): ViewDefinition {
  const timestamp = "1970-01-01T00:00:00.000Z";
  return {
    id: "00000000-0000-4000-8000-000000000000", businessId, objectDefinitionId,
    key: "all_records", name: "All records", description: null, type: "table",
    selectedColumns: ["record", ...columns.slice(0, 4)], filters: { logic: "all", filters: [] },
    sorting: [{ fieldKey: "updated_at", direction: "desc" }], savedFilters: [],
    search: { enabled: true, fieldKeys: ["record", ...columns], placeholder: "Search records…" },
    pagination: { pageSize: 25 }, branchFiltering: { enabled: false, required: false },
    ownerUserId: userId, scope: "personal", status: "active", createdAt: timestamp, updatedAt: timestamp,
  };
}

export default async function ObjectRecordsPage({ params, searchParams }: {
  params: Promise<{ businessId: string; objectKey: string }>;
  searchParams: Promise<{ view?: string; q?: string; branch?: string; filter?: string; page?: string }>;
}) {
  const [{ businessId, objectKey }, query] = await Promise.all([params, searchParams]);
  const [object, user] = await Promise.all([getObjectByKey(businessId, objectKey), requireAuthenticatedUser()]);
  const [canReadRecords, canCreate, canUpdate, canManage, canReadForms, canManageForms, canReadBranches] = await Promise.all([
    can(user, PERMISSIONS.recordRead, { businessId }), can(user, PERMISSIONS.recordCreate, { businessId }),
    can(user, PERMISSIONS.recordUpdate, { businessId }), can(user, PERMISSIONS.metadataManage, { businessId }),
    can(user, PERMISSIONS.formRead, { businessId }), can(user, PERMISSIONS.formManage, { businessId }),
    can(user, PERMISSIONS.branchRead, { businessId }),
  ]);
  const [views, forms, branches] = await Promise.all([
    canReadRecords ? listViewsForObject(businessId, object.definition.id) : Promise.resolve([]),
    canReadForms || canManageForms ? listFormsForObject(businessId, object.definition.id) : Promise.resolve([]),
    canReadBranches ? listBranches(businessId) : Promise.resolve([]),
  ]);
  const activeFields = object.fields.filter((field) => field.status === "active" && field.visibility === "visible");
  const fallback = defaultView(businessId, object.definition.id, activeFields.map((field) => field.key), user.id);
  const selectedView = views.find((view) => view.key === query.view) ?? views[0] ?? fallback;
  const runtime = {
    ...(query.q ? { search: query.q } : {}), ...(query.branch ? { branchId: query.branch } : {}),
    ...(query.filter ? { savedFilterKey: query.filter } : {}), ...(query.page ? { page: Number(query.page) } : {}),
  };
  const result = canReadRecords ? await renderViewDefinition(businessId, selectedView, runtime) : null;
  const createForm = forms.find((form) => form.mode === "create");
  const editForm = forms.find((form) => form.mode === "edit");
  const basePath = `/business/${businessId}/objects/${objectKey}`;
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Dynamic object</p><h1 className="mt-2 text-3xl font-semibold">{object.definition.pluralLabel}</h1><p className="mt-2 text-muted-foreground">{object.definition.description}</p></div><div className="flex flex-wrap gap-3">{canManage ? <Link className="rounded-lg border px-4 py-2 text-sm font-semibold" href={`${basePath}/builder`}>Manage fields</Link> : null}{canReadForms || canManageForms ? <Link className="rounded-lg border px-4 py-2 text-sm font-semibold" href={`${basePath}/forms`}>Forms</Link> : null}{canReadRecords ? <Link className="rounded-lg border px-4 py-2 text-sm font-semibold" href={`${basePath}/views`}>Configure views</Link> : null}{canCreate ? <Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={createForm ? `${basePath}/forms/${createForm.key}/use` : `${basePath}/new`}>New {object.definition.singularLabel}</Link> : null}</div></div>
      {!canReadRecords || !result ? <p className="mt-8 rounded-xl border p-4 text-sm text-muted-foreground">You can view this definition but do not have permission to read its records.</p> : <>
        <div className="mt-8 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Views</span>{views.map((view) => <Link className={`rounded-lg border px-3 py-2 text-sm font-medium ${selectedView.id === view.id ? "bg-primary text-primary-foreground" : "bg-card"}`} href={`${basePath}?view=${view.key}`} key={view.id}>{view.name}{view.scope === "personal" ? " · Mine" : ""}</Link>)}{views.length === 0 ? <span className="rounded-lg border bg-card px-3 py-2 text-sm font-medium">All records</span> : null}</div>
        <div className="mt-6"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h2 className="text-xl font-semibold">{selectedView.name}</h2>{selectedView.description ? <p className="mt-1 text-sm text-muted-foreground">{selectedView.description}</p> : null}</div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize">{selectedView.type}</span></div></div>
        <ViewRenderer basePath={basePath} branches={branches} definition={selectedView} fields={activeFields} recordHref={canUpdate ? (record) => editForm ? `${basePath}/forms/${editForm.key}/records/${record.id}` : `${basePath}/records/${record.id}/edit` : undefined} result={result} runtime={{ search: query.q, branchId: query.branch, savedFilterKey: query.filter }} />
      </>}
    </main>
  );
}
