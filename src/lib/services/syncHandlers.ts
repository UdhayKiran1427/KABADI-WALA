/**
 * Per-entity handlers for POST /api/v1/sync/push (docs/sync-contract.md §7).
 *
 * Contract with the engine (syncEngine.ts):
 *  - A handler returns a `HandlerResult`, which has NO `clientMutationId`: the engine adds it, so no handler can
 *    return an empty one.
 *  - The engine has already validated entity, op and payload shape (ENTITY_CONTRACT) and rejected server-owned fields.
 *  - Handlers run inside one interactive transaction. Anything other than `APPLIED` rolls that transaction back, so a
 *    handler may write before it decides to reject without leaving partial state behind.
 *  - Creates are idempotent on the entity id: if the row already exists for the same owner the handler answers
 *    `APPLIED` without touching it; if it belongs to someone else the answer is `FORBIDDEN`.
 *  - Lot status is only ever written through lotStatusMapping + lotStateMachine.
 */

import { Prisma } from "@prisma/client";
import { validateLotRef } from "../domain/lotRef";
import { validateLotTransition } from "../domain/lotStateMachine";
import {
  findClientPath,
  toServerLotState,
  type ClientLotState,
} from "../domain/lotStatusMapping";
import { classifyLocationProof, incidentSeverity } from "../domain/handover";
import { checkDuplicatePhotoAnomaly, checkLocationAnomalies } from "../domain/anomalies";
import { validateStorageKey, storageObjectExists } from "../storage";
import { lotClientState, serializePullLot, type LotWithChildren } from "../contract/serializers";
import type { SyncRole } from "../auth/getAuthSyncActor";
import { amountPaise } from "@/lib/domain/money";

export type Tx = Prisma.TransactionClient;
type Payload = Record<string, any>;

export type MutationStatus = "APPLIED" | "DUPLICATE" | "CONFLICT" | "REJECTED";

export interface HandlerResult {
  status: MutationStatus;
  code?: string;
  message?: string;
  retryable?: boolean;
  canonicalId?: string;
  serverState?: Record<string, unknown>;
}

export interface HandlerContext {
  tx: Tx;
  userId: string;
  role: SyncRole;
  collector: { id: string; shortCode: string; operatingArea: string } | null;
  entityId: string;
  op: "create" | "update";
  payload: Payload;
  clientTime: Date;
}

const applied = (canonicalId: string, message = "Applied", code = "OK"): HandlerResult => ({
  status: "APPLIED",
  code,
  message,
  retryable: false,
  canonicalId,
});
const rejected = (code: string, message: string, retryable = false): HandlerResult => ({
  status: "REJECTED",
  code,
  message,
  retryable,
});
const conflict = (code: string, message: string, serverState?: Record<string, unknown>): HandlerResult => ({
  status: "CONFLICT",
  code,
  message,
  retryable: false,
  ...(serverState ? { serverState } : {}),
});

const RECYCLER_RATE_MAX_AGE_DAYS = 7;
const LOT_INCLUDE = { handovers: true, payments: true } as const;

// ---------- shared lookups ----------

type LotLookup = { lot: LotWithChildren; failure?: undefined } | { lot?: undefined; failure: HandlerResult };

async function loadOwnedLot(c: HandlerContext, lotId: unknown): Promise<LotLookup> {
  if (!c.collector) return { failure: rejected("FORBIDDEN_ROLE", "Only collectors can change lots") };
  if (typeof lotId !== "string" || lotId === "") return { failure: rejected("INVALID_PAYLOAD", "lotId is required") };
  const lot = await c.tx.lot.findUnique({ where: { id: lotId }, include: LOT_INCLUDE });
  if (!lot) return { failure: rejected("PARENT_LOT_NOT_FOUND", `Lot ${lotId} not found`, true) };
  if (lot.collectorId !== c.collector.id) return { failure: rejected("FORBIDDEN", "You do not own this lot") };
  return { lot };
}

const touchLot = (c: HandlerContext, lotId: string) =>
  c.tx.lot.update({ where: { id: lotId }, data: { updatedAt: new Date() } });

const toDate = (v: unknown): Date | undefined => (typeof v === "string" && v !== "" ? new Date(v) : undefined);

// ---------- lot ----------

export async function handleLot(c: HandlerContext): Promise<HandlerResult> {
  if (!c.collector) return rejected("FORBIDDEN_ROLE", "Only collectors can push lots");
  return c.op === "create" ? createLot(c, c.collector) : updateLot(c);
}

