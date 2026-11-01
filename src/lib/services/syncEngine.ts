/**
 * Offline sync engine: processes one pushed mutation at a time (docs/sync-contract.md §3).
 *
 * Guarantees (each covered by tests/integration/syncEngine.test.ts):
 *  - Every result carries the real `clientMutationId` (set here, never by a handler) plus code, message, retryable.
 *  - A `SyncMutation` row is written, in the same transaction as the change, only for APPLIED. CONFLICT and
 *    REJECTED/retryable:false are remembered too (nothing else was written). REJECTED/retryable:true and
 *    PROCESSING_ERROR are NEVER remembered, so the retry runs again instead of coming back as DUPLICATE.
 *  - A remembered mutation answers with its ORIGINAL status and code. Only a stored APPLIED becomes DUPLICATE.
 *  - Anything but APPLIED rolls the handler's writes back.
 *  - Idempotency is per user: someone else's clientMutationId is rejected, never echoed.
 */

import { Prisma, type SyncMutation } from "@prisma/client";
import { prisma } from "../prisma";
import {
  ENTITY_CONTRACT,
  isPushEntity,
  type EntityContract,
  type PushEntity,
} from "../contract/syncContract";
import { isClientLotState, isClientPushableLotState } from "../domain/lotStatusMapping";
import type { SyncRole } from "../auth/getAuthSyncActor";
import {
  handleBatchHandover,
  handleConsent,
  handleCoverageRequest,
  handleDealerComparison,
  handleDispute,
  handleHandover,
  handleIncident,
  handleLot,
  handleLotImage,
  handlePayment,
  handlePickupRequest,
  handlePricePoint,
  handleProfile,
  handleQuizResult,
  handleRating,
  type HandlerContext,
  type HandlerResult,
} from "./syncHandlers";
import type { WirePayload } from "@/lib/contract/wirePayload";

export interface SyncMutationInput {
  clientMutationId: string;
  entity: string;
  entityId: string;
  op: "create" | "update";
  payload: WirePayload;
  clientTimestamp: string;
}

export interface SyncMutationResult {
  clientMutationId: string;
  status: "APPLIED" | "DUPLICATE" | "CONFLICT" | "REJECTED";
  code: string;
  message: string;
  retryable: boolean;
  canonicalId?: string;
  serverState?: Record<string, unknown>;
}

export interface SyncActorContext {
  userId: string;
  role: SyncRole;
  collector: { id: string; shortCode: string; operatingArea: string } | null;
  deviceId: string;
}

/** REJECTED codes that mean "try again later". Also how legacy rows persisted by the old engine are recognised. */
export const RETRYABLE_REJECT_CODES: ReadonlySet<string> = new Set(["PARENT_LOT_NOT_FOUND", "PROCESSING_ERROR"]);

const ENTITY_PRIORITY: Record<string, number> = {
  profile: 0,
  lot: 1,
  lot_image: 2,
  dealer_comparison: 3,
  handover: 4,
  batch_handover: 5,
  payment: 6,
  price_point: 7,
  consent: 8,
  pickup_request: 9,
  coverage_request: 10,
  dispute: 11,
  incident: 12,
  quiz_result: 14,
  rating: 15,
};

/**
 * Sorts batch mutations:
 * 1. Parents first (entity priority)
 * 2. Creates before updates
 * 3. By clientTimestamp ascending
 */
export function sortMutations(mutations: SyncMutationInput[]): SyncMutationInput[] {
  return [...mutations].sort((a, b) => {
    const prioA = ENTITY_PRIORITY[a.entity.toLowerCase()] ?? 99;
    const prioB = ENTITY_PRIORITY[b.entity.toLowerCase()] ?? 99;
    if (prioA !== prioB) return prioA - prioB;

    if (a.op !== b.op) {
      return a.op === "create" ? -1 : 1;
    }

    const timeA = new Date(a.clientTimestamp || 0).getTime() || 0;
    const timeB = new Date(b.clientTimestamp || 0).getTime() || 0;
    return timeA - timeB;
  });
}

