import "server-only";

import { can, requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { createClient, type ServerSupabaseClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json } from "@negosyo-os/database";

import { z } from "zod";

import type {
  FieldDefinition,
  ObjectDefinition,
  ObjectDefinitionWithFields,
  ObjectRecord,
  ObjectRelationship,
  RecordPage,
} from "./models";
import {
  ArchiveFieldInputSchema,
  CreateFieldInputSchema,
  CreateObjectInputSchema,
  FieldStorageConfigSchema,
  ObjectAttributesStorageSchema,
  ObjectIdSchema,
  ObjectKeySchema,
  RecordCursorSchema,
  ReorderFieldsInputSchema,
  SaveObjectRecordInputSchema,
  UpdateFieldInputSchema,
  type ArchiveFieldInput,
  type CreateFieldInput,
  type CreateObjectInput,
  type ReorderFieldsInput,
  type SaveObjectRecordInput,
  type UpdateFieldInput,
} from "./schemas";
import { validateRecordAttributes } from "./validation";

function databaseError(message: string, cause: unknown): AppError {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

function expectedMutationError(
  message: string,
  error: { code?: string; message?: string },
  uniqueMessage = "An object or field with that key already exists.",
): AppError {
  if (error.code === "23505") {
    return new AppError({ code: ERROR_CODES.conflict, message: uniqueMessage, status: 409, cause: error });
  }
  if (error.code === "P0001") {
    return new AppError({ code: ERROR_CODES.conflict, message: error.message ?? message, status: 409, cause: error });
  }
  return databaseError(message, error);
}

async function requireObjectReader(businessId: string, client: ServerSupabaseClient) {
  const user = await requireAuthenticatedUser(client);
  const decisions = await Promise.all([
    can(user, PERMISSIONS.metadataRead, { businessId }, client),
    can(user, PERMISSIONS.metadataManage, { businessId }, client),
    can(user, PERMISSIONS.recordRead, { businessId }, client),
    can(user, PERMISSIONS.recordCreate, { businessId }, client),
    can(user, PERMISSIONS.recordUpdate, { businessId }, client),
  ]);
  if (!decisions.some(Boolean)) {
    throw new AppError({ code: ERROR_CODES.permissionDenied, message: "You do not have permission to view objects.", status: 403 });
  }
  return user;
}

function mapObject(row: {
  id: string; organization_id: string; key: string; singular_label: string;
  plural_label: string; description: string | null; status: string;
  created_at: string; updated_at: string;
}): ObjectDefinition {
  return {
    id: row.id,
    businessId: row.organization_id,
    key: row.key,
    singularLabel: row.singular_label,
    pluralLabel: row.plural_label,
    description: row.description,
    status: row.status as ObjectDefinition["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapField(row: {
  id: string; organization_id: string; object_definition_id: string; key: string;
  label: string; data_type: string; is_required: boolean; is_unique: boolean;
  sort_order: number; config: Json; status: string; created_at: string; updated_at: string;
}): FieldDefinition {
  const config = FieldStorageConfigSchema.parse(row.config);
  return {
    id: row.id,
    businessId: row.organization_id,
    objectDefinitionId: row.object_definition_id,
    key: row.key,
    label: row.label,
    type: row.data_type as FieldDefinition["type"],
    required: row.is_required,
    unique: row.is_unique,
    ...(config.defaultValue !== undefined ? { defaultValue: config.defaultValue } : {}),
    ...(config.placeholder !== undefined ? { placeholder: config.placeholder } : {}),
    ...(config.helpText !== undefined ? { helpText: config.helpText } : {}),
    options: config.options,
    validation: config.validation,
    visibility: config.visibility,
    readOnly: config.readOnly,
    ...(config.relationObjectId !== undefined ? { relationObjectId: config.relationObjectId } : {}),
    sortOrder: row.sort_order,
    status: row.status as FieldDefinition["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecord(row: {
  id: string; organization_id: string; object_definition_id: string; branch_id: string | null;
  display_value: string; attributes: Json; status: string; created_by: string; updated_by: string;
  created_at: string; updated_at: string;
}): ObjectRecord {
  return {
    id: row.id,
    businessId: row.organization_id,
    objectDefinitionId: row.object_definition_id,
    branchId: row.branch_id,
    displayValue: row.display_value,
    attributes: ObjectAttributesStorageSchema.parse(row.attributes),
    status: row.status as ObjectRecord["status"],
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fieldConfig(input: z.infer<typeof FieldStorageConfigSchema>): Json {
  return {
    ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue as Json } : {}),
    ...(input.placeholder ? { placeholder: input.placeholder } : {}),
    ...(input.helpText ? { helpText: input.helpText } : {}),
    options: input.options as unknown as Json,
    validation: input.validation as Json,
    visibility: input.visibility,
    readOnly: input.readOnly,
    ...(input.relationObjectId ? { relationObjectId: input.relationObjectId } : {}),
  };
}

function storageConfigFromField(input: {
  defaultValue?: unknown; placeholder?: string | undefined; helpText?: string | undefined;
  options: readonly { value: string; label: string }[];
  validation: { minLength?: number | undefined; maxLength?: number | undefined; minimum?: number | undefined; maximum?: number | undefined };
  visibility: "visible" | "hidden"; readOnly: boolean; relationObjectId?: string | undefined;
}) {
  return FieldStorageConfigSchema.parse({
    ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
    ...(input.placeholder !== undefined ? { placeholder: input.placeholder } : {}),
    ...(input.helpText !== undefined ? { helpText: input.helpText } : {}),
    options: input.options,
    validation: input.validation,
    visibility: input.visibility,
    readOnly: input.readOnly,
    ...(input.relationObjectId !== undefined ? { relationObjectId: input.relationObjectId } : {}),
  });
}

export async function listObjectDefinitions(businessId: string): Promise<readonly ObjectDefinition[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireObjectReader(id, supabase);
  const { data, error } = await supabase.from("object_definitions").select("*")
    .eq("organization_id", id).neq("status", "archived").order("plural_label");
  if (error) throw databaseError("Objects could not be loaded.", error);
  return data.map(mapObject);
}

export async function getObjectByKey(
  businessId: string,
  objectKey: string,
): Promise<ObjectDefinitionWithFields> {
  const id = BusinessIdSchema.parse(businessId);
  const key = ObjectKeySchema.parse(objectKey);
  const supabase = await createClient();
  await requireObjectReader(id, supabase);
  const { data: object, error: objectError } = await supabase.from("object_definitions")
    .select("*").eq("organization_id", id).eq("key", key).neq("status", "archived").single();
  if (objectError) throw databaseError("Object could not be loaded.", objectError);
  const { data: fields, error: fieldsError } = await supabase.from("field_definitions")
    .select("*").eq("organization_id", id).eq("object_definition_id", object.id)
    .order("sort_order").order("id");
  if (fieldsError) throw databaseError("Fields could not be loaded.", fieldsError);
  return { definition: mapObject(object), fields: fields.map(mapField) };
}

export async function listObjectRelationships(businessId: string): Promise<readonly ObjectRelationship[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requireObjectReader(id, supabase);
  const { data, error } = await supabase.from("relationship_definitions").select("*")
    .eq("organization_id", id).neq("status", "archived").order("key");
  if (error) throw databaseError("Object relationships could not be loaded.", error);
  return data.map((row) => ({
    id: row.id,
    businessId: row.organization_id,
    key: row.key,
    sourceObjectId: row.source_object_id,
    targetObjectId: row.target_object_id,
    cardinality: row.cardinality as ObjectRelationship["cardinality"],
    sourceLabel: row.source_label,
    targetLabel: row.target_label,
    status: row.status as ObjectRelationship["status"],
  }));
}

export async function createObjectDefinition(businessId: string, input: CreateObjectInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = CreateObjectInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, supabase);
  const { data, error } = await supabase.rpc("create_dynamic_object", {
    requested_organization_id: id,
    requested_key: parsed.key,
    requested_singular_label: parsed.singularLabel,
    requested_plural_label: parsed.pluralLabel,
    requested_description: parsed.description,
  });
  if (error) throw expectedMutationError("Object could not be created.", error);
  return ObjectIdSchema.parse(data);
}

export async function createObjectField(businessId: string, input: CreateFieldInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = CreateFieldInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, supabase);
  const config = storageConfigFromField(parsed);
  const { data, error } = await supabase.rpc("upsert_object_field", {
    requested_organization_id: id,
    requested_object_definition_id: parsed.objectDefinitionId,
    requested_key: parsed.key,
    requested_label: parsed.label,
    requested_type: parsed.type,
    requested_required: parsed.required,
    requested_unique: parsed.unique,
    requested_config: fieldConfig(config),
  });
  if (error) throw expectedMutationError("Field could not be created.", error);
  return ObjectIdSchema.parse(data);
}

export async function updateObjectField(businessId: string, input: UpdateFieldInput): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = UpdateFieldInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, supabase);
  const { data: existing, error: existingError } = await supabase.from("field_definitions")
    .select("key").eq("organization_id", id).eq("object_definition_id", parsed.objectDefinitionId)
    .eq("id", parsed.fieldId).single();
  if (existingError) throw databaseError("Field could not be loaded.", existingError);
  const config = storageConfigFromField(parsed);
  const { error } = await supabase.rpc("upsert_object_field", {
    requested_organization_id: id,
    requested_object_definition_id: parsed.objectDefinitionId,
    requested_key: existing.key,
    requested_label: parsed.label,
    requested_type: parsed.type,
    requested_required: parsed.required,
    requested_unique: parsed.unique,
    requested_config: fieldConfig(config),
    requested_field_id: parsed.fieldId,
  });
  if (error) throw expectedMutationError("Field could not be saved.", error);
}

