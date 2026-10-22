"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AppError } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";
import { RunWorkflowInputSchema, SaveWorkflowInputSchema } from "@negosyo-os/workflow";
import { getWorkflowDefinition, retryWorkflowExecution, runWorkflow, saveWorkflowDefinition } from "@negosyo-os/workflow/server";

export interface WorkflowActionState { status?: "success" | "error"; message?: string; executionId?: string | undefined }
const workflowLogger = logger.child({ domain: "workflow" });
function message(error: unknown, fallback: string) { return error instanceof AppError && error.expose ? error.message : fallback; }

export async function saveWorkflowAction(businessId: string, workflowDefinitionId: string | undefined, _state: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  let configuration: unknown;
  try { configuration = JSON.parse(String(formData.get("configuration") ?? "")); } catch { return { status: "error", message: "The visual workflow configuration is invalid." }; }
  const parsed = SaveWorkflowInputSchema.safeParse({ ...(workflowDefinitionId ? { workflowDefinitionId } : {}), key: formData.get("key"), name: formData.get("name"), description: formData.get("description"), status: formData.get("status"), configuration });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the workflow." };
  let id: string;
  try { id = await saveWorkflowDefinition(businessId, parsed.data); }
  catch (error) { workflowLogger.error("Workflow save failed", error, { businessId, workflowDefinitionId }); return { status: "error", message: message(error, "The workflow could not be saved.") }; }
  revalidatePath(`/business/${businessId}/workflows`); redirect(`/business/${businessId}/workflows/${id}`);
}

export async function setWorkflowEnabledAction(businessId: string, workflowId: string, enabled: boolean): Promise<void> {
  const definition = await getWorkflowDefinition(businessId, workflowId);
  const input = SaveWorkflowInputSchema.parse({ workflowDefinitionId: definition.id, key: definition.key, name: definition.name, description: definition.description ?? "", status: enabled ? "active" : "disabled", configuration: { trigger: definition.trigger, conditions: definition.conditions, actions: definition.actions, retryPolicy: definition.retryPolicy } });
  await saveWorkflowDefinition(businessId, input);
  revalidatePath(`/business/${businessId}/workflows`);
}

export async function testWorkflowAction(businessId: string, workflowId: string, _state: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  const parsed = RunWorkflowInputSchema.safeParse({ workflowDefinitionId: workflowId, sourceRecordId: formData.get("sourceRecordId") || undefined, idempotencyKey: `test:${workflowId}:${randomUUID()}`, testRun: true, input: {} });
  if (!parsed.success) return { status: "error", message: "Enter a valid source record ID, or leave it blank." };
  try { const executionId = await runWorkflow(businessId, parsed.data); revalidatePath(`/business/${businessId}/workflows/${workflowId}`); return { status: "success", message: "Test completed without applying actions.", executionId }; }
  catch (error) { workflowLogger.error("Workflow test failed", error, { businessId, workflowId }); return { status: "error", message: message(error, "The workflow test failed.") }; }
}

export async function runManualWorkflowAction(businessId: string, workflowId: string, _state: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  const parsed = RunWorkflowInputSchema.safeParse({ workflowDefinitionId: workflowId, sourceRecordId: formData.get("sourceRecordId") || undefined, idempotencyKey: `manual:${workflowId}:${String(formData.get("idempotencyKey") || randomUUID())}`, testRun: false, input: {} });
  if (!parsed.success) return { status: "error", message: "Check the manual run details." };
  try { const executionId = await runWorkflow(businessId, parsed.data); revalidatePath(`/business/${businessId}/workflows/${workflowId}`); return { status: "success", message: "Workflow execution finished.", executionId }; }
  catch (error) { workflowLogger.error("Manual workflow run failed", error, { businessId, workflowId }); return { status: "error", message: message(error, "The workflow could not run.") }; }
}

export async function retryWorkflowAction(businessId: string, executionId: string): Promise<void> { await retryWorkflowExecution(businessId, executionId); revalidatePath(`/business/${businessId}/workflows`); }
