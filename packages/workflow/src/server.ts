import "server-only";

import { can, requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { createClient, type ServerSupabaseClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { logger } from "@negosyo-os/core/logging";
import type { Json } from "@negosyo-os/database";
import { FieldStorageConfigSchema, ObjectIdSchema, type ObjectAttributeValue, type ObjectRecord } from "@negosyo-os/objects";
import { getObjectRecord, saveObjectRecord } from "@negosyo-os/objects/server";
import { createApprovalRequest } from "@negosyo-os/approvals/server";

import type { WorkflowAction, WorkflowActionResult, WorkflowDefinition, WorkflowExecution, WorkflowExecutionStep, WorkflowExecutionWithSteps, WorkflowRunContext, WorkflowRuntimeAdapter } from "./models";
import { executeWorkflow, resolveWorkflowValue, workflowScheduleMatches } from "./runtime";
import { RunWorkflowInputSchema, SaveWorkflowInputSchema, WorkflowConfigurationSchema, WorkflowExecutionIdSchema, WorkflowIdSchema, type RunWorkflowInput, type SaveWorkflowInput } from "./schemas";

const workflowLogger = logger.child({ domain: "workflow-runtime" });

function databaseError(message: string, cause: unknown): AppError { return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false }); }
function mutationError(error: { code?: string; message?: string }): AppError {
  if (error.code === "23505") return new AppError({ code: ERROR_CODES.conflict, message: "A workflow with that key already exists.", status: 409, cause: error });
  if (error.code === "22023" || error.code === "P0001") return new AppError({ code: ERROR_CODES.validationFailed, message: error.message ?? "Invalid workflow.", status: 400, cause: error });
  return databaseError("The workflow operation failed.", error);
}
async function requireWorkflowReader(businessId: string, client: ServerSupabaseClient) {
  const user = await requireAuthenticatedUser(client);
  const allowed = await Promise.all([can(user, PERMISSIONS.workflowRead, { businessId }, client), can(user, PERMISSIONS.workflowManage, { businessId }, client)]);
  if (!allowed.some(Boolean)) throw new AppError({ code: ERROR_CODES.permissionDenied, message: "You do not have permission to view workflows.", status: 403 });
  return user;
}

