import { prisma } from "../prisma";
import { validateLotTransition, checkServerOwnedFields, LotStatus } from "../domain/lotStateMachine";
import { validateLotRef } from "../domain/lotRef";
import { classifyLocationProof, evaluateWeightTolerance, generateVerificationCode } from "../domain/handover";
import {
  checkPriceAnomalies,
  checkWeightAnomalies,
  checkLocationAnomalies,
  checkOverpaymentAnomaly,
  checkDuplicatePhotoAnomaly,
} from "../domain/anomalies";
import { validateStorageKey } from "../storage";
import { Prisma } from "@prisma/client";

export interface SyncMutationInput {
  clientMutationId: string;
  entity: string; // lot, lot_image, transaction, handover, payment, price_point, dispute, incident, consent, pickup_request, coverage_request, price_alert, quiz_result, rating
  entityId: string;
  op: "create" | "update";
  payload: Record<string, any>;
  clientTimestamp: string;
}

export interface SyncMutationResult {
  clientMutationId: string;
  status: "APPLIED" | "DUPLICATE" | "CONFLICT" | "REJECTED";
  code?: string;
  message?: string;
  retryable?: boolean;
  canonicalId?: string;
  serverState?: any;
}

const ENTITY_PRIORITY: Record<string, number> = {
  lot: 1,
  lot_image: 2,
  transaction: 3,
  handover: 4,
  batch_handover: 5,
  payment: 6,
  price_point: 7,
  consent: 8,
  pickup_request: 9,
  coverage_request: 10,
  dispute: 11,
  incident: 12,
  price_alert: 13,
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
    const prioA = ENTITY_PRIORITY[a.entity.toLowerCase()] || 99;
    const prioB = ENTITY_PRIORITY[b.entity.toLowerCase()] || 99;
    if (prioA !== prioB) return prioA - prioB;

    if (a.op !== b.op) {
      return a.op === "create" ? -1 : 1;
    }

    const timeA = new Date(a.clientTimestamp || 0).getTime() || 0;
    const timeB = new Date(b.clientTimestamp || 0).getTime() || 0;
    return timeA - timeB;
  });
}

/**
 * Process a single mutation inside a DB interactive transaction.
 */
