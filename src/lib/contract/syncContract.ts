/**
 * Machine-readable form of docs/sync-contract.md (the canonical Flutter <-> server contract).
 *
 * - `PushRequestSchema` is the one the `/sync/push` route parses with.
 * - The rest (responses, per-entity payloads) is what the shared fixtures in tests/fixtures/contract/
 *   are validated against. The Flutter app copies the same fixtures (E_waste/test/fixtures/contract/).
 * Change the doc, this file and the fixtures together.
 */

import { z } from "zod";
import { CLIENT_LOT_STATES, CLIENT_PUSHABLE_LOT_STATES } from "../domain/lotStatusMapping";

// ---------- primitives ----------

const id = z.string().uuid();
/** Ids of rows the server (or the web portal) created are not necessarily UUIDs, e.g. `PAY-REC-…`. */
const anyId = z.string().min(1);
const iso = z.string().datetime({ offset: true });
const paise = z.number().int().nonnegative();
const grams = z.number().int().nonnegative();
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const tenDigitPhone = z.string().regex(/^\d{10}$/);
const pin = z.string().regex(/^\d{4}$/);

export const LANGUAGES = ["HI", "MR", "EN"] as const;
export const languageSchema = z.enum(LANGUAGES);

// ---------- envelope ----------

export const errorEnvelopeSchema = z
  .object({
    error: z.object({ code: z.string().min(1), message: z.string(), details: z.unknown().optional() }).strict(),
  })
  .strict();

export function successEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({ data }).strict();
}

// ---------- auth ----------

export const collectorProfileSchema = z
  .object({
    collectorId: id,
    userId: id,
    name: z.string().optional(),
    shortCode: z.string().min(3).max(6),
    preferredLanguage: languageSchema,
    operatingArea: z.string().min(2),
    phone: tenDigitPhone,
    lotCounter: z.number().int().nonnegative().optional(),
  })
  .strict();

export const registerRequestSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    phone: tenDigitPhone,
    pin,
    preferredLanguage: languageSchema.default("HI"),
    operatingArea: z.string().min(2),
    district: z.string().optional(),
    consent: z
      .object({ version: z.string().default("1.0"), locationConsent: z.boolean().default(true) })
      .optional(),
  })
  .strict();

export const loginRequestSchema = z.object({ phone: tenDigitPhone, pin }).strict();
export const restoreRequestSchema = z.object({ phone: tenDigitPhone, pin, deviceId: z.string().min(4) }).strict();
export const pinRecoveryRequestSchema = z
  .object({ phone: tenDigitPhone, shortCode: z.string().min(3).max(6), operatingArea: z.string().min(2), newPin: pin })
  .strict();
export const changePinRequestSchema = z.object({ oldPin: pin, newPin: pin }).strict();

export const authSessionDataSchema = z
  .object({ token: z.string().min(20), profile: collectorProfileSchema.nullable() })
  .strict();
export const pinRecoveryDataSchema = authSessionDataSchema.extend({ message: z.string() }).strict();
export const messageDataSchema = z.object({ message: z.string() }).strict();

export const meDataSchema = z
  .object({
    userId: id,
    phone: z.string(),
    role: z.enum(["COLLECTOR", "RECYCLER", "ADMIN", "FIELD_AGENT"]),
    language: languageSchema.nullish(),
    collectorId: id.optional(),
    shortCode: z.string().optional(),
    preferredLanguage: languageSchema.optional(),
    operatingArea: z.string().optional(),
    district: z.string().nullish(),
    collector: z
      .object({
        id,
        name: z.string(),
        shortCode: z.string(),
        preferredLanguage: languageSchema,
        operatingArea: z.string(),
        district: z.string().nullish(),
      })
      .strict()
      .nullable(),
    recycler: z.record(z.unknown()).nullable(),
  })
  .strict();

// ---------- sync/push: request (the exact schema the route uses) ----------

export const PushMutationSchema = z.object({
  clientMutationId: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  op: z.enum(["create", "update"]),
  payload: z.record(z.any()),
  clientTimestamp: z.string(),
});

