import type { ObjectAttributeValue, ObjectRecord } from "@negosyo-os/objects";
import type { ApprovalCategory, ApprovalStepInput } from "@negosyo-os/approvals";

export const WORKFLOW_TRIGGER_TYPES = ["record.created", "record.updated", "record.status_changed", "schedule", "manual"] as const;
export const WORKFLOW_CONDITION_OPERATORS = ["equals", "not_equals", "greater_than", "less_than", "contains", "is_empty", "not_empty"] as const;
export const WORKFLOW_ACTION_TYPES = ["update_record", "create_record", "send_notification", "request_approval", "assign_user", "assign_branch", "change_status", "create_task"] as const;

export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];
export type WorkflowConditionOperator = (typeof WORKFLOW_CONDITION_OPERATORS)[number];
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];
export type WorkflowDefinitionStatus = "draft" | "active" | "disabled" | "archived";
export type WorkflowExecutionStatus = "pending" | "running" | "retrying" | "succeeded" | "failed" | "skipped";
export type WorkflowStepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type WorkflowValue = ObjectAttributeValue | { sourceFieldKey: string } | { executionValue: "initiated_by" | "source_record_id" | "source_branch_id" };

export type WorkflowTrigger =
  | { type: "record.created" | "record.updated"; objectDefinitionId: string }
  | { type: "record.status_changed"; objectDefinitionId: string; fieldKey: string; from?: ObjectAttributeValue | undefined; to?: ObjectAttributeValue | undefined }
  | { type: "schedule"; cron: string; timezone: string }
  | { type: "manual"; objectDefinitionId?: string | undefined };
export interface WorkflowCondition { fieldKey: string; operator: WorkflowConditionOperator; value?: ObjectAttributeValue | undefined }
export interface WorkflowConditionGroup { logic: "all" | "any"; conditions: readonly WorkflowCondition[] }
interface WorkflowActionBase { key: string; name: string; continueOnFailure: boolean }
export type WorkflowAction =
  | WorkflowActionBase & { type: "update_record"; values: Readonly<Record<string, WorkflowValue>> }
  | WorkflowActionBase & { type: "create_record"; objectDefinitionId: string; branchId?: string | undefined; values: Readonly<Record<string, WorkflowValue>> }
  | WorkflowActionBase & { type: "send_notification"; recipientUserId?: string | undefined; recipientRoleKey?: string | undefined; title: string; message: string }
  | WorkflowActionBase & { type: "request_approval"; category?: ApprovalCategory | undefined; approvalSteps?: readonly ApprovalStepInput[] | undefined; approverUserId?: string | undefined; approverRoleKey?: string | undefined; title: string; message?: string | undefined }
  | WorkflowActionBase & { type: "assign_user"; fieldKey: string; userId: string }
  | WorkflowActionBase & { type: "assign_branch"; branchId: string }
  | WorkflowActionBase & { type: "change_status"; fieldKey: string; status: string }
  | WorkflowActionBase & { type: "create_task"; title: string; description?: string | undefined; assigneeUserId?: string | undefined; branchId?: string | undefined; dueInDays?: number | undefined };

export interface WorkflowRetryPolicy { maxAttempts: number; backoffSeconds: number }
export interface WorkflowDefinition {
  id: string; businessId: string; key: string; name: string; description: string | null; trigger: WorkflowTrigger;
  conditions: WorkflowConditionGroup; actions: readonly WorkflowAction[]; retryPolicy: WorkflowRetryPolicy;
  version: number; status: WorkflowDefinitionStatus; createdBy: string; updatedBy: string;
  disabledAt: string | null; createdAt: string; updatedAt: string;
}
export interface WorkflowExecution {
  id: string; businessId: string; workflowDefinitionId: string; workflowVersion: number; triggerType: WorkflowTriggerType;
  sourceObjectDefinitionId: string | null; sourceRecordId: string | null; idempotencyKey: string;
  status: WorkflowExecutionStatus; attempt: number; maxAttempts: number; testRun: boolean;
  input: Readonly<Record<string, unknown>>; errorCode: string | null; errorMessage: string | null;
  initiatedBy: string; startedAt: string | null; completedAt: string | null; nextRetryAt: string | null;
  createdAt: string; updatedAt: string;
}
export interface WorkflowExecutionStep {
  id: string; businessId: string; executionId: string; actionKey: string; actionType: WorkflowActionType;
  position: number; status: WorkflowStepStatus; attempt: number; input: Readonly<Record<string, unknown>>;
  output: Readonly<Record<string, unknown>>; errorCode: string | null; errorMessage: string | null;
  startedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string;
}
export interface WorkflowExecutionWithSteps { execution: WorkflowExecution; steps: readonly WorkflowExecutionStep[] }
export interface WorkflowRunContext { sourceRecord?: ObjectRecord | undefined; previousRecord?: ObjectRecord | undefined; initiatedBy: string; input?: Readonly<Record<string, unknown>> | undefined }
export interface WorkflowActionResult { output?: Readonly<Record<string, unknown>> | undefined }
export interface WorkflowRuntimeAdapter {
  begin(definition: WorkflowDefinition, context: WorkflowRunContext, idempotencyKey: string, testRun: boolean): Promise<{ execution: WorkflowExecution; existing: boolean }>;
  startStep(execution: WorkflowExecution, action: WorkflowAction, position: number): Promise<WorkflowExecutionStep>;
  perform(action: WorkflowAction, definition: WorkflowDefinition, execution: WorkflowExecution, context: WorkflowRunContext): Promise<WorkflowActionResult>;
  completeStep(step: WorkflowExecutionStep, result: WorkflowActionResult): Promise<void>;
  failStep(step: WorkflowExecutionStep, error: unknown): Promise<void>;
  finish(execution: WorkflowExecution, status: "succeeded" | "failed" | "skipped", error?: unknown): Promise<void>;
}