export async function processMutation(
  mutation: SyncMutationInput,
  userId: string,
  deviceId: string
): Promise<SyncMutationResult> {
  const { clientMutationId, entity, entityId, op, payload, clientTimestamp } = mutation;
  const clientTime = new Date(clientTimestamp);

  // 1. Idempotency check: Did we already process this clientMutationId?
  const existing = await prisma.syncMutation.findUnique({
    where: { id: clientMutationId },
  });

  if (existing) {
    return {
      clientMutationId,
      status: "DUPLICATE",
      code: existing.resultCode || "ALREADY_PROCESSED",
      message: existing.resultMessage || "Mutation was previously processed",
      retryable: false,
      canonicalId: existing.canonicalId || undefined,
    };
  }

  // 2. Process based on entity
  try {
    return await prisma.$transaction(async (tx) => {
      let result: SyncMutationResult;

      switch (entity.toLowerCase()) {
        case "lot":
          result = await handleLotMutation(tx, op, entityId, payload, userId, clientTime);
          break;
        case "lot_image":
          result = await handleLotImageMutation(tx, op, entityId, payload, userId, clientTime);
          break;
        case "transaction":
          result = await handleTransactionMutation(tx, op, entityId, payload, userId, clientTime);
          break;
        case "handover":
          result = await handleHandoverMutation(tx, op, entityId, payload, userId, clientTime);
          break;
        case "payment":
          result = await handlePaymentMutation(tx, op, entityId, payload, userId, clientTime);
          break;
        case "price_point":
          result = await handlePricePointMutation(tx, op, entityId, payload, userId, clientTime);
          break;
        case "pickup_request":
          result = await handlePickupRequestMutation(tx, op, entityId, payload, userId);
          break;
        case "coverage_request":
          result = await handleCoverageRequestMutation(tx, op, entityId, payload, userId);
          break;
        case "consent":
          result = await handleConsentMutation(tx, entityId, payload, userId);
          break;
        case "dispute":
          result = await handleDisputeMutation(tx, entityId, payload, userId);
          break;
        case "incident":
          result = await handleIncidentMutation(tx, entityId, payload, userId);
          break;
        case "quiz_result":
          result = await handleQuizResultMutation(tx, entityId, payload, userId);
          break;
        case "rating":
          result = await handleRatingMutation(tx, entityId, payload, userId);
          break;
        default:
          result = {
            clientMutationId,
            status: "REJECTED",
            code: "UNKNOWN_ENTITY",
            message: `Entity '${entity}' is not supported`,
            retryable: false,
          };
      }

      // Record SyncMutation row
      await tx.syncMutation.create({
        data: {
          id: clientMutationId,
          deviceId,
          userId,
          entity,
          entityId,
          op,
          payload: payload as unknown as Prisma.InputJsonValue,
          clientTimestamp: clientTime,
          status: result.status,
          resultCode: result.code,
          resultMessage: result.message,
          canonicalId: result.canonicalId,
        },
      });

      return result;
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      clientMutationId,
      status: "REJECTED",
      code: "PROCESSING_ERROR",
      message: errorMsg,
      retryable: true,
    };
  }
}

// ----------------- Entity Mutation Handlers -----------------

async function handleLotMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  lotId: string,
  payload: Record<string, any>,
  userId: string,
  clientTime: Date
): Promise<SyncMutationResult> {
  // Check collector profile
  const collector = await tx.collector.findUnique({
    where: { userId },
  });

  if (!collector) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "COLLECTOR_PROFILE_MISSING",
      message: "User does not have an active collector profile",
      retryable: false,
    };
  }

  // Check forbidden client server-owned fields
  const forbiddenCheck = checkServerOwnedFields(payload);
  if (forbiddenCheck.forbidden) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "FORBIDDEN_FIELD",
      message: `Client cannot set server-owned field '${forbiddenCheck.field}'`,
      retryable: false,
    };
  }

  if (op === "create") {
    // Validate lotRef format with collector shortCode
    const lotRef = payload.lotRef || "";
    const refValidation = validateLotRef(lotRef, collector.shortCode);
    if (!refValidation.valid) {
      return {
        clientMutationId: "",
        status: "REJECTED",
        code: "INVALID_LOT_REF",
        message: refValidation.reason || "Invalid lotRef",
        retryable: false,
      };
    }

    // Check duplicate lotRef
    const existingRef = await tx.lot.findUnique({ where: { lotRef } });
    if (existingRef) {
      return {
        clientMutationId: "",
        status: "CONFLICT",
        code: "DUPLICATE_LOT_REF",
        message: "Lot reference already exists",
        serverState: existingRef,
      };
    }

    const categoryExists = await tx.materialCategory.findUnique({
      where: { id: Number(payload.categoryId) },
    });
    if (!categoryExists) {
      return {
        clientMutationId: "",
        status: "REJECTED",
        code: "CATEGORY_NOT_FOUND",
        message: `Material category #${payload.categoryId} does not exist`,
        retryable: false,
      };
    }

    const createdLot = await tx.lot.create({
      data: {
        id: lotId,
        lotRef,
        collectorId: collector.id,
        categoryId: Number(payload.categoryId),
        subCategory: payload.subCategory || null,
        description: payload.description || null,
        condition: payload.condition || "UNKNOWN",
        sourceType: payload.sourceType || "OTHER",
        approxWeightGrams: Number(payload.approxWeightGrams || 0),
        estimatedValuePaise: payload.estimatedValuePaise ? Number(payload.estimatedValuePaise) : null,
        estimatedMinPaise: payload.estimatedMinPaise ? Number(payload.estimatedMinPaise) : null,
        estimatedMaxPaise: payload.estimatedMaxPaise ? Number(payload.estimatedMaxPaise) : null,
        aiCategoryId: payload.aiCategoryId ? Number(payload.aiCategoryId) : null,
        aiConfidence: payload.aiConfidence ? Number(payload.aiConfidence) : null,
        status: payload.status || "DRAFT",
        collectedAt: payload.collectedAt ? new Date(payload.collectedAt) : clientTime,
        collectLat: payload.collectLat !== undefined ? Number(payload.collectLat) : null,
        collectLng: payload.collectLng !== undefined ? Number(payload.collectLng) : null,
        clientCreatedAt: clientTime,
        chosenRecyclerId: payload.chosenRecyclerId || null,
        quotedRatePaise: payload.quotedRatePaise ? Number(payload.quotedRatePaise) : null,
        transactionStatus: payload.transactionStatus || "QUOTED",
      },
    });

    return {
      clientMutationId: "",
      status: "APPLIED",
      canonicalId: createdLot.id,
    };
  }

  // Update operation
  const existingLot = await tx.lot.findUnique({ where: { id: lotId } });
  if (!existingLot) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "PARENT_LOT_NOT_FOUND",
      message: `Lot ${lotId} not found`,
      retryable: true,
    };
  }

  // Verify ownership
  if (existingLot.collectorId !== collector.id) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "FORBIDDEN",
      message: "You do not own this lot",
      retryable: false,
    };
  }

  // Validate state machine transition if status is being updated
  if (payload.status && payload.status !== existingLot.status) {
    const transitionCheck = validateLotTransition(existingLot.status as LotStatus, payload.status as LotStatus, false);
    if (!transitionCheck.valid) {
      return {
        clientMutationId: "",
        status: transitionCheck.isConflict ? "CONFLICT" : "REJECTED",
        code: "INVALID_STATE_TRANSITION",
        message: transitionCheck.reason,
        serverState: existingLot,
      };
    }
  }

  const updatedLot = await tx.lot.update({
    where: { id: lotId },
    data: {
      status: payload.status || undefined,
      description: payload.description !== undefined ? payload.description : undefined,
      approxWeightGrams: payload.approxWeightGrams !== undefined ? Number(payload.approxWeightGrams) : undefined,
      chosenRecyclerId: payload.chosenRecyclerId !== undefined ? payload.chosenRecyclerId : undefined,
      quotedRatePaise: payload.quotedRatePaise !== undefined ? Number(payload.quotedRatePaise) : undefined,
      updatedAt: new Date(),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: updatedLot.id,
  };
}

async function handleLotImageMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  imageId: string,
  payload: Record<string, any>,
  userId: string,
  clientTime: Date
): Promise<SyncMutationResult> {
  const lotId = payload.lotId;
  const lot = await tx.lot.findUnique({ where: { id: lotId } });
  if (!lot) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "PARENT_LOT_NOT_FOUND",
      message: `Lot ${lotId} does not exist yet`,
      retryable: true,
    };
  }

  const storageKey = payload.storageKey || payload.remoteKey;
  if (!storageKey || !validateStorageKey(storageKey, userId)) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "INVALID_STORAGE_KEY",
      message: `storageKey must start with images/${userId}/`,
      retryable: false,
    };
  }

  const kind = payload.kind || "COLLECTION";
  const sha256 = payload.sha256 || null;

  // Duplicate photo check
  if (sha256) {
    const existingPhoto = await tx.lotImage.findFirst({
      where: { sha256, lotId: { not: lotId } },
    });
    if (existingPhoto) {
      const anomaly = checkDuplicatePhotoAnomaly(existingPhoto.lotId, sha256);
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

  const createdImage = await tx.lotImage.create({
    data: {
      id: imageId,
      lotId,
      kind,
      storageKey,
      localPath: payload.localPath || null,
      sha256,
      takenAt: payload.takenAt ? new Date(payload.takenAt) : clientTime,
    },
  });

  // If TRAINING image, create TrainingSample row
  if (kind === "TRAINING") {
    await tx.trainingSample.create({
      data: {
        imageId: createdImage.id,
        categoryId: lot.categoryId,
        labelSource: "FIELD_AGENT",
        labelConfidence: 1.0,
        capturedById: userId,
      },
    });
  }

  // Update lot timestamp for pull
  await tx.lot.update({ where: { id: lotId }, data: { updatedAt: new Date() } });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: createdImage.id,
  };
}