export async function reorderObjectFields(businessId: string, input: ReorderFieldsInput): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = ReorderFieldsInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, supabase);
  const { error } = await supabase.rpc("reorder_object_fields", {
    requested_organization_id: id,
    requested_object_definition_id: parsed.objectDefinitionId,
    requested_field_ids: parsed.fieldIds,
  });
  if (error) throw expectedMutationError("Fields could not be reordered.", error);
}

export async function archiveObjectField(businessId: string, input: ArchiveFieldInput): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = ArchiveFieldInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.metadataManage, { businessId: id }, supabase);
  const { error } = await supabase.rpc("archive_object_field", {
    requested_organization_id: id,
    requested_object_definition_id: parsed.objectDefinitionId,
    requested_field_id: parsed.fieldId,
  });
  if (error) throw expectedMutationError("Field could not be archived.", error);
}

function decodeCursor(cursor: string | undefined): { createdAt: string | null; id: string | null } {
  if (!cursor) return { createdAt: null, id: null };
  const parsed = RecordCursorSchema.parse(cursor);
  const separator = parsed.lastIndexOf("|");
  return { createdAt: parsed.slice(0, separator), id: ObjectIdSchema.parse(parsed.slice(separator + 1)) };
}

export async function listObjectRecords(
  businessId: string,
  objectDefinitionId: string,
  cursor?: string,
): Promise<RecordPage> {
  const id = BusinessIdSchema.parse(businessId);
  const objectId = ObjectIdSchema.parse(objectDefinitionId);
  const parsedCursor = decodeCursor(cursor);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.recordRead, { businessId: id }, supabase);
  const { data, error } = await supabase.rpc("list_object_records_page", {
    requested_organization_id: id,
    requested_object_definition_id: objectId,
    ...(parsedCursor.createdAt ? { requested_cursor_created_at: parsedCursor.createdAt } : {}),
    ...(parsedCursor.id ? { requested_cursor_id: parsedCursor.id } : {}),
    requested_limit: 51,
  });
  if (error) throw databaseError("Records could not be loaded.", error);
  const mapped = data.map(mapRecord);
  const pageRecords = mapped.slice(0, 50);
  const last = pageRecords.at(-1);
  return {
    records: pageRecords,
    nextCursor: mapped.length > 50 && last ? `${last.createdAt}|${last.id}` : null,
  };
}