async function createLot(c: HandlerContext, collector: NonNullable<HandlerContext["collector"]>): Promise<HandlerResult> {
  const { tx, payload: p } = c;

  const existing = await tx.lot.findUnique({ where: { id: c.entityId } });
  if (existing) {
    if (existing.collectorId !== collector.id) return rejected("FORBIDDEN", "You do not own this lot");
    return applied(existing.id, "Lot already exists");
  }

  const refCheck = validateLotRef(p.lotRef, collector.shortCode);
  if (!refCheck.valid) return rejected("INVALID_LOT_REF", refCheck.reason ?? "Invalid lotRef");

  const sameRef = await tx.lot.findUnique({ where: { lotRef: p.lotRef }, include: LOT_INCLUDE });
  if (sameRef) {
    // Only reveal the other row to its own collector.
    const mine = sameRef.collectorId === collector.id;
    return conflict("DUPLICATE_LOT_REF", "Lot reference already exists", mine ? { ...serializePullLot(sameRef) } : undefined);
  }

  const category = await tx.materialCategory.findUnique({ where: { id: p.categoryId } });
  if (!category) return rejected("CATEGORY_NOT_FOUND", `Material category #${p.categoryId} does not exist`);

  const state = toServerLotState(p.transactionStatus as ClientLotState);
  const created = await tx.lot.create({
    data: {
      id: c.entityId,
      lotRef: p.lotRef,
      collectorId: collector.id,
      categoryId: p.categoryId,
      subCategory: p.subCategory ?? null,
      description: p.description ?? null,
      approxWeightGrams: p.approxWeightGrams,
      estimatedValuePaise: p.estimatedValuePaise ?? null,
      estimatedMinPaise: p.estimatedMinPaise ?? null,
      estimatedMaxPaise: p.estimatedMaxPaise ?? null,
      aiCategoryId: p.aiCategoryId ?? null,
      aiConfidence: p.aiConfidence ?? null,
      status: state.lotStatus,
      transactionStatus: state.transactionStatus,
      paymentStatus: "UNPAID",
      collectedAt: toDate(p.collectedAt) ?? c.clientTime,
      collectLat: p.collectLat ?? null,
      collectLng: p.collectLng ?? null,
      clientCreatedAt: c.clientTime,
      expiresAt: toDate(p.expiresAt) ?? null,
      soldBy: p.soldBy ?? null,
    },
  });
  return applied(created.id);
}