type DefinitionRow = { id: string; organization_id: string; key: string; name: string; description: string | null; trigger_config: Json; conditions: Json; steps: Json; retry_policy: Json; version: number; status: string; created_by: string; updated_by: string; disabled_at: string | null; created_at: string; updated_at: string };
function mapDefinition(row: DefinitionRow): WorkflowDefinition {
  const config = WorkflowConfigurationSchema.parse({ trigger: row.trigger_config, conditions: row.conditions, actions: row.steps, retryPolicy: row.retry_policy });
  return { id: row.id, businessId: row.organization_id, key: row.key, name: row.name, description: row.description, ...config, version: row.version, status: row.status as WorkflowDefinition["status"], createdBy: row.created_by, updatedBy: row.updated_by, disabledAt: row.disabled_at, createdAt: row.created_at, updatedAt: row.updated_at };
}
type ExecutionRow = { id: string; organization_id: string; workflow_definition_id: string; workflow_version: number; trigger_type: string; source_object_definition_id: string | null; source_record_id: string | null; idempotency_key: string; status: string; attempt: number; max_attempts: number; test_run: boolean; input: Json; error_code: string | null; error_message: string | null; initiated_by: string; started_at: string | null; completed_at: string | null; next_retry_at: string | null; created_at: string; updated_at: string };
function jsonObject(value: Json): Readonly<Record<string, unknown>> { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function mapExecution(row: ExecutionRow): WorkflowExecution { return { id: row.id, businessId: row.organization_id, workflowDefinitionId: row.workflow_definition_id, workflowVersion: row.workflow_version, triggerType: row.trigger_type as WorkflowExecution["triggerType"], sourceObjectDefinitionId: row.source_object_definition_id, sourceRecordId: row.source_record_id, idempotencyKey: row.idempotency_key, status: row.status as WorkflowExecution["status"], attempt: row.attempt, maxAttempts: row.max_attempts, testRun: row.test_run, input: jsonObject(row.input), errorCode: row.error_code, errorMessage: row.error_message, initiatedBy: row.initiated_by, startedAt: row.started_at, completedAt: row.completed_at, nextRetryAt: row.next_retry_at, createdAt: row.created_at, updatedAt: row.updated_at }; }
type StepRow = { id: string; organization_id: string; execution_id: string; action_key: string; action_type: string; position: number; status: string; attempt: number; input: Json; output: Json; error_code: string | null; error_message: string | null; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string };
function mapStep(row: StepRow): WorkflowExecutionStep { return { id: row.id, businessId: row.organization_id, executionId: row.execution_id, actionKey: row.action_key, actionType: row.action_type as WorkflowExecutionStep["actionType"], position: row.position, status: row.status as WorkflowExecutionStep["status"], attempt: row.attempt, input: jsonObject(row.input), output: jsonObject(row.output), errorCode: row.error_code, errorMessage: row.error_message, startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at, updatedAt: row.updated_at }; }

export async function listWorkflowDefinitions(businessId: string): Promise<readonly WorkflowDefinition[]> {
  const id = BusinessIdSchema.parse(businessId); const client = await createClient(); await requireWorkflowReader(id, client);
  const { data, error } = await client.from("workflow_definitions").select("*").eq("organization_id", id).neq("status", "archived").order("name");
  if (error) throw databaseError("Workflows could not be loaded.", error); return (data as DefinitionRow[]).map(mapDefinition);
}
export async function getWorkflowDefinition(businessId: string, workflowId: string): Promise<WorkflowDefinition> {
  const id = BusinessIdSchema.parse(businessId); const parsedId = WorkflowIdSchema.parse(workflowId); const client = await createClient(); await requireWorkflowReader(id, client);
  const { data, error } = await client.from("workflow_definitions").select("*").eq("organization_id", id).eq("id", parsedId).neq("status", "archived").single();
  if (error) throw databaseError("Workflow could not be loaded.", error); return mapDefinition(data as DefinitionRow);
}

async function validateReferences(client: ServerSupabaseClient, businessId: string, configuration: ReturnType<typeof WorkflowConfigurationSchema.parse>) {
  const objectIds = new Set<string>(); const sourceObjectId = "objectDefinitionId" in configuration.trigger ? configuration.trigger.objectDefinitionId : undefined;
  if (sourceObjectId) objectIds.add(sourceObjectId);
  for (const action of configuration.actions) if (action.type === "create_record") objectIds.add(action.objectDefinitionId);
  if (objectIds.size) { const { data } = await client.from("object_definitions").select("id").eq("organization_id", businessId).in("id", [...objectIds]).eq("status", "active"); if (data?.length !== objectIds.size) throw new AppError({ code: ERROR_CODES.validationFailed, message: "A workflow references an unavailable object.", status: 400 }); }
  const allFields = objectIds.size ? await client.from("field_definitions").select("object_definition_id,key,data_type,config").eq("organization_id", businessId).in("object_definition_id", [...objectIds]).eq("status", "active") : { data: [], error: null };
  if (allFields.error) throw databaseError("Workflow fields could not be loaded.", allFields.error);
  if (sourceObjectId) {
    const fields = new Map((allFields.data ?? []).filter((field) => field.object_definition_id === sourceObjectId).map((field) => [field.key, field]));
    const sourceKeys = [...configuration.conditions.conditions.map((condition) => condition.fieldKey), ...(configuration.trigger.type === "record.status_changed" ? [configuration.trigger.fieldKey] : []), ...configuration.actions.flatMap((action) => action.type === "update_record" ? Object.keys(action.values) : action.type === "assign_user" || action.type === "change_status" ? [action.fieldKey] : [])].filter((key) => !["record","branch","created_at","updated_at"].includes(key));
    if (sourceKeys.some((key) => !fields.has(key))) throw new AppError({ code: ERROR_CODES.validationFailed, message: "A workflow references an unknown source field.", status: 400 });
    for (const action of configuration.actions) {
      if (action.type === "assign_user" && fields.get(action.fieldKey)?.data_type !== "user") throw new AppError({ code: ERROR_CODES.validationFailed, message: "Assign user requires a user field.", status: 400 });
      if (action.type === "change_status") { const field = fields.get(action.fieldKey); const config = field ? FieldStorageConfigSchema.parse(field.config) : undefined; if (!field || !["status","select"].includes(field.data_type) || !config?.options.some((option) => option.value === action.status)) throw new AppError({ code: ERROR_CODES.validationFailed, message: "Change status requires a valid status option.", status: 400 }); }
      if ("values" in action) for (const workflowValue of Object.values(action.values)) if (typeof workflowValue === "object" && workflowValue !== null && !Array.isArray(workflowValue) && "sourceFieldKey" in workflowValue && !["record","branch","created_at","updated_at"].includes(workflowValue.sourceFieldKey) && !fields.has(workflowValue.sourceFieldKey)) throw new AppError({ code: ERROR_CODES.validationFailed, message: "An action copies an unknown source field.", status: 400 });
    }
  }
  for (const action of configuration.actions) if (action.type === "create_record") { const targetKeys = new Set((allFields.data ?? []).filter((field) => field.object_definition_id === action.objectDefinitionId).map((field) => field.key)); if (Object.keys(action.values).some((key) => !targetKeys.has(key))) throw new AppError({ code: ERROR_CODES.validationFailed, message: "Create record references an unknown target field.", status: 400 }); }
  const branchIds = configuration.actions.flatMap((action) => "branchId" in action && action.branchId ? [action.branchId] : []); if (branchIds.length) { const unique = [...new Set(branchIds)]; const { data } = await client.from("branches").select("id").eq("organization_id", businessId).in("id", unique).eq("is_active", true); if (data?.length !== unique.length) throw new AppError({ code: ERROR_CODES.validationFailed, message: "An action references an unavailable Branch.", status: 400 }); }
  const roleKeys = configuration.actions.flatMap((action) => action.type === "request_approval" ? [...(action.approvalSteps?.flatMap((step)=>step.approverRoleKey ? [step.approverRoleKey] : []) ?? []),...(action.approverRoleKey ? [action.approverRoleKey] : [])] : "recipientRoleKey" in action && action.recipientRoleKey ? [action.recipientRoleKey] : []); if (roleKeys.length) { const unique = [...new Set(roleKeys)]; const { data } = await client.from("roles").select("key").eq("organization_id", businessId).in("key", unique); if (data?.length !== unique.length) throw new AppError({ code: ERROR_CODES.validationFailed, message: "An action references an unavailable role.", status: 400 }); }
  const userIds = configuration.actions.flatMap((action) => action.type === "request_approval" ? [...(action.approvalSteps?.flatMap((step)=>step.approverUserId ? [step.approverUserId] : []) ?? []),...(action.approverUserId ? [action.approverUserId] : [])] : "userId" in action ? [action.userId] : "recipientUserId" in action && action.recipientUserId ? [action.recipientUserId] : "assigneeUserId" in action && action.assigneeUserId ? [action.assigneeUserId] : []); if (userIds.length) { const unique = [...new Set(userIds)]; const { data } = await client.from("organization_memberships").select("user_id").eq("organization_id", businessId).eq("status", "active").in("user_id", unique); if (data?.length !== unique.length) throw new AppError({ code: ERROR_CODES.validationFailed, message: "An action references an unavailable Business member.", status: 400 }); }
}

export async function saveWorkflowDefinition(businessId: string, input: SaveWorkflowInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId); const parsed = SaveWorkflowInputSchema.parse(input); const client = await createClient(); const user = await requireAuthenticatedUser(client);
  await requireCapability(user, PERMISSIONS.workflowManage, { businessId: id }, client); await validateReferences(client, id, parsed.configuration);
  const { data, error } = await client.rpc("save_workflow_definition", { requested_organization_id: id, requested_key: parsed.key, requested_name: parsed.name, requested_description: parsed.description, requested_trigger: parsed.configuration.trigger as unknown as Json, requested_conditions: parsed.configuration.conditions as unknown as Json, requested_actions: parsed.configuration.actions as unknown as Json, requested_retry_policy: parsed.configuration.retryPolicy as unknown as Json, requested_status: parsed.status, ...(parsed.workflowDefinitionId ? { requested_workflow_definition_id: parsed.workflowDefinitionId } : {}) });
  if (error) throw mutationError(error); return WorkflowIdSchema.parse(data);
}

