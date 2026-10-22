import { describe, expect, it, vi } from "vitest";
import type { ObjectRecord } from "@negosyo-os/objects";
import type { WorkflowDefinition, WorkflowExecution, WorkflowExecutionStep, WorkflowRuntimeAdapter } from "./models";
import { evaluateWorkflowConditions, executeWorkflow, workflowScheduleMatches } from "./runtime";

const record: ObjectRecord = { id: "10000000-0000-4000-8000-000000000001", businessId: "10000000-0000-4000-8000-000000000002", objectDefinitionId: "10000000-0000-4000-8000-000000000003", branchId: null, displayValue: "Quotation Q-1", attributes: { discount_percentage: 15, status: "draft" }, status: "active", createdBy: "10000000-0000-4000-8000-000000000004", updatedBy: "10000000-0000-4000-8000-000000000004", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const definition: WorkflowDefinition = { id: "10000000-0000-4000-8000-000000000005", businessId: record.businessId, key: "approve_large_discount", name: "Approve large discount", description: null, trigger: { type: "record.updated", objectDefinitionId: record.objectDefinitionId }, conditions: { logic: "all", conditions: [{ fieldKey: "discount_percentage", operator: "greater_than", value: 10 }] }, actions: [{ key: "manager_approval", name: "Store Manager approval", type: "request_approval", approverRoleKey: "manager", title: "Approve quotation discount", continueOnFailure: false }], retryPolicy: { maxAttempts: 3, backoffSeconds: 60 }, version: 1, status: "active", createdBy: record.createdBy, updatedBy: record.updatedBy, disabledAt: null, createdAt: record.createdAt, updatedAt: record.updatedAt };
const execution: WorkflowExecution = { id: "10000000-0000-4000-8000-000000000006", businessId: record.businessId, workflowDefinitionId: definition.id, workflowVersion: 1, triggerType: definition.trigger.type, sourceObjectDefinitionId: record.objectDefinitionId, sourceRecordId: record.id, idempotencyKey: "quotation-q1-v1", status: "running", attempt: 1, maxAttempts: 3, testRun: false, input: {}, errorCode: null, errorMessage: null, initiatedBy: record.updatedBy, startedAt: record.updatedAt, completedAt: null, nextRetryAt: null, createdAt: record.createdAt, updatedAt: record.updatedAt };
const step: WorkflowExecutionStep = { id: "10000000-0000-4000-8000-000000000007", businessId: record.businessId, executionId: execution.id, actionKey: "manager_approval", actionType: "request_approval", position: 0, status: "running", attempt: 1, input: {}, output: {}, errorCode: null, errorMessage: null, startedAt: record.updatedAt, completedAt: null, createdAt: record.createdAt, updatedAt: record.updatedAt };

describe("workflow runtime", () => {
  it("evaluates the approval example declaratively", () => expect(evaluateWorkflowConditions(definition.conditions, record)).toBe(true));
  it("executes actions once and returns an existing idempotent execution", async () => {
    const adapter: WorkflowRuntimeAdapter = { begin: vi.fn().mockResolvedValue({ execution, existing: false }), startStep: vi.fn().mockResolvedValue(step), perform: vi.fn().mockResolvedValue({ output: { approvalId: "a1" } }), completeStep: vi.fn(), failStep: vi.fn(), finish: vi.fn() };
    await executeWorkflow(definition, { sourceRecord: record, initiatedBy: record.updatedBy }, execution.idempotencyKey, adapter);
    expect(adapter.perform).toHaveBeenCalledOnce(); expect(adapter.finish).toHaveBeenCalledWith(execution, "succeeded");
    adapter.begin = vi.fn().mockResolvedValue({ execution: { ...execution, status: "succeeded" }, existing: true });
    await executeWorkflow(definition, { sourceRecord: record, initiatedBy: record.updatedBy }, execution.idempotencyKey, adapter);
    expect(adapter.perform).toHaveBeenCalledOnce();
  });
  it("records action failures and a failed execution", async () => {
    const failure = new Error("notification unavailable");
    const adapter: WorkflowRuntimeAdapter = { begin: vi.fn().mockResolvedValue({ execution, existing: false }), startStep: vi.fn().mockResolvedValue(step), perform: vi.fn().mockRejectedValue(failure), completeStep: vi.fn(), failStep: vi.fn(), finish: vi.fn() };
    await executeWorkflow(definition, { sourceRecord: record, initiatedBy: record.updatedBy }, "quotation-q1-v2", adapter);
    expect(adapter.failStep).toHaveBeenCalledWith(step, failure); expect(adapter.finish).toHaveBeenCalledWith(execution, "failed", failure);
  });
  it("does not replay a step that already succeeded before a retry", async () => {
    const adapter: WorkflowRuntimeAdapter = { begin: vi.fn().mockResolvedValue({ execution: { ...execution, attempt: 2 }, existing: false }), startStep: vi.fn().mockResolvedValue({ ...step, status: "succeeded" }), perform: vi.fn(), completeStep: vi.fn(), failStep: vi.fn(), finish: vi.fn() };
    await executeWorkflow(definition, { sourceRecord: record, initiatedBy: record.updatedBy }, "quotation-q1-retry", adapter);
    expect(adapter.perform).not.toHaveBeenCalled(); expect(adapter.finish).toHaveBeenCalledWith(expect.anything(), "succeeded");
  });
  it("matches five-part schedules in the Business timezone", () => {
    expect(workflowScheduleMatches("0 8 * * 1-5", new Date("2026-08-25T00:00:00Z"), "Asia/Manila")).toBe(true);
    expect(workflowScheduleMatches("0 9 * * 1-5", new Date("2026-08-25T00:00:00Z"), "Asia/Manila")).toBe(false);
  });
});
