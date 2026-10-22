import type { ApprovalStep } from "./models";
export function canDecideApprovalStep(step: ApprovalStep, userId: string, roleKeys: readonly string[]): boolean {
  if (step.status !== "pending") return false;
  return step.approverType === "user" ? step.approverUserId === userId : Boolean(step.approverRoleKey && roleKeys.includes(step.approverRoleKey));
}
export function nextApprovalStep<T extends { position: number; status: string }>(steps: readonly T[], completedPosition: number): T | undefined {
  return [...steps].sort((a, b) => a.position - b.position).find((step) => step.position > completedPosition && step.status === "waiting");
}
