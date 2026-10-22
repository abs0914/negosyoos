import "server-only";

import { requireAuthenticatedUser, requireCapability } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json, Tables } from "@negosyo-os/database";
import {
  OfflineLeaseSchema, PosCatalogSnapshotSchema, PosCommandEnvelopeSchema, PosCommandResultSchema,
  PosOperationsDashboardSchema, PosRegisterBootstrapInputSchema, ReconciliationCaseSchema,
  ResolveReconciliationSchema, SyncBatchRequestSchema, type PosCommandEnvelope,
  type PosCommandResult, type ReconciliationCase,
} from "./index";

type ReconciliationRow = Tables<"pos_reconciliation_cases">;
type AccessPermission = typeof PERMISSIONS.salesCreate | typeof PERMISSIONS.salesReconcile | typeof PERMISSIONS.auditRead;

function operationFailure(message: string, cause: unknown) {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

function commandFailure(commandId: string, error: { code?: string; message?: string }): PosCommandResult {
  const conflict = ["23505", "P0001"].includes(error.code ?? "");
  const rejected = ["22023", "42501"].includes(error.code ?? "");
  return PosCommandResultSchema.parse({
    status: conflict ? "conflict" : rejected ? "rejected" : "quarantined", commandId,
    errorCode: error.code ?? "unknown", message: rejected || conflict ? error.message ?? "Command could not be applied." : "Command was quarantined for review.",
    retryable: !conflict && !rejected,
  });
}

async function access(businessId: string, permission: AccessPermission, branchId?: string) {
  const id = BusinessIdSchema.parse(businessId);
  const client = await createClient();
  const user = await requireAuthenticatedUser(client);
  await requireCapability(user, permission, { businessId: id, ...(branchId ? { branchId } : {}) }, client);
  return { id, client };
}

export async function bootstrapPosRegister(businessId: string, input: unknown) {
  const parsed = PosRegisterBootstrapInputSchema.parse(input);
  const { id, client } = await access(businessId, PERMISSIONS.salesCreate, parsed.branchId);
  const { data, error } = await client.rpc("bootstrap_pos_register", {
    requested_organization_id: id, requested_register_id: parsed.registerId, requested_branch_id: parsed.branchId,
    requested_inventory_location_id: parsed.inventoryLocationId, requested_device_name: parsed.deviceName,
    requested_client_session_id: parsed.clientSessionId, requested_opening_cash: parsed.openingCash,
  });
  if (error) throw operationFailure("POS register could not be initialized.", error);
  return OfflineLeaseSchema.parse(data);
}

export async function processPosCommand(businessId: string, input: PosCommandEnvelope): Promise<PosCommandResult> {
  const command = PosCommandEnvelopeSchema.parse(input);
  const id = BusinessIdSchema.parse(businessId);
  if (command.businessId !== id) return commandFailure(command.commandId, { code: "42501", message: "Command Business does not match the route." });
  const { client } = await access(id, PERMISSIONS.salesCreate, command.payload.branchId);
  const started = performance.now();
  const { data, error } = await client.rpc("process_pos_command", {
    requested_organization_id: id, requested_command_id: command.commandId, requested_schema_version: command.schemaVersion,
    requested_register_id: command.registerId, requested_session_id: command.sessionId, requested_occurred_at: command.occurredAt,
    requested_mode: command.mode, requested_lease_token: command.leaseToken ?? "", requested_payload: command.payload as unknown as Json,
  });
  const durationMs = Math.round(performance.now() - started);
  if (error) {
    logger.warn("POS command failed", { businessId: id, commandId: command.commandId, mode: command.mode, durationMs, errorCode: error.code });
    return commandFailure(command.commandId, error);
  }
  logger.info("POS command applied", { businessId: id, commandId: command.commandId, mode: command.mode, durationMs });
  return PosCommandResultSchema.parse(data);
}

export async function syncPosCommands(businessId: string, input: unknown) {
  const batch = SyncBatchRequestSchema.parse(input);
  const results: PosCommandResult[] = [];
  for (const command of batch.commands) results.push(await processPosCommand(businessId, command));
  return { results, serverTime: new Date().toISOString() };
}

export async function getPosCatalogSnapshot(businessId: string, locationId: string, knownRevision?: string) {
  const id = BusinessIdSchema.parse(businessId);
  const client = await createClient();
  await requireAuthenticatedUser(client);
  const { data, error } = await client.rpc("pos_catalog_snapshot", {
    requested_organization_id: id,
    requested_location_id: locationId,
    ...(knownRevision === undefined ? {} : { requested_known_revision: knownRevision }),
  });
  if (error) throw operationFailure("POS catalog snapshot could not be loaded.", error);
  return PosCatalogSnapshotSchema.parse(data);
}

function reconciliation(row: ReconciliationRow): ReconciliationCase {
  return ReconciliationCaseSchema.parse({
    id: row.id, businessId: row.organization_id, branchId: row.branch_id, registerId: row.register_id,
    sessionId: row.register_session_id, saleId: row.sale_id, paymentId: row.payment_id, commandId: row.command_id,
    type: row.case_type, severity: row.severity, status: row.status, summary: row.summary, details: row.details,
    resolution: row.resolution, createdAt: row.created_at, resolvedAt: row.resolved_at,
  });
}

export async function listReconciliationCases(businessId: string, status: "open" | "resolved" | "dismissed" = "open") {
  const { id, client } = await access(businessId, PERMISSIONS.salesReconcile);
  const { data, error } = await client.from("pos_reconciliation_cases").select("*").eq("organization_id", id).eq("status", status).order("created_at", { ascending: false }).limit(200);
  if (error) throw operationFailure("Reconciliation cases could not be loaded.", error);
  return data.map(reconciliation);
}

export async function getPosOperationsDashboard(businessId: string) {
  const { id, client } = await access(businessId, PERMISSIONS.auditRead);
  const { data, error } = await client.rpc("pos_operations_dashboard", { requested_organization_id: id });
  if (error) throw operationFailure("POS operations could not be loaded.", error);
  return PosOperationsDashboardSchema.parse(data);
}

export async function resolveReconciliationCase(businessId: string, input: unknown) {
  const parsed = ResolveReconciliationSchema.parse(input);
  const { id, client } = await access(businessId, PERMISSIONS.salesReconcile);
  const { error } = await client.rpc("resolve_pos_reconciliation_case", {
    requested_organization_id: id, requested_case_id: parsed.caseId, requested_resolution: parsed.resolution, requested_disposition: parsed.disposition,
  });
  if (error) throw operationFailure("Reconciliation case could not be resolved.", error);
}
