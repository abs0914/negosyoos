import "server-only";

import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { createClient, type ServerSupabaseClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json } from "@negosyo-os/database";

import type { ApprovalAuditRecord, ApprovalDecision, ApprovalRequest, ApprovalRequestWithDetails, ApprovalStep } from "./models";
import { ApprovalIdSchema, CancelApprovalInputSchema, CreateApprovalRequestInputSchema, DecideApprovalInputSchema, type CancelApprovalInput, type CreateApprovalRequestInput, type DecideApprovalInput } from "./schemas";

type RequestRow = { id:string; organization_id:string; category:string; title:string; description:string|null; source_object_definition_id:string|null; source_record_id:string|null; workflow_execution_step_id:string|null; requester_id:string; status:string; current_step_position:number; total_steps:number; completed_at:string|null; cancelled_by:string|null; cancellation_reason:string|null; created_at:string; updated_at:string };
type StepRow = { id:string; organization_id:string; approval_request_id:string; key:string; name:string; position:number; approver_type:string; approver_user_id:string|null; approver_role_key:string|null; status:string; activated_at:string|null; completed_at:string|null; created_at:string; updated_at:string };
type DecisionRow = { id:string; organization_id:string; approval_request_id:string; approval_step_id:string; decision:string; comment:string|null; decided_by:string; decided_at:string };
type AuditRow = { id:string; organization_id:string; approval_request_id:string; approval_step_id:string|null; event:string; actor_id:string; details:Json; created_at:string };

