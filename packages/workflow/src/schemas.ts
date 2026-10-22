import { ObjectKeySchema } from "@negosyo-os/objects";
import { APPROVAL_CATEGORIES, ApprovalStepInputSchema } from "@negosyo-os/approvals";
import { z } from "zod";
import { WORKFLOW_ACTION_TYPES, WORKFLOW_CONDITION_OPERATORS, WORKFLOW_TRIGGER_TYPES } from "./models";

const label = z.string().trim().min(1).max(120);
const value = z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(z.string()).max(100)]);
const fieldKey = z.union([ObjectKeySchema, z.enum(["record", "branch", "created_at", "updated_at"])]);
const workflowValue = z.union([value, z.strictObject({ sourceFieldKey: fieldKey }), z.strictObject({ executionValue: z.enum(["initiated_by", "source_record_id", "source_branch_id"]) })]);
export const WorkflowIdSchema = z.uuid();
export const WorkflowExecutionIdSchema = z.uuid();
export const WorkflowTriggerSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("record.created"), objectDefinitionId: z.uuid() }),
  z.strictObject({ type: z.literal("record.updated"), objectDefinitionId: z.uuid() }),
  z.strictObject({ type: z.literal("record.status_changed"), objectDefinitionId: z.uuid(), fieldKey: ObjectKeySchema, from: value.optional(), to: value.optional() }),
  z.strictObject({ type: z.literal("schedule"), cron: z.string().trim().regex(/^(\S+\s+){4}\S+$/, "Use a five-part cron expression.").max(120), timezone: z.string().trim().min(1).max(80).default("Asia/Manila") }),
  z.strictObject({ type: z.literal("manual"), objectDefinitionId: z.uuid().optional() }),
]);
export const WorkflowConditionSchema = z.strictObject({ fieldKey, operator: z.enum(WORKFLOW_CONDITION_OPERATORS), value: value.optional() }).superRefine((condition, context) => {
  const emptyOperator = condition.operator === "is_empty" || condition.operator === "not_empty";
  if (emptyOperator && condition.value !== undefined) context.addIssue({ code: "custom", path: ["value"], message: "Empty checks do not accept a value." });
  if (!emptyOperator && condition.value === undefined) context.addIssue({ code: "custom", path: ["value"], message: "This condition requires a value." });
});
export const WorkflowConditionGroupSchema = z.strictObject({ logic: z.enum(["all", "any"]), conditions: z.array(WorkflowConditionSchema).max(25) });
const actionBase = { key: ObjectKeySchema, name: label, continueOnFailure: z.boolean().default(false) };
export const WorkflowActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...actionBase, type: z.literal("update_record"), values: z.record(ObjectKeySchema, workflowValue).refine((values) => Object.keys(values).length > 0 && Object.keys(values).length <= 50) }),
  z.strictObject({ ...actionBase, type: z.literal("create_record"), objectDefinitionId: z.uuid(), branchId: z.uuid().optional(), values: z.record(ObjectKeySchema, workflowValue) }),
  z.strictObject({ ...actionBase, type: z.literal("send_notification"), recipientUserId: z.uuid().optional(), recipientRoleKey: ObjectKeySchema.optional(), title: label, message: z.string().trim().min(1).max(2_000) }).refine((action) => Boolean(action.recipientUserId) !== Boolean(action.recipientRoleKey), { message: "Choose one notification recipient." }),
  z.strictObject({ ...actionBase, type: z.literal("request_approval"), category: z.enum(APPROVAL_CATEGORIES).default("custom"), approvalSteps: z.array(ApprovalStepInputSchema).min(1).max(10).optional(), approverUserId: z.uuid().optional(), approverRoleKey: ObjectKeySchema.optional(), title: label, message: z.string().trim().max(2_000).optional() }).superRefine((action, context) => {
    const legacyApprover = Boolean(action.approverUserId) !== Boolean(action.approverRoleKey);
    if (Boolean(action.approvalSteps) === legacyApprover) context.addIssue({ code:"custom", message:"Provide approvalSteps or one single approver." });
  }),
  z.strictObject({ ...actionBase, type: z.literal("assign_user"), fieldKey: ObjectKeySchema, userId: z.uuid() }),
  z.strictObject({ ...actionBase, type: z.literal("assign_branch"), branchId: z.uuid() }),
  z.strictObject({ ...actionBase, type: z.literal("change_status"), fieldKey: ObjectKeySchema, status: z.string().trim().min(1).max(120) }),
  z.strictObject({ ...actionBase, type: z.literal("create_task"), title: label, description: z.string().trim().max(2_000).optional(), assigneeUserId: z.uuid().optional(), branchId: z.uuid().optional(), dueInDays: z.number().int().min(0).max(3650).optional() }),
]);
export const WorkflowConfigurationSchema = z.strictObject({
  trigger: WorkflowTriggerSchema,
  conditions: WorkflowConditionGroupSchema.default({ logic: "all", conditions: [] }),
  actions: z.array(WorkflowActionSchema).min(1).max(50).refine((actions) => new Set(actions.map((action) => action.key)).size === actions.length, "Action keys must be unique."),
  retryPolicy: z.strictObject({ maxAttempts: z.number().int().min(1).max(5).default(3), backoffSeconds: z.number().int().min(0).max(86_400).default(60) }).default({ maxAttempts: 3, backoffSeconds: 60 }),
});
export const SaveWorkflowInputSchema = z.strictObject({ workflowDefinitionId: z.uuid().optional(), key: ObjectKeySchema, name: label, description: z.string().trim().max(500).default(""), configuration: WorkflowConfigurationSchema, status: z.enum(["draft", "active", "disabled"]).default("draft") });
export const RunWorkflowInputSchema = z.strictObject({ workflowDefinitionId: z.uuid(), sourceRecordId: z.uuid().optional(), idempotencyKey: z.string().trim().min(8).max(200), testRun: z.boolean().default(false), input: z.record(z.string().max(80), z.unknown()).default({}) });
export const WORKFLOW_TRIGGERS = WORKFLOW_TRIGGER_TYPES;
export const WORKFLOW_ACTIONS = WORKFLOW_ACTION_TYPES;
export type SaveWorkflowInput = z.input<typeof SaveWorkflowInputSchema>;
export type RunWorkflowInput = z.input<typeof RunWorkflowInputSchema>;
