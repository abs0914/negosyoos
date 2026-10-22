import type { OfflineLease, PosCommandEnvelope, PosCommandResult, SyncBatchResponse } from "@negosyo-os/pos-sync";

const DATABASE_NAME = "negosyo-pos";
const DATABASE_VERSION = 1;
const ACK_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

type LocalCommandStatus = "queued" | "syncing" | "applied" | "duplicate" | "conflict" | "rejected" | "quarantined";

export interface LocalRegisterState extends OfflineLease {
  businessId: string;
  branchId: string;
  branchCode: string;
  inventoryLocationId: string;
  clientSessionId: string;
  nextSequence: number;
  updatedAt: string;
}

export interface LocalPosCommand {
  commandId: string;
  businessId: string;
  occurredAt: string;
  status: LocalCommandStatus;
  envelope: PosCommandEnvelope;
  result?: PosCommandResult;
  acknowledgedAt?: string;
}

interface StoredValue<T> { key: string; value: T }
interface ApiSuccess<T> { ok: true; data: T }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("metadata")) database.createObjectStore("metadata", { keyPath: "key" });
      if (!database.objectStoreNames.contains("commands")) {
        const commands = database.createObjectStore("commands", { keyPath: "commandId" });
        commands.createIndex("business_status", ["businessId", "status"]);
        commands.createIndex("business_occurred", ["businessId", "occurredAt"]);
      }
      if (!database.objectStoreNames.contains("carts")) database.createObjectStore("carts", { keyPath: "key" });
      if (!database.objectStoreNames.contains("catalogs")) database.createObjectStore("catalogs", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline database could not be opened."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline database operation failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Offline transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Offline transaction was aborted."));
  });
}

const registerKey = (businessId: string, locationId: string) => `register:${businessId}:${locationId}`;
const cartKey = (businessId: string, locationId: string) => `cart:${businessId}:${locationId}`;
const catalogKey = (businessId: string, locationId: string) => `catalog:${businessId}:${locationId}`;

async function getMetadata<T>(key: string): Promise<T | null> {
  const database = await openDatabase();
  const transaction = database.transaction("metadata", "readonly");
  const row = await requestResult(transaction.objectStore("metadata").get(key)) as StoredValue<T> | undefined;
  return row?.value ?? null;
}

async function putMetadata<T>(key: string, value: T): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("metadata", "readwrite");
  transaction.objectStore("metadata").put({ key, value } satisfies StoredValue<T>);
  await transactionDone(transaction);
}

export async function requestPersistentPosStorage(): Promise<boolean> {
  if (!("storage" in navigator) || !("persist" in navigator.storage)) return false;
  return navigator.storage.persist();
}

export async function initializeLocalRegister(input: {
  businessId: string; branchId: string; branchCode: string; inventoryLocationId: string; openingCash?: number;
}): Promise<LocalRegisterState> {
  const key = registerKey(input.businessId, input.inventoryLocationId);
  const stored = await getMetadata<LocalRegisterState>(key);
  const leaseIsUsable = stored && new Date(stored.leaseExpiresAt).getTime() > Date.now();
  if (!navigator.onLine) {
    if (!leaseIsUsable) throw new Error("This register must reconnect before it can record offline sales.");
    return stored;
  }
  const registerId = stored?.registerId ?? crypto.randomUUID();
  const clientSessionId = stored?.clientSessionId ?? crypto.randomUUID();
  const response = await fetch(`/api/businesses/${input.businessId}/pos/bootstrap`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ registerId, branchId: input.branchId, inventoryLocationId: input.inventoryLocationId, deviceName: deviceName(), clientSessionId, openingCash: input.openingCash ?? 0 }),
  });
  const payload = await response.json() as ApiSuccess<OfflineLease> | { ok: false; error?: { message?: string } };
  if (!response.ok || !payload.ok) throw new Error(!payload.ok ? payload.error?.message ?? "Register initialization failed." : "Register initialization failed.");
  const state: LocalRegisterState = {
    ...payload.data, businessId: input.businessId, branchId: input.branchId, branchCode: input.branchCode.toUpperCase(),
    inventoryLocationId: input.inventoryLocationId, clientSessionId, nextSequence: stored?.nextSequence ?? 1, updatedAt: new Date().toISOString(),
  };
  await putMetadata(key, state);
  void requestPersistentPosStorage();
  return state;
}

function deviceName(): string {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "POS device";
  return `${platform} register`.slice(0, 120);
}

export async function enqueueSaleCommand(input: {
  register: LocalRegisterState;
  customerId: string | null;
  lines: Array<{ productVariantId: string; quantity: number; discountAmount: number }>;
  payments: Array<{ method: "cash" | "digital"; amount: number; reference: string }>;
}): Promise<LocalPosCommand> {
  const database = await openDatabase();
  const transaction = database.transaction(["metadata", "commands"], "readwrite", { durability: "strict" });
  const metadata = transaction.objectStore("metadata");
  const commands = transaction.objectStore("commands");
  const key = registerKey(input.register.businessId, input.register.inventoryLocationId);
  const row = await requestResult(metadata.get(key)) as StoredValue<LocalRegisterState> | undefined;
  const current = row?.value ?? input.register;
  const sequence = current.nextSequence;
  const occurredAt = new Date().toISOString();
  const commandId = crypto.randomUUID();
  const provisionalReceiptNumber = `OFF-${current.branchCode}-${current.registerCode}-${String(sequence).padStart(6, "0")}`;
  const envelope: PosCommandEnvelope = {
    businessId: current.businessId, commandId, schemaVersion: 1, registerId: current.registerId, sessionId: current.sessionId,
    occurredAt, mode: navigator.onLine ? "online" : "offline", ...(navigator.onLine ? {} : { leaseToken: current.leaseToken }),
    payload: { type: "sale.complete", branchId: current.branchId, inventoryLocationId: current.inventoryLocationId, customerId: input.customerId,
      provisionalReceiptNumber, lines: input.lines, payments: input.payments },
  };
  const command: LocalPosCommand = { commandId, businessId: current.businessId, occurredAt, status: "queued", envelope };
  metadata.put({ key, value: { ...current, nextSequence: sequence + 1, updatedAt: occurredAt } });
  commands.add(command);
  await transactionDone(transaction);
  await requestBackgroundSync();
  return command;
}