async function updateLot(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const found = await loadOwnedLot(c, c.entityId);
  if (found.failure) return found.failure;
  const lot = found.lot;
  const current = lotClientState(lot);
  const serverState = () => serializePullLot(lot) as unknown as Record<string, unknown>;

  const data: Prisma.LotUncheckedUpdateInput = {};
  const target = p.transactionStatus as ClientLotState | undefined;

  // --- state change: walk the client path, every step must also be legal on the server machine ---
  let nextStatus = lot.status;
  let nextTx = lot.transactionStatus;
  if (target && target !== current) {
    const path = findClientPath(current, target);
    if (!path) {
      return conflict("INVALID_STATE_TRANSITION", `Lot cannot go from ${current} to ${target}`, serverState());
    }
    let from = lot.status;
    for (const step of path) {
      const next = toServerLotState(step);
      const check = validateLotTransition(from, next.lotStatus, false);
      if (!check.valid) {
        return conflict("INVALID_STATE_TRANSITION", check.reason ?? `Lot cannot go from ${current} to ${target}`, serverState());
      }
      from = next.lotStatus;
    }
    const finalState = toServerLotState(target);
    nextStatus = finalState.lotStatus;
    nextTx = finalState.transactionStatus;
    data.status = nextStatus;
    data.transactionStatus = nextTx;
    if (target === "CANCELLED") {
      data.cancelReason = p.cancelReason ?? null;
      data.cancelledAt = toDate(p.cancelledAt) ?? c.clientTime;
    }
  }

  // --- plain field edits ---
  const editsFields =
    ["categoryId", "description", "approxWeightGrams", "estimatedValuePaise", "estimatedMinPaise", "estimatedMaxPaise", "chosenRecyclerId", "quotedRatePaise", "expectedValuePaise"].some((k) => p[k] !== undefined);
  const effective = target ?? current;
  if (editsFields && ["CONFIRMED", "PAID", "CANCELLED", "DISPUTED"].includes(effective)) {
    return rejected("LOT_LOCKED", `Lot is ${effective}; its details can no longer be edited`);
  }
  if (p.categoryId !== undefined) {
    const category = await tx.materialCategory.findUnique({ where: { id: p.categoryId } });
    if (!category) return rejected("CATEGORY_NOT_FOUND", `Material category #${p.categoryId} does not exist`);
    data.categoryId = p.categoryId;
  }
  if (p.description !== undefined) data.description = p.description;
  if (p.approxWeightGrams !== undefined) data.approxWeightGrams = p.approxWeightGrams;
  if (p.estimatedValuePaise !== undefined) data.estimatedValuePaise = p.estimatedValuePaise;
  if (p.estimatedMinPaise !== undefined) data.estimatedMinPaise = p.estimatedMinPaise;
  if (p.estimatedMaxPaise !== undefined) data.estimatedMaxPaise = p.estimatedMaxPaise;
  if (p.expectedValuePaise !== undefined) data.expectedValuePaise = p.expectedValuePaise;

  // --- choosing a recycler: the server checks the recycler and quotes from its own current rate ---
  if (p.chosenRecyclerId !== undefined) {
    const categoryId = (data.categoryId as number | undefined) ?? lot.categoryId;
    const weight = (data.approxWeightGrams as number | undefined) ?? lot.approxWeightGrams;
    const recycler = await tx.recycler.findUnique({
      where: { id: p.chosenRecyclerId },
      include: { rates: { where: { isCurrent: true, categoryId } } },
    });
    if (!recycler || recycler.authorizationStatus !== "VERIFIED") {
      return rejected("RECYCLER_NOT_AUTHORIZED", "Recycler is not verified or does not exist");
    }
    if (recycler.authorizationValidTill && new Date(recycler.authorizationValidTill) <= new Date()) {
      return rejected("RECYCLER_AUTHORIZATION_EXPIRED", "Recycler authorization has expired");
    }
    const rate = recycler.rates[0];
    if (!rate) return rejected("MATERIAL_NOT_ACCEPTED", "Recycler does not accept this material category");

    const quoted = p.quotedRatePaise ?? rate.ratePerKgPaise;
    const rateAgeDays = (Date.now() - new Date(rate.effectiveFrom).getTime()) / 86_400_000;
    if (quoted !== rate.ratePerKgPaise && rateAgeDays > RECYCLER_RATE_MAX_AGE_DAYS) {
      return conflict(
        "STALE_QUOTED_RATE",
        `Quoted rate ${quoted} paise/kg is outdated; current rate is ${rate.ratePerKgPaise} paise/kg`,
        { currentRatePerKgPaise: rate.ratePerKgPaise }
      );
    }
    data.chosenRecyclerId = recycler.id;
    data.quotedRatePaise = rate.ratePerKgPaise;
    data.expectedValuePaise = amountPaise(weight, rate.ratePerKgPaise);

    const collector = c.collector!;
    await tx.transaction.upsert({
      where: { lotId: lot.id },
      create: {
        id: `TX-${lot.id}`,
        lotId: lot.id,
        collectorId: collector.id,
        recyclerId: recycler.id,
        quotedRatePerKgPaise: rate.ratePerKgPaise,
        quotedPricePaise: data.expectedValuePaise as number,
        status: nextTx,
        paymentStatus: "UNPAID",
      },
      update: {
        recyclerId: recycler.id,
        quotedRatePerKgPaise: rate.ratePerKgPaise,
        quotedPricePaise: data.expectedValuePaise as number,
        status: nextTx,
      },
    });
  } else if (p.quotedRatePaise !== undefined) {
    // A rate without a recycler is meaningless; the server quotes from the recycler's rate card.
    return rejected("INVALID_PAYLOAD", "quotedRatePaise needs chosenRecyclerId");
  } else if (target && target !== current) {
    // State moved (e.g. cancelled / disputed): keep an existing transaction in step.
    await tx.transaction.updateMany({ where: { lotId: lot.id }, data: { status: nextTx } });
  }

  if (Object.keys(data).length === 0) return applied(lot.id, "No change");
  await tx.lot.update({ where: { id: lot.id }, data });
  return applied(lot.id);
}

// ---------- lot_image ----------

