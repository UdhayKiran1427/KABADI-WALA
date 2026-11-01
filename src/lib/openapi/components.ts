/**
 * Shared OpenAPI building blocks: security schemes, reusable responses and schemas.
 * Money is always integer PAISE and weight is always integer GRAMS (see docs/API.md).
 */

type Json = Record<string, unknown>;

export const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });

/** Success envelope: `{ "data": ... }` */
export const envelope = (data: Json): Json => ({
  type: "object",
  required: ["data"],
  properties: { data },
});

/** 2xx JSON response wrapped in the standard `{ data }` envelope. */
export const okJson = (description: string, data: Json): Json => ({
  description,
  content: { "application/json": { schema: envelope(data) } },
});

const errorResponse = (description: string, code: string): Json => ({
  description,
  content: {
    "application/json": {
      schema: ref("ErrorResponse"),
      example: { error: { code, message: description } },
    },
  },
});

export const securitySchemes: Json = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "Mobile JWT returned by `POST /api/v1/auth/login` (or register / pin-recovery / restore-on-new-phone). Valid for 30 days. The token carries the user's `role`.",
  },
  cookieAuth: {
    type: "apiKey",
    in: "cookie",
    name: "ewaste_session",
    description:
      "httpOnly web-portal session cookie (7 days) set when a Recycler / Admin / Field Agent / Collector signs in on the web portal.",
  },
  cronAuth: {
    type: "http",
    scheme: "bearer",
    description: "Static `CRON_SECRET` sent as `Authorization: Bearer <CRON_SECRET>`.",
  },
};

export const responses: Json = {
  BadRequest: errorResponse("Validation failed or malformed JSON", "VALIDATION_ERROR"),
  Unauthorized: errorResponse("Missing or invalid authentication", "UNAUTHORIZED"),
  Forbidden: errorResponse("Authenticated but not allowed to access this resource", "FORBIDDEN"),
  NotFound: errorResponse("Resource not found", "NOT_FOUND"),
  Conflict: errorResponse("Resource already exists", "PHONE_ALREADY_EXISTS"),
  TooManyRequests: errorResponse("Account temporarily locked after repeated failed logins", "ACCOUNT_LOCKED"),
  InternalError: errorResponse("Unexpected server error", "INTERNAL_ERROR"),
};

const int = { type: "integer" };
const str = { type: "string" };
const num = { type: "number" };
const bool = { type: "boolean" };
const dateTime = { type: "string", format: "date-time" };

