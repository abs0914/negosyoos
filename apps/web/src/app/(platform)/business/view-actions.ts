"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AppError } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";
import { SaveViewInputSchema } from "@negosyo-os/views";
import { saveViewDefinition } from "@negosyo-os/views/server";

export interface ViewActionState { status?: "error"; message?: string; fieldErrors?: Record<string, string[] | undefined> }
const viewLogger = logger.child({ domain: "views" });

function jsonValue(formData: FormData, name: string, fallback: unknown): unknown {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) return fallback;
  try { return JSON.parse(value); } catch { return Symbol("invalid-json"); }
}

export async function saveViewAction(
  businessId: string,
  objectKey: string,
  objectDefinitionId: string,
  viewDefinitionId: string | undefined,
  _previousState: ViewActionState,
  formData: FormData,
): Promise<ViewActionState> {
  const groupingKey = formData.get("grouping");
  const configuration = {
    type: formData.get("type"), selectedColumns: formData.getAll("selectedColumns"),
    filters: jsonValue(formData, "filters", { logic: "all", filters: [] }),
    sorting: jsonValue(formData, "sorting", []),
    ...(typeof groupingKey === "string" && groupingKey ? { grouping: { fieldKey: groupingKey, direction: formData.get("groupDirection"), showEmptyGroups: false } } : {}),
    savedFilters: jsonValue(formData, "savedFilters", []),
    search: { enabled: formData.get("searchEnabled") === "true", fieldKeys: formData.getAll("searchFields"), placeholder: formData.get("searchPlaceholder") },
    pagination: { pageSize: Number(formData.get("pageSize")) },
    branchFiltering: { enabled: formData.get("branchEnabled") === "true", required: formData.get("branchRequired") === "true" },
  };
  const parsed = SaveViewInputSchema.safeParse({
    ...(viewDefinitionId ? { viewDefinitionId } : {}), objectDefinitionId, key: formData.get("key"),
    name: formData.get("name"), description: formData.get("description"), scope: formData.get("scope"), configuration,
  });
  if (!parsed.success) return { status: "error", message: "Check the view configuration and JSON fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  try { await saveViewDefinition(businessId, parsed.data); }
  catch (error) {
    viewLogger.error("View save failed", error, { businessId, objectDefinitionId, viewDefinitionId });
    return { status: "error", message: error instanceof AppError && error.expose ? error.message : "The view could not be saved." };
  }
  const path = `/business/${businessId}/objects/${objectKey}`;
  revalidatePath(path);
  redirect(`${path}?view=${parsed.data.key}`);
}
