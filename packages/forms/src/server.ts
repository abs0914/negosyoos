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
  type ObjectAttributeValue,
} from "@negosyo-os/objects";
import { saveObjectRecord } from "@negosyo-os/objects/server";

import type { FormDefinition, FormDefinitionWithLayout, FormLayout } from "./models";
import {
  CreateFormInputSchema,
  FormIdSchema,
  FormLayoutInputSchema,
  SaveFormRecordInputSchema,
  UpdateFormInputSchema,
  type CreateFormInput,
  type SaveFormRecordInput,
  type UpdateFormInput,
} from "./schemas";
import { validateFormLayoutAgainstFields, validateFormSubmission } from "./validation";

function databaseError(message: string, cause: unknown): AppError {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

function mutationError(message: string, error: { code?: string; message?: string }): AppError {
  if (error.code === "23505") return new AppError({ code: ERROR_CODES.conflict, message: "A form with that key already exists.", status: 409, cause: error });
  if (error.code === "P0001" || error.code === "22023") {
    return new AppError({ code: ERROR_CODES.conflict, message: error.message ?? message, status: 409, cause: error });
  }
  return databaseError(message, error);
}

async function requireFormReader(businessId: string, client: ServerSupabaseClient) {
  const user = await requireAuthenticatedUser(client);
  const decisions = await Promise.all([
    can(user, PERMISSIONS.formRead, { businessId }, client),
    can(user, PERMISSIONS.formManage, { businessId }, client),
  ]);
  if (!decisions.some(Boolean)) throw new AppError({ code: ERROR_CODES.permissionDenied, message: "You do not have permission to view forms.", status: 403 });
}

function mapDefinition(row: {
  id: string; organization_id: string; object_definition_id: string; key: string; name: string;
  description: string | null; mode: string; status: string; created_at: string; updated_at: string;
}): FormDefinition {
  return {
    id: row.id, businessId: row.organization_id, objectDefinitionId: row.object_definition_id,
    key: row.key, name: row.name, description: row.description,
    mode: row.mode as FormDefinition["mode"], status: row.status as FormDefinition["status"],
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapLayout(row: {
  id: string; organization_id: string; form_definition_id: string; version: number;
  sections: Json; created_at: string; updated_at: string;
}): FormLayout {
  return {
    id: row.id, businessId: row.organization_id, formDefinitionId: row.form_definition_id,
    version: row.version, sections: FormLayoutInputSchema.parse({ sections: row.sections }).sections,
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
    key: row.key, label: row.label, type: row.data_type as FieldDefinition["type"],
    required: row.is_required, unique: row.is_unique,
    ...(config.defaultValue !== undefined ? { defaultValue: config.defaultValue } : {}),
    ...(config.placeholder !== undefined ? { placeholder: config.placeholder } : {}),
    ...(config.helpText !== undefined ? { helpText: config.helpText } : {}),
    options: config.options, validation: config.validation, visibility: config.visibility, readOnly: config.readOnly,
    ...(config.relationObjectId !== undefined ? { relationObjectId: config.relationObjectId } : {}),
    sortOrder: row.sort_order, status: row.status as FieldDefinition["status"],
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function loadFields(client: ServerSupabaseClient, businessId: string, objectDefinitionId: string): Promise<readonly FieldDefinition[]> {
  const { data, error } = await client.from("field_definitions").select("*")
    .eq("organization_id", businessId).eq("object_definition_id", objectDefinitionId).order("sort_order").order("id");
  if (error) throw databaseError("Form fields could not be loaded.", error);
  return data.map(mapField);
}

export async function listFormsForObject(businessId: string, objectDefinitionId: string): Promise<readonly FormDefinition[]> {
  const id = BusinessIdSchema.parse(businessId);
  const objectId = ObjectIdSchema.parse(objectDefinitionId);
  const client = await createClient();
  await requireFormReader(id, client);
  const { data, error } = await client.from("form_definitions").select("*")
    .eq("organization_id", id).eq("object_definition_id", objectId).eq("status", "active").order("name");
  if (error) throw databaseError("Forms could not be loaded.", error);
  return data.map(mapDefinition);
}

export async function getFormByKey(businessId: string, objectDefinitionId: string, formKey: string): Promise<FormDefinitionWithLayout> {
  const id = BusinessIdSchema.parse(businessId);
  const objectId = ObjectIdSchema.parse(objectDefinitionId);
  const key = CreateFormInputSchema.shape.key.parse(formKey);
  const client = await createClient();
  await requireFormReader(id, client);
  const { data: definition, error: definitionError } = await client.from("form_definitions").select("*")
    .eq("organization_id", id).eq("object_definition_id", objectId).eq("key", key).eq("status", "active").single();
  if (definitionError) throw databaseError("Form could not be loaded.", definitionError);
  const { data: layout, error: layoutError } = await client.from("form_layouts").select("*")
    .eq("organization_id", id).eq("form_definition_id", definition.id).single();
  if (layoutError) throw databaseError("Form layout could not be loaded.", layoutError);
  return { definition: mapDefinition(definition), layout: mapLayout(layout) };
}

export async function saveFormDefinition(businessId: string, input: CreateFormInput | UpdateFormInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = "formDefinitionId" in input ? UpdateFormInputSchema.parse(input) : CreateFormInputSchema.parse(input);
  const client = await createClient();
  const user = await requireAuthenticatedUser(client);
  await requireCapability(user, PERMISSIONS.formManage, { businessId: id }, client);
  const fields = await loadFields(client, id, parsed.objectDefinitionId);
  const layout = validateFormLayoutAgainstFields(parsed.layout, fields, parsed.mode);
  const requestedFormDefinitionId = "formDefinitionId" in parsed && typeof parsed.formDefinitionId === "string"
    ? parsed.formDefinitionId : undefined;
  const { data, error } = await client.rpc("save_dynamic_form", {
    requested_organization_id: id,
    requested_object_definition_id: parsed.objectDefinitionId,
    requested_key: parsed.key,
    requested_name: parsed.name,
    requested_description: parsed.description,
    requested_mode: parsed.mode,
    requested_sections: layout.sections as unknown as Json,
    ...(requestedFormDefinitionId ? { requested_form_definition_id: requestedFormDefinitionId } : {}),
  });
  if (error) throw mutationError("Form could not be saved.", error);
  return FormIdSchema.parse(data);
}

export async function saveFormRecord(businessId: string, input: SaveFormRecordInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = SaveFormRecordInputSchema.parse(input);
  const client = await createClient();
  const user = await requireAuthenticatedUser(client);
  const { data: definition, error: definitionError } = await client.from("form_definitions").select("*")
    .eq("organization_id", id).eq("id", parsed.formDefinitionId).eq("status", "active").single();
  if (definitionError) throw databaseError("Form could not be loaded.", definitionError);
  const mappedDefinition = mapDefinition(definition);
  if ((mappedDefinition.mode === "create") !== (parsed.recordId === undefined)) {
    throw new AppError({ code: ERROR_CODES.validationFailed, message: `This is a ${mappedDefinition.mode} form.`, status: 400 });
  }
  await requireCapability(user, parsed.recordId ? PERMISSIONS.recordUpdate : PERMISSIONS.recordCreate,
    { businessId: id, ...(parsed.branchId ? { branchId: parsed.branchId } : {}) }, client);
  const [{ data: layout, error: layoutError }, fields] = await Promise.all([
    client.from("form_layouts").select("*").eq("organization_id", id).eq("form_definition_id", definition.id).single(),
    loadFields(client, id, definition.object_definition_id),
  ]);
  if (layoutError) throw databaseError("Form layout could not be loaded.", layoutError);

  let existing: Readonly<Record<string, ObjectAttributeValue>> = {};
  if (parsed.recordId) {
    const { data: record, error: recordError } = await client.from("object_records").select("attributes")
      .eq("organization_id", id).eq("object_definition_id", definition.object_definition_id)
      .eq("id", parsed.recordId).eq("status", "active").single();
    if (recordError) throw databaseError("Record could not be loaded.", recordError);
    existing = ObjectAttributesStorageSchema.parse(record.attributes);
  }
  const attributes = validateFormSubmission(mapLayout(layout), fields, mappedDefinition.mode, parsed.attributes, existing);
  return saveObjectRecord(id, {
    objectDefinitionId: definition.object_definition_id,
    ...(parsed.recordId ? { recordId: parsed.recordId } : {}),
    branchId: parsed.branchId,
    attributes,
  });
}