export const schemas: Json = {
  ErrorResponse: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { ...str, example: "VALIDATION_ERROR" },
          message: str,
          details: { description: "Optional extra context (e.g. zod error tree)" },
        },
      },
    },
  },

  // ---------- Enums ----------
  Role: { type: "string", enum: ["COLLECTOR", "RECYCLER", "ADMIN", "FIELD_AGENT"] },
  Language: { type: "string", enum: ["HI", "MR", "EN"] },
  LotStatus: {
    type: "string",
    enum: ["DRAFT", "READY", "MATCHED", "HANDED_OVER", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "DISPUTED"],
  },
  TransactionStatus: {
    type: "string",
    enum: ["QUOTED", "ACCEPTED", "HANDED_OVER", "CONFIRMED", "PAID", "CANCELLED", "DISPUTED"],
  },
  BargainStatus: { type: "string", enum: ["NONE", "OFFER_BY_COLLECTOR", "OFFER_BY_RECYCLER", "AGREED"] },
  PaymentMethod: { type: "string", enum: ["CASH", "UPI"] },
  PickupStatus: {
    type: "string",
    enum: ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "COMPLETED", "EXPIRED", "CANCELLED"],
  },

  // ---------- Auth ----------
  CollectorProfile: {
    type: "object",
    properties: {
      collectorId: str,
      userId: str,
      shortCode: { ...str, example: "KW01" },
      preferredLanguage: ref("Language"),
      operatingArea: str,
      phone: { ...str, example: "9820000001" },
    },
  },
  AuthResult: {
    type: "object",
    properties: {
      token: { ...str, description: "JWT, valid 30 days" },
      profile: { allOf: [ref("CollectorProfile")], nullable: true, description: "null for non-collector roles" },
    },
  },
  Message: { type: "object", properties: { message: str } },

  // ---------- Domain ----------
  MaterialCategoryRef: {
    type: "object",
    properties: { id: int, code: str, nameEn: str, nameHi: str, nameMr: str, iconKey: str },
  },
  RecyclerContact: {
    type: "object",
    properties: { id: str, name: str, contactPhone: str, address: str },
  },
  Lot: {
    type: "object",
    description: "Lot row with related category / images / transaction / handovers / payments (relations vary per endpoint).",
    additionalProperties: true,
    properties: {
      id: { ...str, format: "uuid" },
      lotRef: { ...str, example: "LOT-261101-4921" },
      collectorId: str,
      categoryId: int,
      approxWeightGrams: int,
      estimatedValuePaise: { ...int, nullable: true },
      listedRatePerKgPaise: { ...int, nullable: true, description: "Admin's today's price at lot creation" },
      quotedRatePaise: { ...int, nullable: true },
      finalPricePaise: { ...int, nullable: true },
      status: ref("LotStatus"),
      transactionStatus: ref("TransactionStatus"),
      paymentStatus: { type: "string", enum: ["UNPAID", "PARTIAL", "PAID"] },
      collectedAt: dateTime,
      updatedAt: dateTime,
      category: ref("MaterialCategoryRef"),
      images: { type: "array", items: { type: "object", additionalProperties: true } },
      transaction: { type: "object", nullable: true, additionalProperties: true },
      handovers: { type: "array", items: { type: "object", additionalProperties: true } },
      payments: { type: "array", items: { type: "object", additionalProperties: true } },
    },
  },
  Notification: {
    type: "object",
    properties: {
      id: str,
      userId: str,
      title: str,
      body: str,
      isRead: bool,
      dataJson: { ...str, nullable: true, description: "JSON-encoded string" },
      createdAt: dateTime,
    },
  },
  PricePoint: {
    type: "object",
    additionalProperties: true,
    properties: {
      id: str,
      categoryId: int,
      subCategory: { ...str, nullable: true },
      buyingPricePaise: int,
      buyerType: { type: "string", enum: ["SCRAP_DEALER", "RECYCLER"] },
      area: str,
      district: str,
      latitude: { ...num, nullable: true },
      longitude: { ...num, nullable: true },
      source: { type: "string", enum: ["FIELD_AGENT", "RECYCLER", "ADMIN"] },
      recordedAt: dateTime,
    },
  },
  PriceBoardItem: {
    type: "object",
    properties: {
      categoryId: int,
      code: str,
      nameEn: str,
      nameHi: str,
      nameMr: str,
      iconKey: str,
      currentMedianPaise: int,
      currentMedianRupees: { ...str, example: "340.00" },
      trend: { type: "string", enum: ["UP", "DOWN", "FLAT"] },
      marketLowPaise: int,
      marketHighPaise: int,
      recyclerMinRatePaise: int,
      recyclerMaxRatePaise: int,
    },
  },
  RankedRecycler: {
    type: "object",
    properties: {
      id: str,
      name: str,
      latitude: num,
      longitude: num,
      contactPhone: str,
      distanceKm: num,
      compassDirection: str,
      ratePerKgPaise: int,
      pickupAvailable: bool,
      pickupChargePaise: int,
      expectedTotalPaise: int,
      rating: num,
      score: { ...num, description: "0–100 weighted score" },
      whyThisIsBest: str,
      rank: int,
    },
  },
  WeightTolerance: {
    type: "object",
    properties: {
      declaredWeightGrams: int,
      confirmedWeightGrams: int,
      differenceGrams: int,
      percentageDiff: num,
      autoAccepted: bool,
      requiresReview: bool,
      anomalySeverity: { type: "integer", enum: [0, 1, 2] },
    },
  },
  LocationProof: {
    type: "object",
    properties: {
      locationClass: { type: "string", enum: ["MATCH", "NEAR", "FAR", "UNKNOWN"] },
      distanceToRecyclerMeters: { ...int, nullable: true },
      spoofFlags: { type: "array", items: str },
      isFlagged: bool,
    },
  },
  BargainState: {
    type: "object",
    properties: {
      lotId: str,
      lotRef: str,
      category: str,
      approxWeightGrams: int,
      weightKg: str,
      transactionId: str,
      transactionStatus: ref("TransactionStatus"),
      quotedRatePerKgPaise: int,
      quotedRatePerKgRupees: num,
      quotedPricePaise: int,
      quotedPriceRupees: num,
      bargainStatus: ref("BargainStatus"),
      bargainRatePaise: { ...int, nullable: true },
      bargainRateRupees: { ...num, nullable: true },
      bargainBy: { type: "string", enum: ["COLLECTOR", "RECYCLER"], nullable: true },
      bargainNote: { ...str, nullable: true },
      agreedRatePaise: { ...int, nullable: true },
      agreedRateRupees: { ...num, nullable: true },
      callerRole: { type: "string", enum: ["COLLECTOR", "RECYCLER", "ADMIN"] },
      canAccept: bool,
      canCounter: bool,
      recycler: { allOf: [ref("RecyclerContact")], nullable: true },
    },
  },
  DealView: {
    type: "object",
    description: "Full deal after the collector selected a recycler. Visible to the lot's collector, the selected recycler and admins.",
    properties: {
      lotId: str,
      lotRef: str,
      lotStatus: ref("LotStatus"),
      material: {
        type: "object",
        properties: { categoryId: int, nameEn: str, nameHi: str, nameMr: str },
      },
      approxWeightGrams: int,
      ratePerKgPaise: int,
      amountPaise: int,
      paymentStatus: { type: "string", enum: ["UNPAID", "PARTIAL", "PAID"] },
      paymentToken: { ...str, nullable: true },
      payUrl: { ...str, nullable: true, description: "DEMO: opening/scanning this marks the deal paid" },
      invoiceUrl: { ...str, nullable: true },
      payment: {
        type: "object",
        nullable: true,
        properties: { id: str, method: ref("PaymentMethod"), reference: { ...str, nullable: true }, amountPaise: int, paidAt: dateTime },
      },
      collector: {
        type: "object",
        properties: { name: str, phone: str, shortCode: str, area: str, district: { ...str, nullable: true }, lotLatitude: { ...num, nullable: true }, lotLongitude: { ...num, nullable: true } },
      },
      recycler: {
        type: "object",
        properties: { id: str, name: str, phone: str, address: str, area: str, district: { ...str, nullable: true }, authorizationNo: str, latitude: num, longitude: num },
      },
    },
  },
  LotOfferStatus: { type: "string", enum: ["NOTIFIED", "INTERESTED", "DECLINED", "SELECTED", "NOT_SELECTED"] },
  PickupRequest: {
    type: "object",
    additionalProperties: true,
    properties: {
      id: str,
      collectorId: str,
      recyclerId: str,
      lotId: str,
      slot: dateTime,
      status: ref("PickupStatus"),
      expiresAt: dateTime,
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  SyncMutation: {
    type: "object",
    required: ["clientMutationId", "entity", "entityId", "op", "payload", "clientTimestamp"],
    properties: {
      clientMutationId: { ...str, description: "Idempotency key (UUID)" },
      entity: {
        type: "string",
        enum: [
          "lot", "lot_image", "transaction", "handover", "payment", "price_point", "pickup_request",
          "coverage_request", "consent", "dispute", "incident", "quiz_result", "rating",
        ],
      },
      entityId: str,
      op: { type: "string", enum: ["create", "update"] },
      payload: { type: "object", additionalProperties: true },
      clientTimestamp: dateTime,
    },
  },
  SyncResult: {
    type: "object",
    properties: {
      clientMutationId: str,
      status: { type: "string", enum: ["APPLIED", "DUPLICATE", "CONFLICT", "REJECTED"] },
      retryable: bool,
      serverState: { description: "Present on CONFLICT" },
      message: str,
    },
    additionalProperties: true,
  },
};
