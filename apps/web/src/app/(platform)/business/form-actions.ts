"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AppError } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";
import { CreateFormInputSchema, SaveFormRecordInputSchema, UpdateFormInputSchema } from "@negosyo-os/forms";
import { saveFormDefinition, saveFormRecord } from "@negosyo-os/forms/server";
import { getObjectRecordById } from "@negosyo-os/objects/server";
import { dispatchRecordWorkflows } from "@negosyo-os/workflow/server";

export interface FormActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

const formLogger = logger.child({ domain: "forms" });

function exposedMessage(error: unknown, fallback: string): string {
  return error instanceof AppError && error.expose ? error.message : fallback;
}

export async function saveFormDefinitionAction(
  businessId: string,
  objectKey: string,
  objectDefinitionId: string,
  formDefinitionId: string | undefined,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  let layout: unknown;
  try { layout = JSON.parse(String(formData.get("layout") ?? "")); }
  catch { return { status: "error", message: "The form layout is invalid." }; }
  const raw = {
    ...(formDefinitionId ? { formDefinitionId } : {}),
    objectDefinitionId,
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description"),
    mode: formData.get("mode"),
    layout,
  };
  const parsed = formDefinitionId ? UpdateFormInputSchema.safeParse(raw) : CreateFormInputSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: "Check the form definition and layout.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await saveFormDefinition(businessId, parsed.data);
    revalidatePath(`/business/${businessId}/objects/${objectKey}/forms`);
    return { status: "success", message: "Form saved." };
  } catch (error) {
    formLogger.error("Dynamic form save failed", error, { businessId, objectDefinitionId, formDefinitionId });
    return { status: "error", message: exposedMessage(error, "The form could not be saved.") };
  }
}

function attributesFromForm(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const names = new Set([...formData.keys()].filter((name) => name.startsWith("attribute.")));
  for (const name of names) {
    const values = formData.getAll(name).filter((value): value is string => typeof value === "string");
    const key = name.slice("attribute.".length);
    if (values.includes("__unchecked__")) result[key] = values.filter((value) => value !== "__unchecked__").at(-1) ?? "false";
    else result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

export async function saveFormRecordAction(
  businessId: string,
  objectKey: string,
  formDefinitionId: string,
  recordId: string | undefined,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = SaveFormRecordInputSchema.safeParse({
    formDefinitionId,
    ...(recordId ? { recordId } : {}),
    branchId: formData.get("branchId") || null,
    attributes: attributesFromForm(formData),
  });
  if (!parsed.success) return { status: "error", message: "Check the submitted form values." };
  try {
    const previous = recordId ? await getObjectRecordById(businessId, recordId) : undefined;
    const savedId = await saveFormRecord(businessId, parsed.data);
    const saved = await getObjectRecordById(businessId, savedId);
    await dispatchRecordWorkflows(businessId, recordId ? "record.updated" : "record.created", saved, previous);
  }
  catch (error) {
    formLogger.error("Dynamic form record save failed", error, { businessId, formDefinitionId, recordId });
    return { status: "error", message: exposedMessage(error, "The record could not be saved.") };
  }
  revalidatePath(`/business/${businessId}/objects/${objectKey}`);
  redirect(`/business/${businessId}/objects/${objectKey}`);
}