function errorDetails(error: unknown) { return { code: error instanceof AppError ? error.code : "WORKFLOW_ACTION_FAILED", message: error instanceof Error ? error.message.slice(0, 1_000) : "Workflow action failed." }; }
function template(text: string, context: WorkflowRunContext): string { return text.replace(/\{\{\s*(record|field\.[a-z][a-z0-9_]*)\s*\}\}/g, (_match, token: string) => token === "record" ? context.sourceRecord?.displayValue ?? "" : String(context.sourceRecord?.attributes[token.slice(6)] ?? "")); }
async function patchSourceRecord(client: ServerSupabaseClient, context: WorkflowRunContext, patch: Readonly<Record<string, ObjectAttributeValue | undefined>>, branchId = context.sourceRecord?.branchId) {
  const source = context.sourceRecord; if (!source) throw new Error("This action requires a source record.");
  const { data, error } = await client.from("field_definitions").select("key,config").eq("organization_id", source.businessId).eq("object_definition_id", source.objectDefinitionId).eq("status", "active");
  if (error) throw databaseError("Workflow record fields could not be loaded.", error);
  const attributes: Record<string, ObjectAttributeValue> = {};
  for (const field of data) { const config = FieldStorageConfigSchema.parse(field.config); const next = patch[field.key] ?? source.attributes[field.key]; if (config.visibility === "visible" && !config.readOnly && next !== undefined) attributes[field.key] = next; }
  return saveObjectRecord(source.businessId, { objectDefinitionId: source.objectDefinitionId, recordId: source.id, branchId: branchId ?? null, attributes });
}