export async function handleLotImage(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const isTraining = p.kind === "TRAINING";

  if (isTraining && c.role !== "FIELD_AGENT") {
    return rejected("FORBIDDEN_ROLE", "Only field agents can push TRAINING photos");
  }
  let lotId: string | null = null;
  if (!isTraining) {
    const found = await loadOwnedLot(c, p.lotId);
    if (found.failure) return found.failure;
    lotId = found.lot.id;
  }

  if (!validateStorageKey(p.storageKey, c.userId)) {
    return rejected("INVALID_STORAGE_KEY", `storageKey must start with images/${c.userId}/`);
  }

  const existing = await tx.lotImage.findUnique({ where: { id: c.entityId } });
  if (existing) {
    if (!validateStorageKey(existing.storageKey, c.userId)) return rejected("FORBIDDEN", "You do not own this image");
    return applied(existing.id, "Image already exists");
  }

  let uploaded: boolean;
  try {
    uploaded = await storageObjectExists(p.storageKey);
  } catch {
    return rejected("PROCESSING_ERROR", "Storage is temporarily unavailable; try again", true);
  }
  if (!uploaded) return rejected("OBJECT_NOT_UPLOADED", "The photo file has not been uploaded yet; retry after the upload", true);

  if (isTraining) {
    const category = await tx.materialCategory.findUnique({ where: { id: p.categoryId } });
    if (!category) return rejected("CATEGORY_NOT_FOUND", `Material category #${p.categoryId} does not exist`);
  }

  // Same picture on a different lot (exact byte hash or exact perceptual hash) raises an anomaly flag.
  if (lotId && (p.sha256 || p.imageHash)) {
    const other = await tx.lotImage.findFirst({
      where: {
        lotId: { not: lotId },
        OR: [...(p.sha256 ? [{ sha256: p.sha256 }] : []), ...(p.imageHash ? [{ imageHash: p.imageHash }] : [])],
      },
    });
    if (other?.lotId) {
      const anomaly = checkDuplicatePhotoAnomaly(other.lotId, p.sha256 ?? p.imageHash);
      await tx.anomalyFlag.create({
        data: {
          type: anomaly.type,
          severity: anomaly.severity,
          reason: anomaly.reason,
          ruleCode: anomaly.ruleCode,
          lotId,
          detailsJson: JSON.stringify(anomaly.details),
        },
      });
    }
  }

  const image = await tx.lotImage.create({
    data: {
      id: c.entityId,
      lotId,
      kind: p.kind,
      storageKey: p.storageKey,
      sha256: p.sha256 ?? null,
      imageHash: p.imageHash ?? null,
      angle: p.angle ?? null,
      bytes: p.bytes ?? null,
      widthPx: p.widthPx ?? null,
      heightPx: p.heightPx ?? null,
      takenAt: toDate(p.takenAt) ?? c.clientTime,
    },
  });

  if (isTraining) {
    await tx.trainingSample.create({
      data: { imageId: image.id, categoryId: p.categoryId, labelSource: "FIELD_AGENT", labelConfidence: 1.0, capturedById: c.userId },
    });
  } else if (lotId) {
    await touchLot(c, lotId);
  }
  return applied(image.id);
}

// ---------- handover ----------

async function locationProof(tx: Tx, lot: LotWithChildren, loc: { latitude?: number; longitude?: number; accuracy?: number; mockLocationFlag?: boolean }) {
  const facility = lot.chosenRecyclerId ? await tx.recycler.findUnique({ where: { id: lot.chosenRecyclerId } }) : null;
  return classifyLocationProof(loc.latitude, loc.longitude, facility?.latitude, facility?.longitude, loc.accuracy, loc.mockLocationFlag);
}

export async function handleHandover(c: HandlerContext): Promise<HandlerResult> {
  return c.op === "create" ? createHandover(c) : updateHandover(c);
}

async function createHandover(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const found = await loadOwnedLot(c, p.lotId);
  if (found.failure) return found.failure;
  const lot = found.lot;

  const existing = await tx.handover.findUnique({ where: { id: c.entityId } });
  if (existing) {
    if (existing.lotId !== lot.id) return rejected("FORBIDDEN", "You do not own this handover");
    return applied(existing.id, "Handover already exists");
  }
  const sameRef = await tx.handover.findUnique({ where: { handoverRef: p.handoverRef } });
  if (sameRef) return conflict("DUPLICATE_HANDOVER_REF", "Handover reference already exists");

  const proof = await locationProof(tx, lot, p);
  // Handover.transactionId is unique: only the first handover of a lot can link to its transaction.
  const transaction = await tx.transaction.findUnique({ where: { lotId: lot.id }, include: { handover: true } });
  const linkTransaction = transaction && !transaction.handover ? transaction.id : null;

  const created = await tx.handover.create({
    data: {
      id: c.entityId,
      lotId: lot.id,
      transactionId: linkTransaction,
      handoverRef: p.handoverRef,
      qrPayload: p.qrPayload,
      codeHash: String(p.codeHash).toLowerCase(),
      verificationCode: null,
      declaredWeightGrams: p.declaredWeightGrams,
      capturedAt: toDate(p.capturedAt) ?? c.clientTime,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      accuracy: p.accuracy ?? null,
      locationSource: p.locationSource ?? (p.latitude !== undefined ? "GPS" : null),
      distanceToRecyclerMeters: proof.distanceToRecyclerMeters,
      locationClass: proof.locationClass,
      mockLocationFlag: p.mockLocationFlag === true,
      geoFlag: proof.isFlagged,
      spoofReasons: proof.spoofFlags.length > 0 ? proof.spoofFlags.join("; ") : null,
      status: "PENDING",
    },
  });

  if (proof.isFlagged) {
    for (const anom of checkLocationAnomalies(proof.locationClass, proof.distanceToRecyclerMeters, proof.spoofFlags)) {
      await tx.anomalyFlag.create({
        data: { type: anom.type, severity: anom.severity, reason: anom.reason, ruleCode: anom.ruleCode, lotId: lot.id, detailsJson: JSON.stringify(anom.details) },
      });
    }
  }
  await touchLot(c, lot.id);
  return applied(created.id);
}