async function handleTransactionMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  transactionId: string,
  payload: Record<string, any>,
  userId: string,
  clientTime: Date
): Promise<SyncMutationResult> {
  const lotId = payload.lotId;
  const lot = await tx.lot.findUnique({ where: { id: lotId } });
  if (!lot) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "PARENT_LOT_NOT_FOUND",
      message: `Lot ${lotId} not found`,
      retryable: true,
    };
  }

  const recyclerId = payload.recyclerId || lot.chosenRecyclerId;
  const recycler = await tx.recycler.findUnique({
    where: { id: recyclerId },
    include: { rates: { where: { isCurrent: true, categoryId: lot.categoryId } } },
  });

  if (!recycler || recycler.authorizationStatus !== "VERIFIED") {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "RECYCLER_NOT_AUTHORIZED",
      message: "Recycler is not verified or does not exist",
      retryable: false,
    };
  }

  if (recycler.authorizationValidTill && new Date(recycler.authorizationValidTill) <= new Date()) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "RECYCLER_AUTHORIZATION_EXPIRED",
      message: "Recycler authorization has expired",
      retryable: false,
    };
  }

  const currentRate = recycler.rates[0];
  if (!currentRate) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "MATERIAL_NOT_ACCEPTED",
      message: "Recycler does not accept this material category",
      retryable: false,
    };
  }

  // Check rate freshness: Stale beyond 7 days = CONFLICT with current rate
  const rateAgeDays = (Date.now() - new Date(currentRate.effectiveFrom).getTime()) / (24 * 60 * 60 * 1000);
  const quotedRate = Number(payload.quotedRatePerKgPaise || currentRate.ratePerKgPaise);

  if (quotedRate !== currentRate.ratePerKgPaise && rateAgeDays > 7) {
    return {
      clientMutationId: "",
      status: "CONFLICT",
      code: "STALE_QUOTED_RATE",
      message: `Quoted rate ₹${(quotedRate / 100).toFixed(2)}/kg is outdated. Current rate is ₹${(currentRate.ratePerKgPaise / 100).toFixed(2)}/kg.`,
      serverState: { currentRatePerKgPaise: currentRate.ratePerKgPaise },
    };
  }

  // Server recomputes quoted price
  const computedQuotedPrice = Math.round((currentRate.ratePerKgPaise * lot.approxWeightGrams) / 1000);

  const collector = await tx.collector.findUnique({ where: { userId } });
  if (!collector) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "COLLECTOR_NOT_FOUND",
      message: "Collector profile not found",
      retryable: false,
    };
  }

  const createdTx = await tx.transaction.upsert({
    where: { lotId },
    create: {
      id: transactionId,
      lotId,
      collectorId: collector.id,
      recyclerId: recycler.id,
      quotedRatePerKgPaise: currentRate.ratePerKgPaise,
      quotedPricePaise: computedQuotedPrice,
      status: "QUOTED",
      paymentStatus: "UNPAID",
    },
    update: {
      quotedRatePerKgPaise: currentRate.ratePerKgPaise,
      quotedPricePaise: computedQuotedPrice,
      updatedAt: new Date(),
    },
  });

  // Touch lot
  await tx.lot.update({
    where: { id: lotId },
    data: {
      status: "MATCHED",
      chosenRecyclerId: recycler.id,
      quotedRatePaise: currentRate.ratePerKgPaise,
      updatedAt: new Date(),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: createdTx.id,
  };
}

async function handleHandoverMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  handoverId: string,
  payload: Record<string, any>,
  userId: string,
  clientTime: Date
): Promise<SyncMutationResult> {
  const lotId = payload.lotId;
  const lot = await tx.lot.findUnique({
    where: { id: lotId },
    include: { transaction: { include: { recycler: true } } },
  });

  if (!lot) {
    return {
      clientMutationId: "",
      status: "REJECTED",
      code: "PARENT_LOT_NOT_FOUND",
      message: `Lot ${lotId} not found`,
      retryable: true,
    };
  }

  // Generate 4-digit verification code if not provided
  const verificationCode = payload.verificationCode || generateVerificationCode();
  const handoverRef = payload.handoverRef || `HO-${lot.lotRef.replace("LOT-", "")}`;

  // Evaluate location proof
  let facility: any = lot.transaction?.recycler;
  if (!facility && lot.chosenRecyclerId) {
    facility = await tx.recycler.findUnique({ where: { id: lot.chosenRecyclerId } });
  }
  const locProof = classifyLocationProof(
    payload.latitude,
    payload.longitude,
    facility?.latitude,
    facility?.longitude,
    payload.accuracy,
    payload.mockLocationFlag
  );

  const declaredWeightGrams = Number(payload.declaredWeightGrams || lot.approxWeightGrams);

  const createdHandover = await tx.handover.create({
    data: {
      id: handoverId,
      lotId,
      transactionId: lot.transaction?.id || null,
      handoverRef,
      qrPayload: payload.qrPayload || `KABADI:${lot.lotRef}:${verificationCode}`,
      verificationCode,
      declaredWeightGrams,
      capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : clientTime,
      latitude: payload.latitude !== undefined ? Number(payload.latitude) : null,
      longitude: payload.longitude !== undefined ? Number(payload.longitude) : null,
      accuracy: payload.accuracy !== undefined ? Number(payload.accuracy) : null,
      locationSource: payload.locationSource || "GPS",
      distanceToRecyclerMeters: locProof.distanceToRecyclerMeters,
      locationClass: locProof.locationClass,
      mockLocationFlag: payload.mockLocationFlag || false,
      status: "PENDING", // PENDING until recycler confirms
    },
  });

  // Raise location anomaly flags if needed
  if (locProof.isFlagged) {
    const locAnomalies = checkLocationAnomalies(
      locProof.locationClass,
      locProof.distanceToRecyclerMeters,
      locProof.spoofFlags
    );
    for (const anom of locAnomalies) {
      await tx.anomalyFlag.create({
        data: {
          type: anom.type,
          severity: anom.severity,
          reason: anom.reason,
          ruleCode: anom.ruleCode,
          lotId,
          detailsJson: JSON.stringify(anom.details),
        },
      });
    }
  }

  // Update lot status to HANDED_OVER
  await tx.lot.update({
    where: { id: lotId },
    data: {
      status: "HANDED_OVER",
      updatedAt: new Date(),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: createdHandover.id,
  };
}

async function handlePaymentMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  paymentId: string,
  payload: Record<string, any>,
  userId: string,
  clientTime: Date
): Promise<SyncMutationResult> {
  const lotId = payload.lotId;
  const amountPaise = Number(payload.amountPaise);
  const method = payload.method || "CASH";

  // Check if a matching recycler-recorded payment already exists to merge and avoid double-counting
  const matchingRecyclerPayment = await tx.payment.findFirst({
    where: {
      lotId,
      amountPaise,
      method,
      recordedBy: "RECYCLER",
    },
  });

  if (matchingRecyclerPayment) {
    // Merge: mark confirmedByCollector and point canonicalId to recycler payment
    await tx.payment.update({
      where: { id: matchingRecyclerPayment.id },
      data: {
        confirmedByCollector: true,
        collectorPaymentId: paymentId,
      },
    });

    return {
      clientMutationId: "",
      status: "APPLIED",
      canonicalId: matchingRecyclerPayment.id,
      message: "Merged with matching recycler-recorded payment",
    };
  }

  // Create payment row
  const createdPayment = await tx.payment.create({
    data: {
      id: paymentId,
      lotId,
      amountPaise,
      method,
      upiRef: payload.upiRef || null,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : clientTime,
      confirmedByCollector: true,
      recordedBy: "COLLECTOR",
      canonicalId: paymentId,
    },
  });

  // Touch lot
  await tx.lot.update({
    where: { id: lotId },
    data: { updatedAt: new Date() },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: createdPayment.id,
  };
}

async function handlePricePointMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  priceId: string,
  payload: Record<string, any>,
  userId: string,
  clientTime: Date
): Promise<SyncMutationResult> {
  const created = await tx.pricePoint.create({
    data: {
      id: priceId,
      categoryId: Number(payload.categoryId),
      subCategory: payload.subCategory || null,
      area: payload.area || "General",
      district: payload.district || "Mumbai",
      latitude: payload.latitude !== undefined ? Number(payload.latitude) : null,
      longitude: payload.longitude !== undefined ? Number(payload.longitude) : null,
      recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : clientTime,
      buyingPricePaise: Number(payload.buyingPricePaise),
      source: "FIELD_AGENT",
      buyerType: payload.buyerType || "SCRAP_DEALER",
      recordedById: userId,
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handlePickupRequestMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  requestId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const lotId = payload.lotId;
  const recyclerId = payload.recyclerId;
  const slot = new Date(payload.slot);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour expiry

  const created = await tx.pickupRequest.create({
    data: {
      id: requestId,
      collectorId: userId,
      recyclerId,
      lotId,
      slot,
      status: "REQUESTED",
      expiresAt,
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handleCoverageRequestMutation(
  tx: Prisma.TransactionClient,
  op: "create" | "update",
  coverageId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const created = await tx.coverageRequest.create({
    data: {
      id: coverageId,
      collectorId: userId,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      categoryId: Number(payload.categoryId),
      approxWeightGrams: Number(payload.approxWeightGrams),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handleConsentMutation(
  tx: Prisma.TransactionClient,
  consentId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const created = await tx.consentRecord.create({
    data: {
      id: consentId,
      userId,
      version: payload.version || "1.0",
      language: payload.language || "HI",
      locationConsent: payload.locationConsent !== false,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handleDisputeMutation(
  tx: Prisma.TransactionClient,
  disputeId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const created = await tx.dispute.create({
    data: {
      id: disputeId,
      lotId: payload.lotId,
      handoverId: payload.handoverId || null,
      reason: payload.reason || "Dispute raised",
      raisedBy: "COLLECTOR",
    },
  });

  await tx.lot.update({
    where: { id: payload.lotId },
    data: { status: "DISPUTED", updatedAt: new Date() },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handleIncidentMutation(
  tx: Prisma.TransactionClient,
  incidentId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const created = await tx.incidentReport.create({
    data: {
      id: incidentId,
      reporterId: userId,
      lotId: payload.lotId || null,
      description: payload.description || "Incident reported",
      severity: Number(payload.severity || 1),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handleQuizResultMutation(
  tx: Prisma.TransactionClient,
  quizResultId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const created = await tx.safetyQuizResult.create({
    data: {
      id: quizResultId,
      userId,
      topicId: payload.topicId,
      score: Number(payload.score || 0),
      passed: payload.passed !== false,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : new Date(),
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

async function handleRatingMutation(
  tx: Prisma.TransactionClient,
  ratingId: string,
  payload: Record<string, any>,
  userId: string
): Promise<SyncMutationResult> {
  const created = await tx.recyclerRating.create({
    data: {
      id: ratingId,
      recyclerId: payload.recyclerId,
      collectorId: userId,
      rating: Number(payload.rating || 5),
      comment: payload.comment || null,
    },
  });

  return {
    clientMutationId: "",
    status: "APPLIED",
    canonicalId: created.id,
  };
}