export const PushRequestSchema = z.object({
  deviceId: z.string().min(1),
  mutations: z.array(PushMutationSchema).max(100),
});

// ---------- sync/push: response ----------

export const MUTATION_STATUSES = ["APPLIED", "DUPLICATE", "CONFLICT", "REJECTED"] as const;

export const pushResultItemSchema = z
  .object({
    clientMutationId: id,
    status: z.enum(MUTATION_STATUSES),
    code: z.string().min(1),
    message: z.string(),
    retryable: z.boolean(),
    canonicalId: z.string().optional(),
    serverState: z.record(z.unknown()).optional(),
  })
  .strict();

export const pushResponseDataSchema = z
  .object({
    deviceId: z.string().min(1),
    serverTimestamp: iso,
    totalMutations: z.number().int().nonnegative().optional(),
    results: z.array(pushResultItemSchema),
  })
  .strict();

// ---------- sync/pull ----------

const clientLotStateSchema = z.enum(CLIENT_LOT_STATES);
const paymentStatusSchema = z.enum(["UNPAID", "PARTIAL", "PAID"]);

export const pullLotSchema = z
  .object({
    id: anyId,
    lotRef: z.string().min(1),
    categoryId: z.number().int(),
    subCategory: z.string().nullish(),
    approxWeightGrams: grams,
    estimatedValuePaise: paise.nullish(),
    estimatedMinPaise: paise.nullish(),
    estimatedMaxPaise: paise.nullish(),
    transactionStatus: clientLotStateSchema,
    chosenRecyclerId: z.string().nullish(),
    quotedRatePaise: paise.nullish(),
    finalPricePaise: paise.nullish(),
    confirmedWeightGrams: grams.nullish(),
    paymentStatus: paymentStatusSchema,
    collectedAt: iso,
    createdAt: iso,
    updatedAt: iso,
    handovers: z.array(
      z
        .object({
          id: anyId,
          handoverRef: z.string(),
          status: z.enum(["PENDING", "WEIGHED", "CONFIRMED", "REJECTED", "CANCELLED", "DISPUTED"]),
          declaredWeightGrams: grams,
          confirmedWeightGrams: grams.nullish(),
        })
        .strict()
    ),
    payments: z.array(
      z
        .object({
          id: anyId,
          amountPaise: paise,
          method: z.enum(["CASH", "UPI"]),
          upiRef: z.string().nullish(),
          paidAt: iso,
          recordedBy: z.enum(["COLLECTOR", "RECYCLER"]),
        })
        .strict()
    ),
  })
  .strict();

export const lotUpdateSchema = z
  .object({
    lotId: anyId,
    transactionStatus: clientLotStateSchema,
    finalPricePaise: paise.nullish(),
    confirmedWeightGrams: grams.nullish(),
    paymentStatus: paymentStatusSchema.nullish(),
    confirmedAt: iso.nullish(),
    updatedAt: iso,
  })
  .strict();

export const pullNotificationSchema = z
  .object({
    id: anyId,
    title: z.string(),
    body: z.string(),
    isRead: z.boolean(),
    dataJson: z.string().nullable(),
    createdAt: iso,
  })
  .strict();