async function updateHandover(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  if (!c.collector) return rejected("FORBIDDEN_ROLE", "Only collectors can change handovers");
  const handover = await tx.handover.findUnique({ where: { id: c.entityId }, include: { lot: { include: LOT_INCLUDE } } });
  if (!handover) return rejected("PARENT_HANDOVER_NOT_FOUND", `Handover ${c.entityId} not found`, true);
  if (handover.lot.collectorId !== c.collector.id) return rejected("FORBIDDEN", "You do not own this handover");
  const lot = handover.lot;

  const data: Prisma.HandoverUncheckedUpdateInput = {};
  if (p.packedSafely !== undefined) data.packedSafely = p.packedSafely;
  if (p.arrivedAt !== undefined) data.arrivedAt = toDate(p.arrivedAt);
  if (p.arrivalDistanceM !== undefined) data.arrivalDistanceM = p.arrivalDistanceM;

  const touchesLocation = ["latitude", "longitude", "accuracy", "locationSource", "mockLocationFlag"].some((k) => p[k] !== undefined);
  if (touchesLocation) {
    const merged = {
      latitude: p.latitude ?? handover.latitude ?? undefined,
      longitude: p.longitude ?? handover.longitude ?? undefined,
      accuracy: p.accuracy ?? handover.accuracy ?? undefined,
      mockLocationFlag: p.mockLocationFlag ?? handover.mockLocationFlag,
    };
    const proof = await locationProof(tx, lot, merged);
    if (p.latitude !== undefined) data.latitude = p.latitude;
    if (p.longitude !== undefined) data.longitude = p.longitude;
    if (p.accuracy !== undefined) data.accuracy = p.accuracy;
    if (p.locationSource !== undefined) data.locationSource = p.locationSource;
    if (p.mockLocationFlag !== undefined) data.mockLocationFlag = p.mockLocationFlag;
    data.distanceToRecyclerMeters = proof.distanceToRecyclerMeters;
    data.locationClass = proof.locationClass;
    data.geoFlag = proof.isFlagged;
    data.spoofReasons = proof.spoofFlags.length > 0 ? proof.spoofFlags.join("; ") : null;
  }

  // Collector accepting the recycler's weighed amount: only meaningful while WEIGHED, otherwise just recorded.
  if (p.acceptedByCollector === true) {
    data.acceptedByCollectorAt = c.clientTime;
    if (handover.status === "WEIGHED" && handover.confirmedWeightGrams !== null) {
      const rate = lot.quotedRatePaise ?? 0;
      const finalPrice = amountPaise(handover.confirmedWeightGrams, rate);
      data.status = "CONFIRMED";
      data.recyclerConfirmedAt = handover.recyclerConfirmedAt ?? new Date();
      const check = validateLotTransition(lot.status, "HANDED_OVER", false);
      if (!check.valid) return conflict("INVALID_STATE_TRANSITION", check.reason ?? "Lot cannot be confirmed", serializePullLot(lot) as unknown as Record<string, unknown>);
      await tx.lot.update({ where: { id: lot.id }, data: { status: "HANDED_OVER", transactionStatus: "CONFIRMED", finalPricePaise: finalPrice } });
      await tx.transaction.updateMany({ where: { lotId: lot.id }, data: { status: "CONFIRMED", finalPricePaise: finalPrice } });
    }
  }

  // Collector-side status moves only: cancel or dispute an open handover.
  if (p.status !== undefined && p.status !== handover.status) {
    const open = ["PENDING", "WEIGHED"].includes(handover.status);
    if (!open) {
      return conflict("INVALID_STATE_TRANSITION", `Handover is ${handover.status} and cannot become ${p.status}`);
    }
    data.status = p.status;
    if (p.status === "DISPUTED") data.disputeReason = data.disputeReason ?? "Disputed by collector";
  }

  if (Object.keys(data).length === 0) return applied(handover.id, "No change");
  await tx.handover.update({ where: { id: handover.id }, data });
  await touchLot(c, lot.id);
  return applied(handover.id);
}

// ---------- batch_handover ----------