class DatabaseWorkflowAdapter implements WorkflowRuntimeAdapter {
  private readonly backoffSeconds = new Map<string, number>();
  constructor(private readonly client: ServerSupabaseClient) {}
  async begin(definition: WorkflowDefinition, context: WorkflowRunContext, idempotencyKey: string, testRun: boolean): Promise<{ execution: WorkflowExecution; existing: boolean }> {
    this.backoffSeconds.set(definition.id, definition.retryPolicy.backoffSeconds);
    const existingQuery = await this.client.from("workflow_executions").select("*").eq("organization_id", definition.businessId).eq("workflow_definition_id", definition.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existingQuery.error) throw databaseError("Workflow execution could not be loaded.", existingQuery.error);
    if (existingQuery.data) {
      let execution = mapExecution(existingQuery.data as ExecutionRow);
      if (["failed","retrying"].includes(execution.status) && execution.attempt < execution.maxAttempts) { const now = new Date().toISOString(); const updated = await this.client.from("workflow_executions").update({ status: "running", attempt: execution.attempt + 1, started_at: now, completed_at: null, next_retry_at: null, error_code: null, error_message: null }).eq("id", execution.id).select("*").single(); if (updated.error) throw databaseError("Workflow retry could not start.", updated.error); execution = mapExecution(updated.data as ExecutionRow); return { execution, existing: false }; }
      return { execution, existing: true };
    }
    const now = new Date().toISOString(); const inserted = await this.client.from("workflow_executions").insert({ organization_id: definition.businessId, workflow_definition_id: definition.id, workflow_version: definition.version, trigger_type: definition.trigger.type, source_object_definition_id: context.sourceRecord?.objectDefinitionId ?? null, source_record_id: context.sourceRecord?.id ?? null, idempotency_key: idempotencyKey, status: "running", attempt: 1, max_attempts: definition.retryPolicy.maxAttempts, test_run: testRun, input: (context.input ?? {}) as Json, initiated_by: context.initiatedBy, started_at: now }).select("*").single();
    if (inserted.error) { if (inserted.error.code === "23505") return this.begin(definition, context, idempotencyKey, testRun); throw databaseError("Workflow execution could not start.", inserted.error); }
    return { execution: mapExecution(inserted.data as ExecutionRow), existing: false };
  }
  async startStep(execution: WorkflowExecution, action: WorkflowAction, position: number) {
    const found = await this.client.from("workflow_execution_steps").select("*").eq("execution_id", execution.id).eq("action_key", action.key).maybeSingle(); if (found.error) throw databaseError("Workflow step could not be loaded.", found.error);
    if (found.data) { const step = mapStep(found.data as StepRow); if (step.status === "succeeded") return step; const updated = await this.client.from("workflow_execution_steps").update({ status: "running", attempt: step.attempt + 1, started_at: new Date().toISOString(), completed_at: null, error_code: null, error_message: null }).eq("id", step.id).select("*").single(); if (updated.error) throw databaseError("Workflow step could not restart.", updated.error); return mapStep(updated.data as StepRow); }
    const inserted = await this.client.from("workflow_execution_steps").insert({ organization_id: execution.businessId, execution_id: execution.id, action_key: action.key, action_type: action.type, position, status: "running", attempt: 1, input: action as unknown as Json, started_at: new Date().toISOString() }).select("*").single(); if (inserted.error) throw databaseError("Workflow step could not start.", inserted.error); return mapStep(inserted.data as StepRow);
  }
  async perform(action: WorkflowAction, _definition: WorkflowDefinition, execution: WorkflowExecution, context: WorkflowRunContext): Promise<WorkflowActionResult> {
    const values = "values" in action ? Object.fromEntries(Object.entries(action.values).flatMap(([key, value]) => { const resolved = resolveWorkflowValue(value, context); return resolved === undefined ? [] : [[key, resolved]]; })) : {};
    const step = await this.client.from("workflow_execution_steps").select("id").eq("execution_id", execution.id).eq("action_key", action.key).single(); if (step.error) throw databaseError("Workflow step identity was unavailable.", step.error); const stepId = step.data.id;
    switch (action.type) {
      case "update_record": return { output: { recordId: await patchSourceRecord(this.client, context, values) } };
      case "assign_user": return { output: { recordId: await patchSourceRecord(this.client, context, { [action.fieldKey]: action.userId }) } };
      case "change_status": return { output: { recordId: await patchSourceRecord(this.client, context, { [action.fieldKey]: action.status }) } };
      case "assign_branch": return { output: { recordId: await patchSourceRecord(this.client, context, {}, action.branchId) } };
      case "create_record": return { output: { recordId: await saveObjectRecord(execution.businessId, { objectDefinitionId: action.objectDefinitionId, recordId: stepId, branchId: action.branchId ?? null, attributes: values }) } };
      case "send_notification": { const result = await this.client.from("workflow_notifications").upsert({ organization_id: execution.businessId, execution_step_id: stepId, recipient_user_id: action.recipientUserId ?? null, recipient_role_key: action.recipientRoleKey ?? null, title: template(action.title, context), message: template(action.message, context) }, { onConflict: "execution_step_id" }).select("id").single(); if (result.error) throw databaseError("Notification could not be created.", result.error); return { output: { notificationId: result.data.id } }; }
      case "request_approval": { const steps=action.approvalSteps ? [...action.approvalSteps] : [{key:"approval",name:action.name,...(action.approverUserId ? {approverUserId:action.approverUserId}:{approverRoleKey:action.approverRoleKey!})}]; const approvalId=await createApprovalRequest(execution.businessId,{category:action.category ?? "custom",title:template(action.title,context),description:action.message ? template(action.message,context) : "",...(context.sourceRecord ? {sourceObjectDefinitionId:context.sourceRecord.objectDefinitionId,sourceRecordId:context.sourceRecord.id}:{}),workflowExecutionStepId:stepId,steps}); return {output:{approvalId}}; }
      case "create_task": { const dueAt = action.dueInDays === undefined ? null : new Date(Date.now() + action.dueInDays * 86_400_000).toISOString(); const result = await this.client.from("workflow_tasks").upsert({ organization_id: execution.businessId, execution_step_id: stepId, source_record_id: context.sourceRecord?.id ?? null, title: template(action.title, context), description: action.description ? template(action.description, context) : null, assignee_user_id: action.assigneeUserId ?? null, branch_id: action.branchId ?? context.sourceRecord?.branchId ?? null, due_at: dueAt, created_by: execution.initiatedBy }, { onConflict: "execution_step_id" }).select("id").single(); if (result.error) throw databaseError("Task could not be created.", result.error); return { output: { taskId: result.data.id } }; }
    }
  }
  async completeStep(step: WorkflowExecutionStep, result: WorkflowActionResult) { if (step.status === "succeeded") return; const { error } = await this.client.from("workflow_execution_steps").update({ status: "succeeded", output: (result.output ?? {}) as Json, completed_at: new Date().toISOString() }).eq("id", step.id); if (error) throw databaseError("Workflow step could not complete.", error); }
  async failStep(step: WorkflowExecutionStep, error: unknown) { const details = errorDetails(error); const result = await this.client.from("workflow_execution_steps").update({ status: "failed", error_code: details.code, error_message: details.message, completed_at: new Date().toISOString() }).eq("id", step.id); if (result.error) throw databaseError("Workflow step failure could not be recorded.", result.error); }
  async finish(execution: WorkflowExecution, status: "succeeded" | "failed" | "skipped", error?: unknown) { const details = errorDetails(error); const retrying = status === "failed" && execution.attempt < execution.maxAttempts; const backoff = this.backoffSeconds.get(execution.workflowDefinitionId) ?? 60; const result = await this.client.from("workflow_executions").update({ status: retrying ? "retrying" : status, error_code: error ? details.code : null, error_message: error ? details.message : null, completed_at: retrying ? null : new Date().toISOString(), next_retry_at: retrying ? new Date(Date.now() + backoff * 1_000).toISOString() : null }).eq("id", execution.id); if (result.error) throw databaseError("Workflow result could not be recorded.", result.error); }
}