// ---------- result helpers ----------

export function isPersistable(r: { status: string; retryable: boolean }): boolean {
  if (r.status === "APPLIED" || r.status === "CONFLICT") return true;
  return r.status === "REJECTED" && r.retryable === false;
}

function finalize(clientMutationId: string, h: HandlerResult): SyncMutationResult {
  const retryable = h.status === "REJECTED" ? h.retryable === true : false;
  return {
    clientMutationId,
    status: h.status,
    code: h.code ?? (h.status === "APPLIED" ? "OK" : h.status === "CONFLICT" ? "CONFLICT" : "REJECTED"),
    message: h.message ?? (h.status === "APPLIED" ? "Applied" : "Not applied"),
    retryable,
    ...(h.canonicalId ? { canonicalId: h.canonicalId } : {}),
    ...(h.serverState ? { serverState: h.serverState } : {}),
  };
}

const reject = (code: string, message: string, retryable = false): HandlerResult => ({ status: "REJECTED", code, message, retryable });

/** Rebuilds the answer for a mutation we already processed. Only a stored APPLIED turns into DUPLICATE. */
function replayStored(stored: SyncMutation): SyncMutationResult {
  const id = stored.id;
  if (stored.status === "REJECTED") {
    return finalize(id, reject(stored.resultCode ?? "REJECTED", stored.resultMessage ?? "Rejected", false));
  }
  if (stored.status === "CONFLICT") {
    let serverState: Record<string, unknown> | undefined;
    if (stored.error) {
      try {
        serverState = JSON.parse(stored.error);
      } catch {
        serverState = undefined;
      }
    }
    return finalize(id, {
      status: "CONFLICT",
      code: stored.resultCode ?? "CONFLICT",
      message: stored.resultMessage ?? "Conflict",
      serverState,
    });
  }
  return finalize(id, {
    status: "DUPLICATE",
    code: "ALREADY_PROCESSED",
    message: "Mutation was previously processed",
    canonicalId: stored.canonicalId ?? undefined,
  });
}

// ---------- payload normalisation & validation ----------

const PAYMENT_STATUS_WARNING = "paymentStatus";

/**
 * Tolerates what older app builds send, before strict validation:
 *  - redundant ids (`id`, and `lotId` on lot/handover updates) equal to entityId are dropped;
 *  - lot `paymentStatus` is ignored with a warning (the server derives it from Payment rows);
 *  - handover `handoverLat/handoverLng/accuracyM` become `latitude/longitude/accuracy`; `spoofingFlags` containing
 *    a mock-location marker becomes `mockLocationFlag`; `geoFlag` and `spoofingFlags` are dropped (the server
 *    computes its own location proof);
 *  - `localPath` / `imagePath` (phone-only file paths) are dropped.
 */
export function normalizePayload(
  entity: string,
  op: "create" | "update",
  entityId: string,
  input: WirePayload
): { payload: WirePayload; warnings: string[] } {
  const payload: WirePayload = { ...input };
  const warnings: string[] = [];

  if (op === "update" && payload.id === entityId) delete payload.id;
  if (entity === "lot" && op === "update" && payload.lotId === entityId) delete payload.lotId;
  if (entity === "handover" && op === "update") delete payload.lotId;
  if (entity === "lot" && payload.paymentStatus !== undefined) {
    delete payload.paymentStatus;
    warnings.push(PAYMENT_STATUS_WARNING);
  }
  if (entity === "handover") {
    if (payload.handoverLat !== undefined) payload.latitude ??= payload.handoverLat;
    if (payload.handoverLng !== undefined) payload.longitude ??= payload.handoverLng;
    if (payload.accuracyM !== undefined) payload.accuracy ??= payload.accuracyM;
    if (payload.spoofingFlags !== undefined && payload.mockLocationFlag === undefined) {
      const raw = typeof payload.spoofingFlags === "string" ? payload.spoofingFlags : JSON.stringify(payload.spoofingFlags);
      if (/mock/i.test(raw)) payload.mockLocationFlag = true;
    }
    for (const k of ["handoverLat", "handoverLng", "accuracyM", "geoFlag", "spoofingFlags"]) delete payload[k];
  }
  if (entity === "lot_image") delete payload.localPath;
  return { payload, warnings };
}