export async function handleBatchHandover(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  if (!c.collector) return rejected("FORBIDDEN_ROLE", "Only collectors can push batch handovers");

  const existing = await tx.batchHandover.findUnique({ where: { id: c.entityId } });
  if (existing) {
    if (existing.collectorId !== c.collector.id) return rejected("FORBIDDEN", "You do not own this batch");
    return applied(existing.id, "Batch already exists");
  }
  const sameRef = await tx.batchHandover.findUnique({ where: { batchRef: p.batchRef } });
  if (sameRef) return conflict("DUPLICATE_BATCH_REF", "Batch reference already exists");

  const lotIds: string[] = [...new Set<string>(p.lotIds)];
  const lots = await tx.lot.findMany({ where: { id: { in: lotIds } } });
  if (lots.length !== lotIds.length) return rejected("PARENT_LOT_NOT_FOUND", "One or more lots in the batch are not synced yet", true);
  if (lots.some((l) => l.collectorId !== c.collector!.id)) return rejected("FORBIDDEN", "You do not own every lot in this batch");

  const recycler = await tx.recycler.findUnique({ where: { id: p.recyclerId } });
  if (!recycler || recycler.authorizationStatus !== "VERIFIED") return rejected("RECYCLER_NOT_AUTHORIZED", "Recycler is not verified or does not exist");

  const batch = await tx.batchHandover.create({
    data: {
      id: c.entityId,
      batchRef: p.batchRef,
      qrPayload: p.qrPayload,
      codeHash: String(p.codeHash).toLowerCase(),
      verificationCode: null,
      collectorId: c.collector.id,
      totalWeightGrams: p.totalWeightGrams,
      capturedAt: toDate(p.capturedAt) ?? c.clientTime,
      recyclerId: recycler.id,
      status: "PENDING",
      items: { create: lotIds.map((lotId) => ({ lotId })) },
    },
  });
  return applied(batch.id);
}

// ---------- payment ----------

/** paymentStatus is derived from Payment rows; a fully paid CONFIRMED lot is completed (server-owned transition). */
export async function recomputePaymentState(tx: Tx, lotId: string): Promise<void> {
  const lot = await tx.lot.findUnique({ where: { id: lotId }, include: { payments: true } });
  if (!lot) return;
  const paid = lot.payments.reduce((sum, pay) => sum + pay.amountPaise, 0);
  const fullyPaid = lot.finalPricePaise !== null && lot.finalPricePaise > 0 && paid >= lot.finalPricePaise;
  const paymentStatus = fullyPaid ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";

  const data: Prisma.LotUncheckedUpdateInput = { paymentStatus };
  if (fullyPaid && lot.status === "HANDED_OVER" && lot.transactionStatus === "CONFIRMED") {
    if (validateLotTransition(lot.status, "COMPLETED", true).valid) {
      data.status = "COMPLETED";
      data.transactionStatus = "PAID";
    }
  }
  await tx.lot.update({ where: { id: lotId }, data });
  await tx.transaction.updateMany({
    where: { lotId },
    data: { paymentStatus, ...(data.transactionStatus === "PAID" ? { status: "PAID" } : {}) },
  });
}

export async function handlePayment(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const found = await loadOwnedLot(c, p.lotId);
  if (found.failure) return found.failure;
  const lot = found.lot;

  const existing = await tx.payment.findUnique({ where: { id: c.entityId } });
  if (existing) {
    if (existing.lotId !== lot.id) return rejected("FORBIDDEN", "You do not own this payment");
    return applied(existing.canonicalId ?? existing.id, "Payment already exists");
  }

  const method = p.method as "CASH" | "UPI";
  const matching = await tx.payment.findFirst({
    where: { lotId: lot.id, amountPaise: p.amountPaise, method, recordedBy: "RECYCLER", confirmedByCollector: false },
  });
  if (matching) {
    await tx.payment.update({ where: { id: matching.id }, data: { confirmedByCollector: true, collectorPaymentId: c.entityId } });
    await recomputePaymentState(tx, lot.id);
    return applied(matching.id, "Merged with matching recycler-recorded payment");
  }

  const created = await tx.payment.create({
    data: {
      id: c.entityId,
      lotId: lot.id,
      amountPaise: p.amountPaise,
      method,
      upiRef: p.upiRef ?? null,
      paidAt: toDate(p.paidAt) ?? c.clientTime,
      confirmedByCollector: true,
      recordedBy: "COLLECTOR",
      canonicalId: c.entityId,
    },
  });
  await recomputePaymentState(tx, lot.id);
  return applied(created.id);
}

// ---------- price_point ----------

export async function handlePricePoint(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  if (c.role !== "FIELD_AGENT") return rejected("FORBIDDEN_ROLE", "Only field agents can push price_point");
  const existing = await tx.pricePoint.findUnique({ where: { id: c.entityId } });
  if (existing) {
    if (existing.recordedById !== c.userId) return rejected("FORBIDDEN", "You do not own this price point");
    return applied(existing.id, "Price point already exists");
  }
  const category = await tx.materialCategory.findUnique({ where: { id: p.categoryId } });
  if (!category) return rejected("CATEGORY_NOT_FOUND", `Material category #${p.categoryId} does not exist`);

  const created = await tx.pricePoint.create({
    data: {
      id: c.entityId,
      categoryId: p.categoryId,
      area: p.area,
      district: p.district ?? "Unknown",
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      recordedAt: toDate(p.recordedAt) ?? c.clientTime,
      buyingPricePaise: p.buyingPricePaise,
      source: "FIELD_AGENT",
      buyerType: p.buyerType,
      recordedById: c.userId,
    },
  });
  return applied(created.id);
}

