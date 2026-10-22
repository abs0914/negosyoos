"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AppError } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";
import {
  CreateFieldInputSchema,
  CreateObjectInputSchema,
  SaveObjectRecordInputSchema,
  UpdateFieldInputSchema,
} from "@negosyo-os/objects";
import {
  archiveObjectField,
  createObjectDefinition,
  createObjectField,
  getObjectRecord,
  getObjectRecordById,
  reorderObjectFields,
  saveObjectRecord,
  updateObjectField,
} from "@negosyo-os/objects/server";
import { dispatchRecordWorkflows } from "@negosyo-os/workflow/server";

export interface ObjectActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const objectLogger = logger.child({ domain: "objects" });

function booleanValue(formData: FormData, name: string): boolean {
  return formData.getAll(name).at(-1) === "true";
}

function optionalNumber(formData: FormData, name: string): number | undefined {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value);
}

function optionsValue(formData: FormData) {
  const raw = formData.get("options");
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split("\n").map((line) => {
    const [value = "", ...labelParts] = line.split("|");
    return { value: value.trim(), label: (labelParts.join("|").trim() || value.trim()) };
  });
}

function defaultValue(formData: FormData): unknown {
  const raw = formData.get("defaultValue");
  const type = formData.get("type");
  if (typeof raw !== "string" || raw === "") return undefined;
  if (["number", "decimal", "currency", "percentage"].includes(String(type))) return Number(raw);
  if (type === "boolean") return raw === "true";
  if (["multiselect", "attachment"].includes(String(type))) {
    return raw.split(",").map((value) => value.trim()).filter(Boolean);
  }
  return raw;
}

function fieldInput(formData: FormData) {
  return {
    label: formData.get("label"),
    type: formData.get("type"),
    required: booleanValue(formData, "required"),
    unique: booleanValue(formData, "unique"),
    defaultValue: defaultValue(formData),
    placeholder: formData.get("placeholder") || undefined,
    helpText: formData.get("helpText") || undefined,
    options: optionsValue(formData),
    validation: {
      minLength: optionalNumber(formData, "minLength"),
      maxLength: optionalNumber(formData, "maxLength"),
      minimum: optionalNumber(formData, "minimum"),
      maximum: optionalNumber(formData, "maximum"),
    },
    visibility: formData.get("visibility"),
    readOnly: booleanValue(formData, "readOnly"),
    relationObjectId: formData.get("relationObjectId") || undefined,
  };
}

function exposedMessage(error: unknown, fallback: string): string {
  return error instanceof AppError && error.expose ? error.message : fallback;
}

export async function createObjectAction(
  businessId: string,
  _previousState: ObjectActionState,
  formData: FormData,
): Promise<ObjectActionState> {
  const parsed = CreateObjectInputSchema.safeParse({
    key: formData.get("key"),
    singularLabel: formData.get("singularLabel"),
    pluralLabel: formData.get("pluralLabel"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { status: "error", message: "Check the object details.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createObjectDefinition(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/objects`);
    return { status: "success", message: "Object created." };
  } catch (error) {
    objectLogger.error("Object creation failed", error, { businessId });
    return { status: "error", message: exposedMessage(error, "The object could not be created.") };
  }
}

export async function createFieldAction(
  businessId: string,
  objectDefinitionId: string,
  objectKey: string,
  _previousState: ObjectActionState,
  formData: FormData,
): Promise<ObjectActionState> {
  const parsed = CreateFieldInputSchema.safeParse({
    objectDefinitionId,
    key: formData.get("key"),
    ...fieldInput(formData),
  });
  if (!parsed.success) return { status: "error", message: "Check the field definition.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await createObjectField(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/objects/${objectKey}`);
    return { status: "success", message: "Field added." };
  } catch (error) {
    objectLogger.error("Field creation failed", error, { businessId, objectDefinitionId });
    return { status: "error", message: exposedMessage(error, "The field could not be added.") };
  }
}

export async function updateFieldAction(
  businessId: string,
  objectDefinitionId: string,
  objectKey: string,
  fieldId: string,
  _previousState: ObjectActionState,
  formData: FormData,
): Promise<ObjectActionState> {
  const parsed = UpdateFieldInputSchema.safeParse({
    objectDefinitionId,
    fieldId,
    ...fieldInput(formData),
  });
  if (!parsed.success) return { status: "error", message: "Check the field definition.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await updateObjectField(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/objects/${objectKey}`);
    return { status: "success", message: "Field saved." };
  } catch (error) {
    objectLogger.error("Field update failed", error, { businessId, objectDefinitionId, fieldId });
    return { status: "error", message: exposedMessage(error, "The field could not be saved.") };
  }
}

export async function reorderFieldsAction(
  businessId: string,
  objectDefinitionId: string,
  objectKey: string,
  fieldIds: readonly string[],
): Promise<void> {
  await reorderObjectFields(businessId, { objectDefinitionId, fieldIds: [...fieldIds] });
  revalidatePath(`/business/${businessId}/objects/${objectKey}`);
}

export async function archiveFieldAction(
  businessId: string,
  objectDefinitionId: string,
  objectKey: string,
  fieldId: string,
): Promise<void> {
  await archiveObjectField(businessId, { objectDefinitionId, fieldId });
  revalidatePath(`/business/${businessId}/objects/${objectKey}`);
}

function attributesFromForm(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const names = new Set([...formData.keys()].filter((name) => name.startsWith("attribute.")));
  for (const name of names) {
    const values = formData.getAll(name).filter((value): value is string => typeof value === "string");
    const key = name.slice("attribute.".length);
    if (values.includes("__unchecked__")) {
      result[key] = values.filter((value) => value !== "__unchecked__").at(-1) ?? "false";
    } else {
      result[key] = values.length > 1 ? values : values[0];
    }
  }
  return result;
}

export async function saveRecordAction(
  businessId: string,
  objectKey: string,
  objectDefinitionId: string,
  recordId: string | undefined,
  _previousState: ObjectActionState,
  formData: FormData,
): Promise<ObjectActionState> {
  const parsed = SaveObjectRecordInputSchema.safeParse({
    objectDefinitionId,
    ...(recordId ? { recordId } : {}),
    branchId: formData.get("branchId") || null,
    attributes: attributesFromForm(formData),
  });
  if (!parsed.success) return { status: "error", message: "Check the record values." };
  try {
    const previous = recordId ? await getObjectRecord(businessId, objectDefinitionId, recordId) : undefined;
    const savedId = await saveObjectRecord(businessId, parsed.data);
    const saved = await getObjectRecordById(businessId, savedId);
    await dispatchRecordWorkflows(businessId, recordId ? "record.updated" : "record.created", saved, previous);
  } catch (error) {
    objectLogger.error("Object record save failed", error, { businessId, objectDefinitionId, recordId });
    return { status: "error", message: exposedMessage(error, "The record could not be saved.") };
  }
  revalidatePath(`/business/${businessId}/objects/${objectKey}`);
  redirect(`/business/${businessId}/objects/${objectKey}`);
}