export async function getObjectRecord(
  businessId: string,
  objectDefinitionId: string,
  recordId: string,
): Promise<ObjectRecord> {
  const id = BusinessIdSchema.parse(businessId);
  const objectId = ObjectIdSchema.parse(objectDefinitionId);
  const parsedRecordId = ObjectIdSchema.parse(recordId);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.recordRead, { businessId: id }, supabase);
  const { data, error } = await supabase.from("object_records").select("*")
    .eq("organization_id", id).eq("object_definition_id", objectId)
    .eq("id", parsedRecordId).eq("status", "active").single();
  if (error) throw databaseError("Record could not be loaded.", error);
  return mapRecord(data);
}

export async function getObjectRecordById(businessId: string, recordId: string): Promise<ObjectRecord> {
  const id = BusinessIdSchema.parse(businessId);
  const parsedRecordId = ObjectIdSchema.parse(recordId);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.recordRead, { businessId: id }, supabase);
  const { data, error } = await supabase.from("object_records").select("*")
    .eq("organization_id", id).eq("id", parsedRecordId).eq("status", "active").single();
  if (error) throw databaseError("Record could not be loaded.", error);
  return mapRecord(data);
}

export async function saveObjectRecord(businessId: string, input: SaveObjectRecordInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = SaveObjectRecordInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(
    user,
    parsed.recordId ? PERMISSIONS.recordUpdate : PERMISSIONS.recordCreate,
    { businessId: id, ...(parsed.branchId ? { branchId: parsed.branchId } : {}) },
    supabase,
  );
  const { data: fields, error: fieldsError } = await supabase.from("field_definitions").select("*")
    .eq("organization_id", id).eq("object_definition_id", parsed.objectDefinitionId)
    .eq("status", "active").order("sort_order");
  if (fieldsError) throw databaseError("Record fields could not be loaded.", fieldsError);
  const attributes = validateRecordAttributes(fields.map(mapField), parsed.attributes);
  const { data, error } = await supabase.rpc("save_object_record", {
    requested_organization_id: id,
    requested_object_definition_id: parsed.objectDefinitionId,
    ...(parsed.branchId ? { requested_branch_id: parsed.branchId } : {}),
    requested_attributes: attributes as Json,
    ...(parsed.recordId ? { requested_record_id: parsed.recordId } : {}),
  });
  if (error) throw expectedMutationError("Record could not be saved.", error, "A record with this unique value already exists.");
  return ObjectIdSchema.parse(data);
}