export async function runWorkflow(businessId: string, input: RunWorkflowInput): Promise<string> {
  const id = BusinessIdSchema.parse(businessId); const parsed = RunWorkflowInputSchema.parse(input); const client = await createClient(); const user = await requireAuthenticatedUser(client); await requireCapability(user, PERMISSIONS.workflowManage, { businessId: id }, client);
  const definition = await getWorkflowDefinition(id, parsed.workflowDefinitionId); if (!parsed.testRun && definition.status !== "active") throw new AppError({ code: ERROR_CODES.conflict, message: "Enable this workflow before running it.", status: 409 });
  let sourceRecord: ObjectRecord | undefined; if (parsed.sourceRecordId) { const objectId = "objectDefinitionId" in definition.trigger ? definition.trigger.objectDefinitionId : undefined; if (!objectId) throw new AppError({ code: ERROR_CODES.validationFailed, message: "This workflow does not accept a source record.", status: 400 }); sourceRecord = await getObjectRecord(id, objectId, ObjectIdSchema.parse(parsed.sourceRecordId)); }
  const execution = await executeWorkflow(definition, { ...(sourceRecord ? { sourceRecord } : {}), initiatedBy: user.id, input: parsed.input }, parsed.idempotencyKey, new DatabaseWorkflowAdapter(client), parsed.testRun);
  if (parsed.testRun) { const audit = await client.rpc("record_workflow_audit_event", { requested_organization_id: id, requested_workflow_definition_id: definition.id, requested_event: "tested" }); if (audit.error) throw databaseError("Workflow test audit could not be recorded.", audit.error); }
  return execution.id;
}
export async function retryWorkflowExecution(businessId: string, executionId: string): Promise<string> {
  const id = BusinessIdSchema.parse(businessId); const parsedId = WorkflowExecutionIdSchema.parse(executionId); const client = await createClient(); await requireWorkflowReader(id, client);
  const { data, error } = await client.from("workflow_executions").select("*").eq("organization_id", id).eq("id", parsedId).single(); if (error) throw databaseError("Execution could not be loaded.", error); const execution = mapExecution(data as ExecutionRow); if (!["failed","retrying"].includes(execution.status)) throw new AppError({ code: ERROR_CODES.conflict, message: "Only failed executions can be retried.", status: 409 });
  const retried = await runWorkflow(id, { workflowDefinitionId: execution.workflowDefinitionId, ...(execution.sourceRecordId ? { sourceRecordId: execution.sourceRecordId } : {}), idempotencyKey: execution.idempotencyKey, testRun: execution.testRun, input: execution.input });
  const audit = await client.rpc("record_workflow_audit_event", { requested_organization_id: id, requested_workflow_definition_id: execution.workflowDefinitionId, requested_event: "retried" }); if (audit.error) throw databaseError("Workflow retry audit could not be recorded.", audit.error);
  return retried;
}
export async function listWorkflowExecutions(businessId: string, workflowId?: string): Promise<readonly WorkflowExecutionWithSteps[]> {
  const id = BusinessIdSchema.parse(businessId); const client = await createClient(); await requireWorkflowReader(id, client); let query = client.from("workflow_executions").select("*").eq("organization_id", id).order("created_at", { ascending: false }).limit(50); if (workflowId) query = query.eq("workflow_definition_id", WorkflowIdSchema.parse(workflowId)); const executions = await query; if (executions.error) throw databaseError("Executions could not be loaded.", executions.error); const ids = executions.data.map((row) => row.id); const steps = ids.length ? await client.from("workflow_execution_steps").select("*").in("execution_id", ids).order("position") : { data: [], error: null }; if (steps.error) throw databaseError("Execution steps could not be loaded.", steps.error); return executions.data.map((row) => ({ execution: mapExecution(row as ExecutionRow), steps: (steps.data as StepRow[]).filter((step) => step.execution_id === row.id).map(mapStep) }));
}