export const pullPickupRequestSchema = z
  .object({
    id: anyId,
    lotId: anyId,
    recyclerId: z.string(),
    slot: iso,
    status: z.enum(["REQUESTED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "COMPLETED", "EXPIRED", "CANCELLED"]),
    expiresAt: iso,
    createdAt: iso,
    updatedAt: iso,
  })
  .strict();

export const pullResponseDataSchema = z
  .object({
    serverTimestamp: iso,
    nextSince: z.string().min(1), // opaque cursor, starts with an ISO time; send back unchanged
    hasMore: z.boolean(),
    lots: z.array(pullLotSchema),
    lotUpdates: z.array(lotUpdateSchema),
    notifications: z.array(pullNotificationSchema),
    pickupRequests: z.array(pullPickupRequestSchema),
  })
  .strict();

// ---------- reference/bootstrap (canonical = what ReferenceDataSyncer consumes) ----------

export const bootstrapPriceSchema = z
  .object({
    id,
    categoryId: z.number().int(),
    area: z.string(),
    district: z.string(),
    recordedAt: iso,
    buyerType: z.enum(["MARKET", "SCRAP_DEALER", "RECYCLER"]),
    source: z.enum(["ADMIN", "FIELD", "RECYCLER"]),
    benchmarkPricePaise: paise,
    tolerancePercent: z.number().int().min(0).max(100),
  })
  .strict();

export const bootstrapDataSchema = z
  .object({
    serverTimestamp: iso,
    categories: z.array(
      z
        .object({
          id: z.number().int(),
          code: z.string(),
          parentId: z.number().int().nullish(),
          nameEn: z.string(),
          nameHi: z.string(),
          nameMr: z.string(),
          iconKey: z.string(),
          isHazardous: z.boolean(),
        })
        .strict()
    ),
    safetyTopics: z.array(z.record(z.unknown())),
    prices: z.array(bootstrapPriceSchema),
    recyclers: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          latitude: lat,
          longitude: lng,
          authorizationStatus: z.enum(["PENDING", "VERIFIED", "EXPIRED", "SUSPENDED"]),
          authorizationValidTill: iso.nullable(),
          pickupAvailable: z.boolean(),
          serviceRadiusKm: z.number().nonnegative(),
          contactPhone: z.string().nullable(),
          minimumWeightGrams: grams.nullish(),
          pickupChargePaise: paise.nullish(),
        })
        .strict()
    ),
    recyclerRates: z.array(
      z.object({ recyclerId: z.string(), categoryId: z.number().int(), ratePerKgPaise: paise, updatedAt: iso }).strict()
    ),
    collectionPoints: z.array(z.record(z.unknown())),
    areaCentroids: z.array(z.record(z.unknown())),
  })
  .strict();

// ---------- per-entity push payloads ----------

const cancelReason = z.enum(["PRICE_LOW", "SOLD_ELSEWHERE", "WRONG_MATERIAL", "OTHER"]);
const pushableLotState = z.enum(CLIENT_PUSHABLE_LOT_STATES as [string, ...string[]]);
const imageKind = z.enum(["COLLECTION", "HANDOVER", "DISPUTE", "TRAINING"]);
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/);

const lotCreate = z
  .object({
    id,
    lotRef: z.string().min(1),
    categoryId: z.number().int(),
    subCategory: z.string().optional(),
    description: z.string().optional(),
    approxWeightGrams: grams,
    estimatedValuePaise: paise.nullish(),
    estimatedMinPaise: paise.nullish(),
    estimatedMaxPaise: paise.nullish(),
    aiCategoryId: z.number().int().nullish(),
    aiConfidence: z.number().min(0).max(1).nullish(),
    transactionStatus: pushableLotState,
    expiresAt: iso.nullish(),
    collectedAt: iso,
    collectLat: lat.nullish(),
    collectLng: lng.nullish(),
    isHazardous: z.boolean().optional(),
    soldBy: z.string().nullish(),
  })
  .strict();

const lotUpdate = z
  .object({
    transactionStatus: pushableLotState.optional(),
    categoryId: z.number().int().optional(),
    isHazardous: z.boolean().optional(),
    description: z.string().optional(),
    approxWeightGrams: grams.optional(),
    estimatedValuePaise: paise.nullish(),
    estimatedMinPaise: paise.nullish(),
    estimatedMaxPaise: paise.nullish(),
    chosenRecyclerId: z.string().optional(),
    quotedRatePaise: paise.optional(),
    expectedValuePaise: paise.optional(),
    cancelReason: cancelReason.optional(),
    cancelledAt: iso.optional(),
  })
  .strict();