function databaseError(message:string, error:unknown) { return new AppError({ code:ERROR_CODES.internal, message, status:500, cause:error, expose:false }); }
function mutationError(error:{ code?:string; message?:string }) {
  if (error.code === "42501") return new AppError({ code:ERROR_CODES.permissionDenied, message:"You cannot perform this approval action.", status:403, cause:error });
  if (["22023","P0001","23505"].includes(error.code ?? "")) return new AppError({ code:ERROR_CODES.validationFailed, message:error.message ?? "The approval action is invalid.", status:400, cause:error });
  return databaseError("The approval action failed.", error);
}
function object(value:Json):Readonly<Record<string,unknown>> { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function mapRequest(row:RequestRow):ApprovalRequest { return { id:row.id,businessId:row.organization_id,category:row.category as ApprovalRequest["category"],title:row.title,description:row.description,sourceObjectDefinitionId:row.source_object_definition_id,sourceRecordId:row.source_record_id,workflowExecutionStepId:row.workflow_execution_step_id,requesterId:row.requester_id,status:row.status as ApprovalRequest["status"],currentStepPosition:row.current_step_position,totalSteps:row.total_steps,completedAt:row.completed_at,cancelledBy:row.cancelled_by,cancellationReason:row.cancellation_reason,createdAt:row.created_at,updatedAt:row.updated_at }; }
function mapStep(row:StepRow):ApprovalStep { return { id:row.id,businessId:row.organization_id,approvalRequestId:row.approval_request_id,key:row.key,name:row.name,position:row.position,approverType:row.approver_type as ApprovalStep["approverType"],approverUserId:row.approver_user_id,approverRoleKey:row.approver_role_key,status:row.status as ApprovalStep["status"],activatedAt:row.activated_at,completedAt:row.completed_at,createdAt:row.created_at,updatedAt:row.updated_at }; }
function mapDecision(row:DecisionRow):ApprovalDecision { return { id:row.id,businessId:row.organization_id,approvalRequestId:row.approval_request_id,approvalStepId:row.approval_step_id,decision:row.decision as ApprovalDecision["decision"],comment:row.comment,decidedBy:row.decided_by,decidedAt:row.decided_at }; }
function mapAudit(row:AuditRow):ApprovalAuditRecord { return { id:row.id,businessId:row.organization_id,approvalRequestId:row.approval_request_id,approvalStepId:row.approval_step_id,event:row.event as ApprovalAuditRecord["event"],actorId:row.actor_id,details:object(row.details),createdAt:row.created_at }; }
async function requireApprovalReader(businessId:string, client:ServerSupabaseClient) {
  const user=await requireAuthenticatedUser(client); const allowed=await Promise.all([PERMISSIONS.approvalRead,PERMISSIONS.approvalDecide,PERMISSIONS.approvalManage].map((permission)=>can(user,permission,{businessId},client)));
  if (!allowed.some(Boolean)) throw new AppError({ code:ERROR_CODES.permissionDenied,message:"You cannot view approvals.",status:403 }); return user;
}

export async function createApprovalRequest(businessId:string,input:CreateApprovalRequestInput):Promise<string> {
  const id=BusinessIdSchema.parse(businessId); const parsed=CreateApprovalRequestInputSchema.parse(input); const client=await createClient(); const user=await requireAuthenticatedUser(client);
  const permissions=parsed.workflowExecutionStepId ? [PERMISSIONS.approvalRequest,PERMISSIONS.workflowManage,PERMISSIONS.recordCreate,PERMISSIONS.recordUpdate] : [PERMISSIONS.approvalRequest,PERMISSIONS.workflowManage];
  const allowed=await Promise.all(permissions.map((permission)=>can(user,permission,{businessId:id},client))); if (!allowed.some(Boolean)) throw new AppError({ code:ERROR_CODES.permissionDenied,message:"You cannot request approvals.",status:403 });
  const { data,error }=await client.rpc("create_approval_request",{ requested_organization_id:id,requested_category:parsed.category,requested_title:parsed.title,requested_description:parsed.description,requested_source_object_definition_id:(parsed.sourceObjectDefinitionId ?? null) as string,requested_source_record_id:(parsed.sourceRecordId ?? null) as string,requested_workflow_execution_step_id:(parsed.workflowExecutionStepId ?? null) as string,requested_steps:parsed.steps as unknown as Json });
  if(error) throw mutationError(error); return ApprovalIdSchema.parse(data);
}
export async function listApprovalRequests(businessId:string):Promise<readonly ApprovalRequestWithDetails[]> {
  const id=BusinessIdSchema.parse(businessId); const client=await createClient(); await requireApprovalReader(id,client);
  const requests=await client.from("approval_requests").select("*").eq("organization_id",id).order("created_at",{ascending:false}).limit(100); if(requests.error) throw databaseError("Approvals could not be loaded.",requests.error);
  const ids=requests.data.map((row)=>row.id); const steps=ids.length ? await client.from("approval_steps").select("*").in("approval_request_id",ids).order("position") : {data:[],error:null}; if(steps.error) throw databaseError("Approval steps could not be loaded.",steps.error);
  return (requests.data as RequestRow[]).map((row)=>({request:mapRequest(row),steps:(steps.data as StepRow[]).filter((step)=>step.approval_request_id===row.id).map(mapStep),decisions:[],audit:[]}));
}
export async function getApprovalRequest(businessId:string,approvalId:string):Promise<ApprovalRequestWithDetails> {
  const id=BusinessIdSchema.parse(businessId); const requestId=ApprovalIdSchema.parse(approvalId); const client=await createClient(); await requireApprovalReader(id,client);
  const [request,steps,decisions,audit]=await Promise.all([
    client.from("approval_requests").select("*").eq("organization_id",id).eq("id",requestId).single(),
    client.from("approval_steps").select("*").eq("organization_id",id).eq("approval_request_id",requestId).order("position"),
    client.from("approval_decisions").select("*").eq("organization_id",id).eq("approval_request_id",requestId).order("decided_at"),
    client.from("approval_audit_history").select("*").eq("organization_id",id).eq("approval_request_id",requestId).order("created_at"),
  ]); if(request.error||steps.error||decisions.error||audit.error) throw databaseError("Approval could not be loaded.",request.error??steps.error??decisions.error??audit.error);
  return {request:mapRequest(request.data as RequestRow),steps:(steps.data as StepRow[]).map(mapStep),decisions:(decisions.data as DecisionRow[]).map(mapDecision),audit:(audit.data as AuditRow[]).map(mapAudit)};
}
export async function decideApproval(businessId:string,input:DecideApprovalInput):Promise<void> {
  const id=BusinessIdSchema.parse(businessId); const parsed=DecideApprovalInputSchema.parse(input); const client=await createClient(); await requireAuthenticatedUser(client);
  const {error}=await client.rpc("decide_approval",{requested_organization_id:id,requested_approval_request_id:parsed.approvalRequestId,requested_approval_step_id:parsed.approvalStepId,requested_decision:parsed.decision,requested_comment:parsed.comment}); if(error) throw mutationError(error);
}
export async function cancelApproval(businessId:string,input:CancelApprovalInput):Promise<void> {
  const id=BusinessIdSchema.parse(businessId); const parsed=CancelApprovalInputSchema.parse(input); const client=await createClient(); await requireAuthenticatedUser(client);
  const {error}=await client.rpc("cancel_approval",{requested_organization_id:id,requested_approval_request_id:parsed.approvalRequestId,requested_reason:parsed.reason}); if(error) throw mutationError(error);
}