export async function listWorkflowAuditHistory(businessId: string, workflowId: string): Promise<readonly { id: string; event: string; version: number; actorId: string; createdAt: string }[]> {
  const id = BusinessIdSchema.parse(businessId); const definitionId = WorkflowIdSchema.parse(workflowId); const client = await createClient(); await requireWorkflowReader(id, client);
  const { data, error } = await client.from("workflow_audit_history").select("id,event,version,actor_id,created_at").eq("organization_id", id).eq("workflow_definition_id", definitionId).order("created_at", { ascending: false }).limit(50);
  if (error) throw databaseError("Workflow audit history could not be loaded.", error); return data.map((row) => ({ id: row.id, event: row.event, version: row.version, actorId: row.actor_id, createdAt: row.created_at }));
}

export async function dispatchRecordWorkflows(
  businessId: string,
  event: "record.created" | "record.updated",
  sourceRecord: ObjectRecord,
  previousRecord?: ObjectRecord | undefined,
): Promise<readonly string[]> {
  const id = BusinessIdSchema.parse(businessId); if (sourceRecord.businessId !== id) throw new AppError({ code: ERROR_CODES.validationFailed, message: "The source record belongs to another Business.", status: 400 });
  const client = await createClient(); const user = await requireAuthenticatedUser(client);
  await requireCapability(user, event === "record.created" ? PERMISSIONS.recordCreate : PERMISSIONS.recordUpdate, { businessId: id, ...(sourceRecord.branchId ? { branchId: sourceRecord.branchId } : {}) }, client);
  const triggerTypes = event === "record.updated" ? ["record.updated", "record.status_changed"] : ["record.created"];
  const { data, error } = await client.from("workflow_definitions").select("*").eq("organization_id", id).eq("status", "active").in("trigger_config->>type", triggerTypes).eq("trigger_config->>objectDefinitionId", sourceRecord.objectDefinitionId);
  if (error) throw databaseError("Record workflows could not be loaded.", error);
  const adapter = new DatabaseWorkflowAdapter(client); const executionIds: string[] = [];
  for (const row of data as DefinitionRow[]) {
    const definition = mapDefinition(row); const key = `${event}:${sourceRecord.id}:${sourceRecord.updatedAt}:${definition.id}`;
    try { const execution = await executeWorkflow(definition, { sourceRecord, ...(previousRecord ? { previousRecord } : {}), initiatedBy: user.id }, key, adapter); executionIds.push(execution.id); }
    catch (dispatchError) { workflowLogger.error("Record workflow dispatch failed", dispatchError, { businessId: id, workflowId: definition.id, recordId: sourceRecord.id }); }
  }
  return executionIds;
}