type Validated = { ok: true; payload: WirePayload; warnings: string[] } | { ok: false; result: HandlerResult };

function validateMutation(m: SyncMutationInput): Validated {
  if (!isPushEntity(m.entity)) {
    return { ok: false, result: reject("UNKNOWN_ENTITY", `Entity '${m.entity}' is not supported`) };
  }
  const contract: EntityContract = ENTITY_CONTRACT[m.entity as PushEntity];
  if (!contract.ops.includes(m.op)) {
    return { ok: false, result: reject("INVALID_OP", `'${m.op}' is not allowed for entity '${m.entity}'`) };
  }

  const { payload, warnings } = normalizePayload(m.entity, m.op, m.entityId, m.payload);

  for (const field of contract.serverOwned) {
    if (payload[field] !== undefined && payload[field] !== null) {
      return { ok: false, result: reject("FORBIDDEN_FIELD", `Client cannot set server-owned field '${field}'`) };
    }
  }
  if (m.entity === "lot" && isClientLotState(payload.transactionStatus) && !isClientPushableLotState(payload.transactionStatus)) {
    return { ok: false, result: reject("FORBIDDEN_FIELD", `transactionStatus '${payload.transactionStatus}' is set by the server`) };
  }
  if (m.entity === "handover" && m.op === "update" && ["CONFIRMED", "WEIGHED", "REJECTED"].includes(payload.status)) {
    return { ok: false, result: reject("FORBIDDEN_FIELD", `Handover status '${payload.status}' is set by the server`) };
  }

  const schema = m.op === "create" ? contract.create : contract.update;
  if (!schema) return { ok: false, result: reject("INVALID_OP", `'${m.op}' is not allowed for entity '${m.entity}'`) };
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return { ok: false, result: reject("INVALID_PAYLOAD", `${where}${issue.message}`) };
  }
  if (typeof payload.id === "string" && payload.id !== m.entityId) {
    return { ok: false, result: reject("INVALID_PAYLOAD", "payload.id must equal entityId") };
  }
  return { ok: true, payload: parsed.data as WirePayload, warnings };
}

const HANDLERS: Record<PushEntity, (c: HandlerContext) => Promise<HandlerResult>> = {
  lot: handleLot,
  lot_image: handleLotImage,
  handover: handleHandover,
  batch_handover: handleBatchHandover,
  payment: handlePayment,
  price_point: handlePricePoint,
  consent: handleConsent,
  pickup_request: handlePickupRequest,
  coverage_request: handleCoverageRequest,
  dispute: handleDispute,
  incident: handleIncident,
  quiz_result: handleQuizResult,
  rating: handleRating,
  profile: handleProfile,
  dealer_comparison: handleDealerComparison,
};

// ---------- persistence ----------

/** Thrown inside the transaction to roll back a non-APPLIED handler outcome while keeping its result. */
class RollbackWithResult extends Error {
  constructor(public readonly result: HandlerResult) {
    super("rollback");
  }
}

function syncMutationData(m: SyncMutationInput, ctx: SyncActorContext, clientTime: Date, r: SyncMutationResult): Prisma.SyncMutationUncheckedCreateInput {
  return {
    id: m.clientMutationId,
    deviceId: ctx.deviceId,
    userId: ctx.userId,
    entity: m.entity,
    entityId: m.entityId,
    op: m.op,
    payload: (m.payload ?? {}) as Prisma.InputJsonValue,
    clientTimestamp: clientTime,
    status: r.status,
    resultCode: r.code,
    resultMessage: r.message,
    canonicalId: r.canonicalId,
    error: r.serverState ? JSON.stringify(r.serverState) : undefined,
  };
}

