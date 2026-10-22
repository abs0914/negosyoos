import type { ObjectAttributeValue, ObjectRecord } from "@negosyo-os/objects";
import type { WorkflowCondition, WorkflowConditionGroup, WorkflowDefinition, WorkflowRunContext, WorkflowRuntimeAdapter, WorkflowValue } from "./models";

function recordValue(record: ObjectRecord | undefined, fieldKey: string): ObjectAttributeValue | undefined {
  if (!record) return undefined;
  if (fieldKey === "record") return record.displayValue;
  if (fieldKey === "branch") return record.branchId;
  if (fieldKey === "created_at") return record.createdAt;
  if (fieldKey === "updated_at") return record.updatedAt;
  return record.attributes[fieldKey];
}
function stringArray(value: ObjectAttributeValue | undefined): value is readonly string[] { return Array.isArray(value); }
function empty(value: ObjectAttributeValue | undefined): boolean { return value === undefined || value === null || value === "" || (stringArray(value) && value.length === 0); }
export function evaluateWorkflowCondition(condition: WorkflowCondition, record: ObjectRecord | undefined): boolean {
  const actual = recordValue(record, condition.fieldKey); const expected = condition.value;
  switch (condition.operator) {
    case "is_empty": return empty(actual); case "not_empty": return !empty(actual);
    case "equals": return stringArray(actual) ? actual.includes(String(expected)) : actual === expected;
    case "not_equals": return stringArray(actual) ? !actual.includes(String(expected)) : actual !== expected;
    case "contains": return String(stringArray(actual) ? actual.join(" ") : actual ?? "").toLocaleLowerCase().includes(String(expected).toLocaleLowerCase());
    case "greater_than": return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "less_than": return typeof actual === "number" && typeof expected === "number" && actual < expected;
  }
}
export function evaluateWorkflowConditions(group: WorkflowConditionGroup, record: ObjectRecord | undefined): boolean {
  const results = group.conditions.map((condition) => evaluateWorkflowCondition(condition, record));
  return group.logic === "all" ? results.every(Boolean) : results.some(Boolean);
}
export function resolveWorkflowValue(value: WorkflowValue, context: WorkflowRunContext): ObjectAttributeValue | undefined {
  if (typeof value !== "object" || value === null || stringArray(value as ObjectAttributeValue)) return value as ObjectAttributeValue;
  if ("sourceFieldKey" in value) return recordValue(context.sourceRecord, value.sourceFieldKey);
  if (!("executionValue" in value)) return value as ObjectAttributeValue;
  if (value.executionValue === "initiated_by") return context.initiatedBy;
  if (value.executionValue === "source_record_id") return context.sourceRecord?.id;
  return context.sourceRecord?.branchId;
}
export function workflowTriggerMatches(definition: WorkflowDefinition, context: WorkflowRunContext): boolean {
  const trigger = definition.trigger;
  if (trigger.type === "manual" || trigger.type === "schedule") return true;
  if (context.sourceRecord?.objectDefinitionId !== trigger.objectDefinitionId) return false;
  if (trigger.type !== "record.status_changed") return true;
  const before = recordValue(context.previousRecord, trigger.fieldKey); const after = recordValue(context.sourceRecord, trigger.fieldKey);
  return before !== after && (trigger.from === undefined || before === trigger.from) && (trigger.to === undefined || after === trigger.to);
}
function cronPartMatches(part: string, value: number): boolean {
  return part.split(",").some((segment) => {
    if (segment === "*") return true;
    if (segment.startsWith("*/")) { const step = Number(segment.slice(2)); return Number.isInteger(step) && step > 0 && value % step === 0; }
    const [start, end] = segment.split("-").map(Number);
    return end === undefined ? start === value : Number.isInteger(start) && Number.isInteger(end) && value >= start! && value <= end;
  });
}
export function workflowScheduleMatches(cron: string, date: Date, timezone = "Asia/Manila"): boolean {
  const [minute, hour, day, month, weekday] = cron.trim().split(/\s+/); if (!minute || !hour || !day || !month || !weekday) return false;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, minute: "numeric", hour: "numeric", hourCycle: "h23", day: "numeric", month: "numeric", weekday: "short" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return cronPartMatches(minute, Number(part("minute"))) && cronPartMatches(hour, Number(part("hour"))) && cronPartMatches(day, Number(part("day"))) && cronPartMatches(month, Number(part("month"))) && cronPartMatches(weekday, weekdays[part("weekday")] ?? -1);
}
export async function executeWorkflow(definition: WorkflowDefinition, context: WorkflowRunContext, idempotencyKey: string, adapter: WorkflowRuntimeAdapter, testRun = false) {
  const begun = await adapter.begin(definition, context, idempotencyKey, testRun);
  if (begun.existing && (["running", "succeeded", "skipped"].includes(begun.execution.status) || (begun.execution.status === "failed" && begun.execution.attempt >= begun.execution.maxAttempts))) return begun.execution;
  if (!workflowTriggerMatches(definition, context) || !evaluateWorkflowConditions(definition.conditions, context.sourceRecord)) { await adapter.finish(begun.execution, "skipped"); return begun.execution; }
  try {
    for (const [position, action] of definition.actions.entries()) {
      const step = await adapter.startStep(begun.execution, action, position);
      if (step.status === "succeeded") continue;
      try { const result = testRun ? { output: { testRun: true, validated: true } } : await adapter.perform(action, definition, begun.execution, context); await adapter.completeStep(step, result); }
      catch (error) { await adapter.failStep(step, error); if (!action.continueOnFailure) throw error; }
    }
    await adapter.finish(begun.execution, "succeeded");
  } catch (error) { await adapter.finish(begun.execution, "failed", error); }
  return begun.execution;
}
