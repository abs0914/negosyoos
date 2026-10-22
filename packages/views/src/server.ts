import "server-only";

import { can, requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { createClient, type ServerSupabaseClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json } from "@negosyo-os/database";
import {
  FieldStorageConfigSchema,
  ObjectAttributesStorageSchema,
  ObjectIdSchema,
  type FieldDefinition,
  type ObjectRecord,
} from "@negosyo-os/objects";

import type { RenderedView, ViewDefinition, ViewRuntimeInput } from "./models";
import { renderView, validateViewFields } from "./runtime";
import {
  SaveViewInputSchema,
  ViewConfigurationSchema,
  ViewIdSchema,
  ViewRuntimeInputSchema,
  type SaveViewInput,
} from "./schemas";

function databaseError(message: string, cause: unknown): AppError {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

function mutationError(error: { code?: string; message?: string }): AppError {
  if (error.code === "23505") return new AppError({ code: ERROR_CODES.conflict, message: "A view with that key already exists.", status: 409, cause: error });
  return databaseError("The view could not be saved.", error);
}

async function requireViewReader(businessId: string, client: ServerSupabaseClient) {
  const user = await requireAuthenticatedUser(client);
  const decisions = await Promise.all([
    can(user, PERMISSIONS.recordRead, { businessId }, client),
    can(user, PERMISSIONS.metadataRead, { businessId }, client),
    can(user, PERMISSIONS.metadataManage, { businessId }, client),
  ]);
  if (!decisions.some(Boolean)) throw new AppError({ code: ERROR_CODES.permissionDenied, message: "You do not have permission to view records.", status: 403 });
  return user;
}

type ViewRow = {
  id: string; organization_id: string; object_definition_id: string; key: string; name: string;
  description: string | null; view_type: string; selected_columns: string[]; filters: Json;
  configuration: Json; owner_user_id: string; scope: string; status: string; created_at: string; updated_at: string;
};

function mapView(row: ViewRow): ViewDefinition {
  const extra = ViewConfigurationSchema.omit({ type: true, selectedColumns: true, filters: true }).parse(row.configuration);
  const configuration = ViewConfigurationSchema.parse({
    type: row.view_type,
    selectedColumns: row.selected_columns,
    filters: row.filters,
    ...extra,
  });
  return {
    id: row.id, businessId: row.organization_id, objectDefinitionId: row.object_definition_id,
    key: row.key, name: row.name, description: row.description, type: configuration.type,
    selectedColumns: configuration.selectedColumns, filters: configuration.filters,
    sorting: configuration.sorting, ...(configuration.grouping ? { grouping: configuration.grouping } : {}),
    savedFilters: configuration.savedFilters, search: configuration.search, pagination: configuration.pagination,
    branchFiltering: configuration.branchFiltering, ownerUserId: row.owner_user_id,
    scope: row.scope as ViewDefinition["scope"], status: row.status as ViewDefinition["status"],
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapField(row: {
  id: string; organization_id: string; object_definition_id: string; key: string; label: string;
  data_type: string; is_required: boolean; is_unique: boolean; sort_order: number; config: Json;
  status: string; created_at: string; updated_at: string;
}): FieldDefinition {
  const config = FieldStorageConfigSchema.parse(row.config);
  return {
    id: row.id, businessId: row.organization_id, objectDefinitionId: row.object_definition_id,
    key: row.key, label: row.label, type: row.data_type as FieldDefinition["type"], required: row.is_required,
    unique: row.is_unique, ...(config.defaultValue !== undefined ? { defaultValue: config.defaultValue } : {}),
    ...(config.placeholder !== undefined ? { placeholder: config.placeholder } : {}),
    ...(config.helpText !== undefined ? { helpText: config.helpText } : {}), options: config.options,
    validation: config.validation, visibility: config.visibility, readOnly: config.readOnly,
    ...(config.relationObjectId !== undefined ? { relationObjectId: config.relationObjectId } : {}),
    sortOrder: row.sort_order, status: row.status as FieldDefinition["status"], createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapRecord(row: {
  id: string; organization_id: string; object_definition_id: string; branch_id: string | null;
  display_value: string; attributes: Json; status: string; created_by: string; updated_by: string;
  created_at: string; updated_at: string;
}): ObjectRecord {
  return {
    id: row.id, businessId: row.organization_id, objectDefinitionId: row.object_definition_id,
    branchId: row.branch_id, displayValue: row.display_value, attributes: ObjectAttributesStorageSchema.parse(row.attributes),
    status: row.status as ObjectRecord["status"], createdBy: row.created_by, updatedBy: row.updated_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function loadFields(client: ServerSupabaseClient, businessId: string, objectDefinitionId: string) {
  const { data, error } = await client.from("field_definitions").select("*")
    .eq("organization_id", businessId).eq("object_definition_id", objectDefinitionId).order("sort_order").order("id");
  if (error) throw databaseError("View fields could not be loaded.", error);
  return data.map(mapField);
}

export async function listViewsForObject(businessId: string, objectDefinitionId: string): Promise<readonly ViewDefinition[]> {
  const id = BusinessIdSchema.parse(businessId);
  const objectId = ObjectIdSchema.parse(objectDefinitionId);
  const client = await createClient();
  await requireViewReader(id, client);
  const { data, error } = await client.from("view_definitions").select("*")
    .eq("organization_id", id).eq("object_definition_id", objectId).eq("status", "active").order("name");
  if (error) throw databaseError("Views could not be loaded.", error);
  return (data as unknown as ViewRow[]).map(mapView);
}

export async function getViewByKey(businessId: string, objectDefinitionId: string, viewKey: string): Promise<ViewDefinition> {
  const id = BusinessIdSchema.parse(businessId);
  const objectId = ObjectIdSchema.parse(objectDefinitionId);
  const key = SaveViewInputSchema.shape.key.parse(viewKey);
  const client = await createClient();
  await requireViewReader(id, client);
  const { data, error } = await client.from("view_definitions").select("*")
    .eq("organization_id", id).eq("object_definition_id", objectId).eq("key", key).eq("status", "active").single();
  if (error) throw databaseError("View could not be loaded.", error);
  return mapView(data as unknown as ViewRow);
}

export async function saveViewDefinition(businessId: string, input: SaveViewInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = SaveViewInputSchema.parse(input);
  const client = await createClient();
  const user = await requireAuthenticatedUser(client);
  if (parsed.scope === "shared") await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, client);
  else await requireCapability(user, PERMISSIONS.recordRead, { businessId: id }, client);

  const fields = await loadFields(client, id, parsed.objectDefinitionId);
  const now = new Date().toISOString();
  const candidate: ViewDefinition = {
    id: parsed.viewDefinitionId ?? "00000000-0000-4000-8000-000000000000", businessId: id,
    objectDefinitionId: parsed.objectDefinitionId, key: parsed.key, name: parsed.name,
    description: parsed.description || null, ...parsed.configuration, ownerUserId: user.id,
    scope: parsed.scope, status: "active", createdAt: now, updatedAt: now,
  };
  validateViewFields(candidate, fields);
  const { type, selectedColumns, filters, ...configuration } = parsed.configuration;
  const { data, error } = await client.rpc("save_dynamic_view", {
    requested_organization_id: id, requested_object_definition_id: parsed.objectDefinitionId,
    requested_key: parsed.key, requested_name: parsed.name, requested_description: parsed.description,
    requested_type: type, requested_columns: [...selectedColumns], requested_filters: filters as unknown as Json,
    requested_configuration: configuration as unknown as Json, requested_scope: parsed.scope,
    ...(parsed.viewDefinitionId ? { requested_view_definition_id: parsed.viewDefinitionId } : {}),
  });
  if (error) throw mutationError(error);
  return ViewIdSchema.parse(data);
}

export async function archiveViewDefinition(businessId: string, viewDefinitionId: string): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const viewId = ViewIdSchema.parse(viewDefinitionId);
  const client = await createClient();
  const user = await requireAuthenticatedUser(client);
  const { data: view, error: viewError } = await client.from("view_definitions").select("owner_user_id,scope")
    .eq("organization_id", id).eq("id", viewId).single();
  if (viewError) throw databaseError("View could not be loaded.", viewError);
  const owned = (view as unknown as { owner_user_id: string; scope: string }).owner_user_id === user.id;
  if (!owned || (view as unknown as { scope: string }).scope === "shared") await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, client);
  const { error } = await client.rpc("archive_dynamic_view", { requested_organization_id: id, requested_view_definition_id: viewId });
  if (error) throw databaseError("View could not be archived.", error);
}

async function loadAllRecords(client: ServerSupabaseClient, businessId: string, objectDefinitionId: string): Promise<readonly ObjectRecord[]> {
  const records: ObjectRecord[] = [];
  const batchSize = 1_000;
  for (let start = 0; ; start += batchSize) {
    const { data, error } = await client.from("object_records").select("*")
      .eq("organization_id", businessId).eq("object_definition_id", objectDefinitionId).eq("status", "active")
      .order("id").range(start, start + batchSize - 1);
    if (error) throw databaseError("View records could not be loaded.", error);
    records.push(...data.map(mapRecord));
    if (data.length < batchSize) return records;
  }
}

export async function renderSavedView(
  businessId: string,
  objectDefinitionId: string,
  viewKey: string,
  input: ViewRuntimeInput = {},
): Promise<{ definition: ViewDefinition; result: RenderedView }> {
  const parsedInput = ViewRuntimeInputSchema.parse(input);
  const definition = await getViewByKey(businessId, objectDefinitionId, viewKey);
  const client = await createClient();
  const fields = await loadFields(client, businessId, objectDefinitionId);
  validateViewFields(definition, fields);
  const records = await loadAllRecords(client, businessId, objectDefinitionId);
  return { definition, result: renderView(definition, records, parsedInput) };
}

export async function renderViewDefinition(
  businessId: string,
  definition: ViewDefinition,
  input: ViewRuntimeInput = {},
): Promise<RenderedView> {
  const id = BusinessIdSchema.parse(businessId);
  const parsedInput = ViewRuntimeInputSchema.parse(input);
  if (definition.businessId !== id) throw new AppError({ code: ERROR_CODES.validationFailed, message: "The view belongs to another Business.", status: 400 });
  const client = await createClient();
  await requireViewReader(id, client);
  const fields = await loadFields(client, id, definition.objectDefinitionId);
  validateViewFields(definition, fields);
  const records = await loadAllRecords(client, id, definition.objectDefinitionId);
  return renderView(definition, records, parsedInput);
}