// Upload first, then push: `storageKey` comes from POST /uploads/presign and the object must already exist.
// TRAINING photos belong to no lot: they carry categoryId + angle and no lotId; every other kind needs lotId.
const lotImageCreate = z
  .object({
    id,
    lotId: id.optional(),
    kind: imageKind,
    storageKey: z.string().min(1).optional(),
    sha256: sha256Hex.optional(),
    bytes: z.number().int().positive().optional(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    takenAt: iso.optional(),
    imageHash: z.string().regex(/^[0-9a-f]{16}$/).nullish(),
    categoryId: z.number().int().optional(),
    angle: z.enum(["top", "side"]).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "TRAINING") {
      if (v.lotId !== undefined) ctx.addIssue({ code: "custom", path: ["lotId"], message: "TRAINING photos have no lotId" });
      if (v.categoryId === undefined) ctx.addIssue({ code: "custom", path: ["categoryId"], message: "TRAINING photos need categoryId" });
      if (v.angle === undefined) ctx.addIssue({ code: "custom", path: ["angle"], message: "TRAINING photos need angle" });
    } else if (v.lotId === undefined) {
      ctx.addIssue({ code: "custom", path: ["lotId"], message: "lotId is required" });
    }
  });

const location = {
  latitude: lat.optional(),
  longitude: lng.optional(),
  accuracy: z.number().nonnegative().optional(),
  locationSource: z.enum(["GPS", "NETWORK", "MANUAL"]).optional(),
  mockLocationFlag: z.boolean().optional(),
};

const handoverCreate = z
  .object({
    id,
    lotId: id,
    handoverRef: z.string().min(1),
    declaredWeightGrams: grams,
    qrPayload: z.string().min(1),
    codeHash: sha256Hex,
    capturedAt: iso,
    batchId: id.optional(),
    ...location,
  })
  .strict();

const handoverUpdate = z
  .object({
    packedSafely: z.boolean().optional(),
    acceptedByCollector: z.literal(true).optional(),
    status: z.enum(["CANCELLED", "DISPUTED"]).optional(),
    disputeId: id.optional(),
    arrivedAt: iso.optional(),
    arrivalDistanceM: z.number().nonnegative().optional(),
    ...location,
  })
  .strict();

const paymentCreate = z
  .object({
    id,
    lotId: id,
    batchId: id.optional(),
    amountPaise: z.number().int().positive(),
    method: z.enum(["CASH", "UPI"]),
    upiRef: z.string().nullish(),
    paidAt: iso,
  })
  .strict();

const disputeUpdate = z.object({ hasEvidence: z.boolean() }).strict();

const disputeCreate = z
  .object({
    id,
    lotId: id,
    handoverId: id,
    reason: z.enum(["WRONG_WEIGHT", "WRONG_PRICE", "MATERIAL_REJECTED", "OTHER"]),
    hasEvidence: z.boolean(),
    createdAt: iso,
  })
  .strict();

const pricePointCreate = z
  .object({
    id,
    categoryId: z.number().int(),
    buyingPricePaise: z.number().int().positive(),
    buyerType: z.enum(["MARKET", "SCRAP_DEALER", "RECYCLER"]),
    area: z.string().min(1),
    latitude: lat.nullish(),
    longitude: lng.nullish(),
    recordedAt: iso,
  })
  .strict();

const pickupRequestCreate = z.object({ id, lotId: id, recyclerId: z.string().min(1), slot: iso }).strict();
const pickupRequestUpdate = z.object({ status: z.literal("CANCELLED") }).strict();

const incidentCreate = z
  .object({
    id,
    type: z.enum(["burn", "cut", "battery_leak", "fumes", "other"]),
    note: z.string().nullish(),
    occurredAt: iso,
    latitude: lat.nullish(),
    longitude: lng.nullish(),
    lotId: id.optional(),
  })
  .strict();

const consentCreate = z
  .object({ id, version: z.string().min(1), language: languageSchema, locationConsent: z.boolean(), timestamp: iso })
  .strict();

const profileWrite = z
  .object({ preferredLanguage: languageSchema.optional(), operatingArea: z.string().min(2).optional() })
  .strict();

const batchHandoverCreate = z
  .object({
    id,
    batchRef: z.string().min(1),
    recyclerId: z.string().min(1),
    lotIds: z.array(id).min(1),
    totalWeightGrams: grams,
    qrPayload: z.string().min(1),
    codeHash: sha256Hex,
    capturedAt: iso,
  })
  .strict();