export async function enqueueRegisterClose(register: LocalRegisterState, actualCash: number): Promise<LocalPosCommand> {
  const commandId = crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const envelope: PosCommandEnvelope = {
    businessId: register.businessId, commandId, schemaVersion: 1, registerId: register.registerId, sessionId: register.sessionId,
    occurredAt, mode: navigator.onLine ? "online" : "offline", ...(navigator.onLine ? {} : { leaseToken: register.leaseToken }),
    payload: { type: "register.close", branchId: register.branchId, inventoryLocationId: register.inventoryLocationId, actualCash },
  };
  const command: LocalPosCommand = { commandId, businessId: register.businessId, occurredAt, status: "queued", envelope };
  const database = await openDatabase();
  const transaction = database.transaction("commands", "readwrite", { durability: "strict" });
  transaction.objectStore("commands").add(command);
  await transactionDone(transaction);
  await requestBackgroundSync();
  return command;
}

export async function syncPendingCommands(businessId: string): Promise<PosCommandResult[]> {
  if (!navigator.onLine) return [];
  const database = await openDatabase();
  const read = database.transaction("commands", "readonly");
  const all = await requestResult(read.objectStore("commands").getAll()) as LocalPosCommand[];
  const pending = all.filter((command) => command.businessId === businessId && command.status === "queued").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).slice(0, 50);
  if (!pending.length) { await purgeAcknowledgedCommands(database); return []; }
  await updateStatuses(database, pending.map((command) => command.commandId), "syncing");
  try {
    const response = await fetch(`/api/businesses/${businessId}/pos/sync`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commands: pending.map((command) => command.envelope) }) });
    const payload = await response.json() as ApiSuccess<SyncBatchResponse> | { ok: false; error?: { message?: string } };
    if (!response.ok || !payload.ok) throw new Error(!payload.ok ? payload.error?.message ?? "Synchronization failed." : "Synchronization failed.");
    const transaction = database.transaction("commands", "readwrite");
    const store = transaction.objectStore("commands");
    for (const result of payload.data.results) {
      const current = pending.find((command) => command.commandId === result.commandId);
      if (current) store.put({ ...current, status: result.status, result, acknowledgedAt: ["applied", "duplicate"].includes(result.status) ? new Date().toISOString() : undefined });
    }
    await transactionDone(transaction);
    await purgeAcknowledgedCommands(database);
    return payload.data.results;
  } catch (error) {
    await updateStatuses(database, pending.map((command) => command.commandId), "queued");
    throw error;
  }
}

async function updateStatuses(database: IDBDatabase, ids: string[], status: LocalCommandStatus) {
  const transaction = database.transaction("commands", "readwrite");
  const store = transaction.objectStore("commands");
  for (const id of ids) {
    const current = await requestResult(store.get(id)) as LocalPosCommand | undefined;
    if (current) store.put({ ...current, status });
  }
  await transactionDone(transaction);
}

async function purgeAcknowledgedCommands(database: IDBDatabase) {
  const transaction = database.transaction("commands", "readwrite");
  const store = transaction.objectStore("commands");
  const all = await requestResult(store.getAll()) as LocalPosCommand[];
  const cutoff = Date.now() - ACK_RETENTION_MS;
  for (const command of all) if (command.acknowledgedAt && new Date(command.acknowledgedAt).getTime() < cutoff) store.delete(command.commandId);
  await transactionDone(transaction);
}

export async function getQueueSummary(businessId: string) {
  const database = await openDatabase();
  const transaction = database.transaction("commands", "readonly");
  const all = await requestResult(transaction.objectStore("commands").getAll()) as LocalPosCommand[];
  const scoped = all.filter((command) => command.businessId === businessId);
  return { pending: scoped.filter((command) => ["queued", "syncing"].includes(command.status)).length, issues: scoped.filter((command) => ["conflict", "rejected", "quarantined"].includes(command.status)).length, commands: scoped.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) };
}

export async function saveCart<T>(businessId: string, locationId: string, cart: T): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("carts", "readwrite");
  transaction.objectStore("carts").put({ key: cartKey(businessId, locationId), value: cart, updatedAt: new Date().toISOString() });
  await transactionDone(transaction);
}

export async function loadCart<T>(businessId: string, locationId: string): Promise<{ value: T; updatedAt: string } | null> {
  const database = await openDatabase();
  const transaction = database.transaction("carts", "readonly");
  const row = await requestResult(transaction.objectStore("carts").get(cartKey(businessId, locationId))) as { value: T; updatedAt: string } | undefined;
  return row ?? null;
}

export async function saveCatalog<T>(businessId: string, locationId: string, revision: string, items: T): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("catalogs", "readwrite");
  transaction.objectStore("catalogs").put({ key: catalogKey(businessId, locationId), revision, items, updatedAt: new Date().toISOString() });
  await transactionDone(transaction);
}

async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const syncRegistration = registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
  await syncRegistration.sync?.register("negosyo-pos-sync").catch(() => undefined);
}
