export const APPROVAL_CATEGORIES = ["discount", "expense", "purchase", "refund", "inventory_adjustment", "custom"] as const;
export type ApprovalCategory = (typeof APPROVAL_CATEGORIES)[number];
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalStepStatus = "waiting" | "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalDecisionValue = "approved" | "rejected";
export type ApprovalAuditEvent = "requested" | "step_activated" | "step_approved" | "approved" | "rejected" | "cancelled";

export interface ApprovalRequest {
  id: string; businessId: string; category: ApprovalCategory; title: string; description: string | null;
  sourceObjectDefinitionId: string | null; sourceRecordId: string | null; workflowExecutionStepId: string | null;
  requesterId: string; status: ApprovalStatus; currentStepPosition: number; totalSteps: number;
  completedAt: string | null; cancelledBy: string | null; cancellationReason: string | null;
  createdAt: string; updatedAt: string;
}
export interface ApprovalStep {
  id: string; businessId: string; approvalRequestId: string; key: string; name: string; position: number;
  approverType: "user" | "role"; approverUserId: string | null; approverRoleKey: string | null;
  status: ApprovalStepStatus; activatedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string;
}
export interface ApprovalDecision {
  id: string; businessId: string; approvalRequestId: string; approvalStepId: string;
  decision: ApprovalDecisionValue; comment: string | null; decidedBy: string; decidedAt: string;
}
export interface ApprovalAuditRecord {
  id: string; businessId: string; approvalRequestId: string; approvalStepId: string | null;
  event: ApprovalAuditEvent; actorId: string; details: Readonly<Record<string, unknown>>; createdAt: string;
}
export interface ApprovalRequestWithDetails {
  request: ApprovalRequest; steps: readonly ApprovalStep[]; decisions: readonly ApprovalDecision[]; audit: readonly ApprovalAuditRecord[];
}
export interface ApprovalStepInput { key: string; name: string; approverUserId?: string | undefined; approverRoleKey?: string | undefined }