const dealerComparisonWrite = z
  .object({ id, lotId: id, categoryId: z.number().int(), dealerRatePaise: paise, ourRatePaise: paise, createdAt: iso })
  .strict();
const dealerComparisonUpdate = dealerComparisonWrite.omit({ id: true });

const ratingCreate = z
  .object({ id, recyclerId: z.string().min(1), rating: z.number().int().min(1).max(5), comment: z.string().nullish() })
  .strict();

const quizResultCreate = z
  .object({ id, topicId: z.string().min(1), score: z.number().int().nonnegative(), passed: z.boolean(), completedAt: iso })
  .strict();

const coverageRequestCreate = z
  .object({ id, latitude: lat, longitude: lng, categoryId: z.number().int(), approxWeightGrams: grams })
  .strict();

export type PushOp = "create" | "update";

export interface EntityContract {
  ops: readonly PushOp[];
  create?: z.ZodTypeAny;
  update?: z.ZodTypeAny;
  /** Fields a phone must never send; the server answers REJECTED / FORBIDDEN_FIELD (non-retryable). */
  serverOwned: readonly string[];
}

/** Every entity a phone may push. Order = server processing priority (parents first). */
export const ENTITY_CONTRACT = {
  lot: {
    ops: ["create", "update"],
    create: lotCreate,
    update: lotUpdate,
    serverOwned: ["finalPricePaise", "confirmedWeightGrams", "paymentStatus"],
  },
  lot_image: { ops: ["create"], create: lotImageCreate, serverOwned: [] },
  handover: {
    ops: ["create", "update"],
    create: handoverCreate,
    update: handoverUpdate,
    serverOwned: ["confirmedWeightGrams", "codeVerified", "weightToleranceStatus", "recyclerConfirmedAt", "locationClass", "distanceToRecyclerMeters"],
  },
  batch_handover: { ops: ["create"], create: batchHandoverCreate, serverOwned: ["status"] },
  payment: { ops: ["create"], create: paymentCreate, serverOwned: ["recordedBy", "confirmedByCollector", "canonicalId"] },
  price_point: { ops: ["create"], create: pricePointCreate, serverOwned: ["source", "recordedById"] },
  consent: { ops: ["create"], create: consentCreate, serverOwned: [] },
  pickup_request: {
    ops: ["create", "update"],
    create: pickupRequestCreate,
    update: pickupRequestUpdate,
    serverOwned: ["status", "expiresAt"],
  },
  coverage_request: { ops: ["create"], create: coverageRequestCreate, serverOwned: [] },
  dispute: { ops: ["create", "update"], create: disputeCreate, update: disputeUpdate, serverOwned: ["raisedBy", "status", "resolutionNote", "resolvedAt"] },
  incident: { ops: ["create"], create: incidentCreate, serverOwned: ["severity"] },
  quiz_result: { ops: ["create"], create: quizResultCreate, serverOwned: [] },
  rating: { ops: ["create"], create: ratingCreate, serverOwned: [] },
  profile: { ops: ["create", "update"], create: profileWrite, update: profileWrite, serverOwned: ["phone", "shortCode", "name", "collectorId"] },
  dealer_comparison: {
    ops: ["create", "update"],
    create: dealerComparisonWrite,
    update: dealerComparisonUpdate,
    serverOwned: [],
  },
} as const satisfies Record<string, EntityContract>;

export type PushEntity = keyof typeof ENTITY_CONTRACT;
export const PUSH_ENTITIES = Object.keys(ENTITY_CONTRACT) as PushEntity[];

/** Names the app used to push (or the server used to accept) that are no longer valid. */
export const RETIRED_PUSH_ENTITIES = {
  safety_incident: "incident",
  batch: "batch_handover",
  collector: "profile (registration is POST /auth/register)",
  recycler_rate: "none (recycler rates are edited in the recycler web portal and arrive via bootstrap)",
  transaction: "none (the server creates the transaction when a lot is quoted to a recycler)",
} as const;

export function isPushEntity(value: unknown): value is PushEntity {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENTITY_CONTRACT, value);
}
