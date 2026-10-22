import { z } from "zod";
import { ObjectKeySchema } from "@negosyo-os/objects";
import { APPROVAL_CATEGORIES } from "./models";

export const ApprovalIdSchema = z.uuid();
export const ApprovalStepIdSchema = z.uuid();
export const ApprovalStepInputSchema = z.strictObject({
  key: ObjectKeySchema, name: z.string().trim().min(1).max(120),
  approverUserId: z.uuid().optional(), approverRoleKey: ObjectKeySchema.optional(),
}).refine((step) => Boolean(step.approverUserId) !== Boolean(step.approverRoleKey), { message: "Choose exactly one user or role approver." });
export const CreateApprovalRequestInputSchema = z.strictObject({
  category: z.enum(APPROVAL_CATEGORIES), title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).default(""), sourceObjectDefinitionId: z.uuid().optional(),
  sourceRecordId: z.uuid().optional(), workflowExecutionStepId: z.uuid().optional(),
  steps: z.array(ApprovalStepInputSchema).min(1).max(10).refine((steps) => new Set(steps.map((step) => step.key)).size === steps.length, "Approval step keys must be unique."),
}).refine((input) => !input.sourceRecordId || Boolean(input.sourceObjectDefinitionId), { message: "Source records require an Object Definition." });
export const DecideApprovalInputSchema = z.strictObject({
  approvalRequestId: z.uuid(), approvalStepId: z.uuid(), decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(2_000).default(""),
});
export const CancelApprovalInputSchema = z.strictObject({ approvalRequestId: z.uuid(), reason: z.string().trim().min(1).max(500) });
export type CreateApprovalRequestInput = z.input<typeof CreateApprovalRequestInputSchema>;
export type DecideApprovalInput = z.input<typeof DecideApprovalInputSchema>;
export type CancelApprovalInput = z.input<typeof CancelApprovalInputSchema>;