// ---------- pickup_request ----------

export async function handlePickupRequest(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  // PickupRequest.collectorId holds the owning USER id (the web portal and the REST route write the same).
  const existing = await tx.pickupRequest.findUnique({ where: { id: c.entityId } });

  if (c.op === "update") {
    if (!existing) return rejected("PARENT_PICKUP_NOT_FOUND", `Pickup request ${c.entityId} not found`, true);
    if (existing.collectorId !== c.userId) return rejected("FORBIDDEN", "You do not own this pickup request");
    if (existing.status === "CANCELLED") return applied(existing.id, "Already cancelled");
    if (!["REQUESTED", "ACCEPTED"].includes(existing.status)) {
      return conflict("INVALID_STATE_TRANSITION", `Pickup request is ${existing.status} and cannot be cancelled`);
    }
    await tx.pickupRequest.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    return applied(existing.id);
  }

  if (existing) {
    if (existing.collectorId !== c.userId) return rejected("FORBIDDEN", "You do not own this pickup request");
    return applied(existing.id, "Pickup request already exists");
  }
  const found = await loadOwnedLot(c, p.lotId);
  if (found.failure) return found.failure;
  const recycler = await tx.recycler.findUnique({ where: { id: p.recyclerId } });
  if (!recycler || recycler.authorizationStatus !== "VERIFIED") return rejected("RECYCLER_NOT_AUTHORIZED", "Recycler is not verified or does not exist");

  const created = await tx.pickupRequest.create({
    data: {
      id: c.entityId,
      collectorId: c.userId,
      recyclerId: recycler.id,
      lotId: found.lot.id,
      slot: new Date(p.slot),
      status: "REQUESTED",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return applied(created.id);
}

// ---------- coverage_request / consent / incident / quiz_result / rating ----------

export async function handleCoverageRequest(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const existing = await tx.coverageRequest.findUnique({ where: { id: c.entityId } });
  if (existing) return existing.collectorId === c.userId ? applied(existing.id, "Already recorded") : rejected("FORBIDDEN", "You do not own this request");
  const category = await tx.materialCategory.findUnique({ where: { id: p.categoryId } });
  if (!category) return rejected("CATEGORY_NOT_FOUND", `Material category #${p.categoryId} does not exist`);
  const created = await tx.coverageRequest.create({
    data: { id: c.entityId, collectorId: c.userId, latitude: p.latitude, longitude: p.longitude, categoryId: p.categoryId, approxWeightGrams: p.approxWeightGrams },
  });
  return applied(created.id);
}

export async function handleConsent(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const existing = await tx.consentRecord.findUnique({ where: { id: c.entityId } });
  if (existing) return existing.userId === c.userId ? applied(existing.id, "Already recorded") : rejected("FORBIDDEN", "You do not own this consent record");
  const created = await tx.consentRecord.create({
    data: { id: c.entityId, userId: c.userId, version: p.version, language: p.language, locationConsent: p.locationConsent, timestamp: toDate(p.timestamp) ?? c.clientTime },
  });
  return applied(created.id);
}

export async function handleIncident(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const existing = await tx.incidentReport.findUnique({ where: { id: c.entityId } });
  if (existing) return existing.reporterId === c.userId ? applied(existing.id, "Already recorded") : rejected("FORBIDDEN", "You do not own this report");
  if (p.lotId) {
    const found = await loadOwnedLot(c, p.lotId);
    if (found.failure) return found.failure;
  }
  const created = await tx.incidentReport.create({
    data: {
      id: c.entityId,
      reporterId: c.userId,
      lotId: p.lotId ?? null,
      type: p.type,
      note: p.note ?? null,
      description: p.note ? `${p.type}: ${p.note}` : p.type,
      severity: incidentSeverity(p.type),
      occurredAt: toDate(p.occurredAt) ?? c.clientTime,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    },
  });
  return applied(created.id);
}

export async function handleQuizResult(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const existing = await tx.safetyQuizResult.findUnique({ where: { id: c.entityId } });
  if (existing) return existing.userId === c.userId ? applied(existing.id, "Already recorded") : rejected("FORBIDDEN", "You do not own this result");
  const topic = await tx.safetyTopic.findFirst({ where: { OR: [{ id: p.topicId }, { key: p.topicId }] } });
  if (!topic) return rejected("TOPIC_NOT_FOUND", `Safety topic ${p.topicId} does not exist`);
  const created = await tx.safetyQuizResult.create({
    data: { id: c.entityId, userId: c.userId, topicId: topic.id, score: p.score, passed: p.passed, completedAt: toDate(p.completedAt) ?? c.clientTime },
  });
  return applied(created.id);
}

export async function handleRating(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const existing = await tx.recyclerRating.findUnique({ where: { id: c.entityId } });
  if (existing) return existing.collectorId === c.userId ? applied(existing.id, "Already recorded") : rejected("FORBIDDEN", "You do not own this rating");
  const recycler = await tx.recycler.findUnique({ where: { id: p.recyclerId } });
  if (!recycler) return rejected("RECYCLER_NOT_AUTHORIZED", "Recycler does not exist");
  const created = await tx.recyclerRating.create({
    data: { id: c.entityId, recyclerId: recycler.id, collectorId: c.userId, rating: p.rating, comment: p.comment ?? null },
  });
  return applied(created.id);
}

// ---------- dispute ----------

export async function handleDispute(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;

  if (c.op === "update") {
    if (!c.collector) return rejected("FORBIDDEN_ROLE", "Only collectors can change disputes");
    const dispute = await tx.dispute.findUnique({ where: { id: c.entityId }, include: { lot: true } });
    if (!dispute) return rejected("PARENT_DISPUTE_NOT_FOUND", `Dispute ${c.entityId} not found`, true);
    if (dispute.lot.collectorId !== c.collector.id) return rejected("FORBIDDEN", "You do not own this dispute");
    if (dispute.raisedBy !== "COLLECTOR") return rejected("FORBIDDEN", "Only the raiser can change a dispute");
    await tx.dispute.update({ where: { id: dispute.id }, data: { hasEvidence: p.hasEvidence } });
    await touchLot(c, dispute.lotId);
    return applied(dispute.id);
  }

  const found = await loadOwnedLot(c, p.lotId);
  if (found.failure) return found.failure;
  const lot = found.lot;

  const existing = await tx.dispute.findUnique({ where: { id: c.entityId } });
  if (existing) return existing.lotId === lot.id ? applied(existing.id, "Dispute already exists") : rejected("FORBIDDEN", "You do not own this dispute");

  const handover = await tx.handover.findUnique({ where: { id: p.handoverId } });
  if (!handover) return rejected("PARENT_HANDOVER_NOT_FOUND", `Handover ${p.handoverId} not found`, true);
  if (handover.lotId !== lot.id) return rejected("FORBIDDEN", "Handover does not belong to this lot");

  // The lot itself moves to DISPUTED through its own `lot` mutation (single path through the state machine).
  const created = await tx.dispute.create({
    data: { id: c.entityId, lotId: lot.id, handoverId: handover.id, reason: p.reason, raisedBy: "COLLECTOR", hasEvidence: p.hasEvidence },
  });
  await touchLot(c, lot.id);
  return applied(created.id);
}

// ---------- profile ----------

export async function handleProfile(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  if (!c.collector) return rejected("FORBIDDEN_ROLE", "Only collectors have a profile");
  if (c.entityId !== c.collector.id) return rejected("FORBIDDEN", "You can only change your own profile");
  const data: Prisma.CollectorUncheckedUpdateInput = {};
  if (p.preferredLanguage !== undefined) data.preferredLanguage = p.preferredLanguage;
  if (p.operatingArea !== undefined) data.operatingArea = p.operatingArea;
  if (Object.keys(data).length === 0) return applied(c.collector.id, "No change");
  await tx.collector.update({ where: { id: c.collector.id }, data });
  if (p.preferredLanguage !== undefined) await tx.user.update({ where: { id: c.userId }, data: { language: p.preferredLanguage } });
  return applied(c.collector.id);
}

// ---------- dealer_comparison ----------

export async function handleDealerComparison(c: HandlerContext): Promise<HandlerResult> {
  const { tx, payload: p } = c;
  const found = await loadOwnedLot(c, p.lotId);
  if (found.failure) return found.failure;

  const byId = await tx.dealerComparison.findUnique({ where: { id: c.entityId } });
  if (byId && byId.lotId !== found.lot.id) return rejected("FORBIDDEN", "You do not own this comparison");
  // One comparison per lot: a second save (same or new id) updates the lot's row.
  const existing = byId ?? (await tx.dealerComparison.findUnique({ where: { lotId: found.lot.id } }));
  const values = { categoryId: p.categoryId, dealerRatePaise: p.dealerRatePaise, ourRatePaise: p.ourRatePaise, clientCreatedAt: toDate(p.createdAt) ?? c.clientTime };
  if (existing) {
    await tx.dealerComparison.update({ where: { id: existing.id }, data: values });
    return applied(existing.id);
  }
  const created = await tx.dealerComparison.create({ data: { id: c.entityId, lotId: found.lot.id, collectorId: found.lot.collectorId, ...values } });
  return applied(created.id);
}

export { lotClientState };