async function findStored(id: string): Promise<SyncMutation | null> {
  return prisma.syncMutation.findUnique({ where: { id } });
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Persist a non-APPLIED, remember-worthy outcome (its handler writes were rolled back). */
async function rememberOutcome(m: SyncMutationInput, ctx: SyncActorContext, clientTime: Date, r: SyncMutationResult): Promise<void> {
  try {
    await prisma.syncMutation.create({ data: syncMutationData(m, ctx, clientTime, r) });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // A concurrent request stored it first; both outcomes are the same decision.
  }
}

/**
 * Process a single mutation. The returned result always has the real `clientMutationId`.
 */
export async function processMutation(mutation: SyncMutationInput, ctx: SyncActorContext): Promise<SyncMutationResult> {
  const id = mutation.clientMutationId;
  const clientTime = new Date(mutation.clientTimestamp);
  const safeTime = Number.isNaN(clientTime.getTime()) ? new Date() : clientTime;

  try {
    // 1. Already processed?
    let stored = await findStored(id);
    if (stored && stored.userId !== ctx.userId) {
      return finalize(id, reject("MUTATION_ID_IN_USE", "This clientMutationId belongs to another account"));
    }
    if (stored && stored.status === "REJECTED" && RETRYABLE_REJECT_CODES.has(stored.resultCode ?? "")) {
      // Persisted by the old engine although it was retryable: that outcome was never final. Forget it and run again.
      await prisma.syncMutation.delete({ where: { id } });
      stored = null;
    }
    if (stored) return replayStored(stored);

    // 2. Validate entity / op / payload
    const validated = validateMutation(mutation);
    if (!validated.ok) {
      const r = finalize(id, validated.result);
      if (isPersistable(r)) await rememberOutcome(mutation, ctx, safeTime, r);
      return r;
    }

    // 3. Run the handler in one transaction
    const handler = HANDLERS[mutation.entity as PushEntity];
    let result: SyncMutationResult;
    try {
      result = await prisma.$transaction(async (tx) => {
        const handled = await handler({
          tx,
          userId: ctx.userId,
          role: ctx.role,
          collector: ctx.collector,
          entityId: mutation.entityId,
          op: mutation.op,
          payload: validated.payload,
          clientTime: safeTime,
        });
        if (handled.status !== "APPLIED") throw new RollbackWithResult(handled);

        const r = finalize(id, validated.warnings.length > 0 ? withWarnings(handled, validated.warnings) : handled);
        await tx.syncMutation.create({ data: syncMutationData(mutation, ctx, safeTime, r) });
        return r;
      });
    } catch (err) {
      if (err instanceof RollbackWithResult) {
        const r = finalize(id, err.result);
        if (isPersistable(r)) await rememberOutcome(mutation, ctx, safeTime, r);
        return r;
      }
      if (isUniqueViolation(err)) {
        // Same clientMutationId raced us (or another unique key collided): answer from what is stored now.
        const raced = await findStored(id);
        if (raced && raced.userId === ctx.userId) return replayStored(raced);
      }
      throw err;
    }
    return result;
  } catch (err) {
    console.error(`sync: processing ${mutation.entity}.${mutation.op} ${id} failed`, err);
    return finalize(id, reject("PROCESSING_ERROR", "Could not process this change right now; it will be retried", true));
  }
}

function withWarnings(h: HandlerResult, warnings: string[]): HandlerResult {
  return {
    ...h,
    code: "IGNORED_SERVER_OWNED_FIELD",
    message: `Applied; ignored server-owned field(s): ${warnings.join(", ")}`,
  };
}