export async function dispatchScheduledWorkflows(businessId: string, slot = new Date()): Promise<readonly string[]> {
  const id = BusinessIdSchema.parse(businessId); const client = await createClient(); const user = await requireAuthenticatedUser(client); await requireCapability(user, PERMISSIONS.workflowManage, { businessId: id }, client);
  const { data, error } = await client.from("workflow_definitions").select("*").eq("organization_id", id).eq("status", "active").eq("trigger_config->>type", "schedule"); if (error) throw databaseError("Scheduled workflows could not be loaded.", error);
  const adapter = new DatabaseWorkflowAdapter(client); const ids: string[] = [];
  for (const row of data as DefinitionRow[]) { const definition = mapDefinition(row); if (definition.trigger.type !== "schedule" || !workflowScheduleMatches(definition.trigger.cron, slot, definition.trigger.timezone)) continue; const execution = await executeWorkflow(definition, { initiatedBy: user.id }, `schedule:${definition.id}:${slot.toISOString().slice(0,16)}`, adapter); ids.push(execution.id); }
  return ids;
}

export async function dispatchDueWorkflowRetries(businessId: string, limit = 25): Promise<readonly string[]> {
  const id = BusinessIdSchema.parse(businessId); const client = await createClient(); const user = await requireAuthenticatedUser(client); await requireCapability(user, PERMISSIONS.workflowManage, { businessId: id }, client);
  const { data, error } = await client.from("workflow_executions").select("id").eq("organization_id", id).eq("status", "retrying").lte("next_retry_at", new Date().toISOString()).order("next_retry_at").limit(Math.min(Math.max(limit, 1), 100)); if (error) throw databaseError("Due workflow retries could not be loaded.", error);
  const results: string[] = []; for (const execution of data) results.push(await retryWorkflowExecution(id, execution.id)); return results;
}
