import { okJson, ref } from "./components";

type Json = Record<string, unknown>;

/** "PUBLIC" operations need no sign-in and appear in every role's spec. */
export type DocRole = "COLLECTOR" | "RECYCLER" | "ADMIN" | "FIELD_AGENT" | "PUBLIC";

export interface OperationDef {
  path: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  roles: DocRole[];
  operation: Json;
}

const r = (name: string): Json => ({ $ref: `#/components/responses/${name}` });

const bearer = [{ bearerAuth: [] }];
const bearerOrCookie = [{ bearerAuth: [] }, { cookieAuth: [] }];
const cron = [{ cronAuth: [] }];

const idParam = (name: string, description: string): Json => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
});

const query = (name: string, schema: Json, description: string, required = false): Json => ({
  name,
  in: "query",
  required,
  description,
  schema,
});

const body = (schema: Json, example?: Json): Json => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

const baseErrors = { "500": r("InternalError") };
const authErrors = { "401": r("Unauthorized"), ...baseErrors };

const LOT_ID = idParam("id", "Lot id (client UUID)");
const ALL_AUTHED: DocRole[] = ["COLLECTOR", "RECYCLER", "ADMIN", "FIELD_AGENT"];

export const operations: OperationDef[] = [
  // ======================= SYSTEM =======================
  {
    path: "/api/v1/health",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["System"],
      operationId: "getHealth",
      summary: "Service and database replica-set health",
      security: [],
      responses: {
        "200": okJson("Service is up", {
          type: "object",
          properties: { status: { type: "string", example: "UP" }, timestamp: { type: "string", format: "date-time" }, database: { type: "string" }, environment: { type: "string" } },
        }),
        "503": { description: "Database health check failed", content: { "application/json": { schema: ref("ErrorResponse") } } },
      },
    },
  },

  // ======================= AUTH =======================
  {
    path: "/api/v1/auth/register",
    method: "post",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Auth"],
      operationId: "registerCollector",
      summary: "Self-register a new collector",
      description: "Creates a `COLLECTOR` user + profile with minimal PII (phone, 4-digit PIN, language, area, consent) and returns a 30-day JWT.",
      security: [],
      requestBody: body(
        {
          type: "object",
          required: ["name", "phone", "pin", "operatingArea"],
          properties: {
            name: { type: "string", minLength: 2 },
            phone: { type: "string", pattern: "^\\d{10}$" },
            pin: { type: "string", pattern: "^\\d{4}$" },
            preferredLanguage: { ...ref("Language"), default: "HI" },
            operatingArea: { type: "string", minLength: 2 },
            district: { type: "string" },
            consent: {
              type: "object",
              properties: { version: { type: "string", default: "1.0" }, locationConsent: { type: "boolean", default: true } },
            },
          },
        },
        { name: "Ramesh Kumar", phone: "9820000001", pin: "1234", preferredLanguage: "HI", operatingArea: "Dharavi Matunga Labour Camp", district: "Mumbai", consent: { version: "1.0", locationConsent: true } }
      ),
      responses: { "201": okJson("Collector created", ref("AuthResult")), "400": r("BadRequest"), "409": r("Conflict"), ...baseErrors },
    },
  },
  {
    path: "/api/v1/auth/login",
    method: "post",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Auth"],
      operationId: "login",
      summary: "Collector sign-in with phone + 4-digit PIN",
      description:
        "Collectors use a PIN here; recycler staff and admins sign in with a password via `POST /api/v1/auth/staff-login`. The JWT carries the user's `role`. Locked for 15 minutes after 5 failed attempts.",
      security: [],
      requestBody: body(
        {
          type: "object",
          required: ["phone", "pin"],
          properties: { phone: { type: "string", pattern: "^\\d{10}$" }, pin: { type: "string", pattern: "^\\d{4}$" } },
        },
        { phone: "9820000001", pin: "1234" }
      ),
      responses: { "200": okJson("Signed in", ref("AuthResult")), "400": r("BadRequest"), "401": r("Unauthorized"), "429": r("TooManyRequests"), ...baseErrors },
    },
  },
  {
    path: "/api/v1/auth/pin-recovery",
    method: "post",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Auth"],
      operationId: "recoverPin",
      summary: "OTP-free PIN recovery (collectors)",
      description: "Verifies phone + collector `shortCode` + operating area, then sets a new PIN, clears the lockout and returns a fresh token.",
      security: [],
      requestBody: body(
        {
          type: "object",
          required: ["phone", "shortCode", "operatingArea", "newPin"],
          properties: {
            phone: { type: "string", pattern: "^\\d{10}$" },
            shortCode: { type: "string", minLength: 3, maxLength: 6 },
            operatingArea: { type: "string", minLength: 2 },
            newPin: { type: "string", pattern: "^\\d{4}$" },
          },
        },
        { phone: "9820000001", shortCode: "KW01", operatingArea: "Dharavi", newPin: "5678" }
      ),
      responses: {
        "200": okJson("PIN updated", { allOf: [ref("AuthResult"), ref("Message")] }),
        "400": r("BadRequest"),
        "403": r("Forbidden"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/auth/restore-on-new-phone",
    method: "post",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Auth"],
      operationId: "restoreOnNewPhone",
      summary: "Restore a collector session on a new device",
      description: "Returns the profile plus `lotCounter` so the app can resume offline lot numbering.",
      security: [],
      requestBody: body(
        {
          type: "object",
          required: ["phone", "pin", "deviceId"],
          properties: { phone: { type: "string", pattern: "^\\d{10}$" }, pin: { type: "string", pattern: "^\\d{4}$" }, deviceId: { type: "string", minLength: 4 } },
        },
        { phone: "9820000001", pin: "1234", deviceId: "new-device-id" }
      ),
      responses: { "200": okJson("Session restored", ref("AuthResult")), "400": r("BadRequest"), "401": r("Unauthorized"), ...baseErrors },
    },
  },
  {
    path: "/api/v1/auth/me",
    method: "get",
    roles: ALL_AUTHED,
    operation: {
      tags: ["Auth"],
      operationId: "getMe",
      summary: "Profile of the signed-in user",
      description: "`collector` is set for collectors, `recycler` for recycler staff; both are `null` otherwise. The flat collector fields are kept for older app builds.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Profile", {
          type: "object",
          properties: {
            userId: { type: "string" },
            phone: { type: "string" },
            role: ref("Role"),
            language: ref("Language"),
            collectorId: { type: "string", description: "Legacy top-level field (collectors)" },
            shortCode: { type: "string", description: "Legacy top-level field (collectors)" },
            preferredLanguage: ref("Language"),
            operatingArea: { type: "string" },
            district: { type: "string", nullable: true },
            collector: {
              type: "object",
              nullable: true,
              properties: { id: { type: "string" }, name: { type: "string", nullable: true }, shortCode: { type: "string" }, preferredLanguage: ref("Language"), operatingArea: { type: "string" }, district: { type: "string", nullable: true } },
            },
            recycler: {
              type: "object",
              nullable: true,
              properties: { id: { type: "string" }, name: { type: "string" }, address: { type: "string" }, contactPhone: { type: "string" }, authorizationStatus: { type: "string", enum: ["PENDING", "VERIFIED", "EXPIRED", "SUSPENDED"] }, latitude: { type: "number" }, longitude: { type: "number" } },
            },
          },
        }),
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/auth/change-pin",
    method: "post",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Auth"],
      operationId: "changePin",
      summary: "Change the signed-in collector's PIN",
      security: bearer,
      requestBody: body({
        type: "object",
        required: ["oldPin", "newPin"],
        properties: { oldPin: { type: "string", pattern: "^\\d{4}$" }, newPin: { type: "string", pattern: "^\\d{4}$" } },
      }),
      responses: { "200": okJson("PIN changed", ref("Message")), "400": r("BadRequest"), "404": r("NotFound"), ...authErrors },
    },
  },

  // ======================= REFERENCE & PRICING (public) =======================
  {
    path: "/api/v1/reference/bootstrap",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Reference & Pricing"],
      operationId: "getReferenceBootstrap",
      summary: "Full reference snapshot for the mobile cache",
      description: "Categories, safety topics, recent prices (max 200), VERIFIED recyclers + current rates, collection points and area centroids.",
      security: [],
      parameters: [query("since", { type: "string", format: "date-time" }, "Only return prices recorded after this ISO timestamp")],
      responses: {
        "200": okJson("Snapshot", {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" },
            categories: { type: "array", items: { type: "object", additionalProperties: true } },
            safetyTopics: { type: "array", items: { type: "object", additionalProperties: true } },
            prices: { type: "array", items: { type: "object", additionalProperties: true } },
            recyclers: { type: "array", items: { type: "object", additionalProperties: true } },
            recyclerRates: {
              type: "array",
              items: { type: "object", properties: { recyclerId: { type: "string" }, categoryId: { type: "integer" }, ratePerKgPaise: { type: "integer" } } },
            },
            collectionPoints: { type: "array", items: { type: "object", additionalProperties: true } },
            areaCentroids: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        }),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/prices/board",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Reference & Pricing"],
      operationId: "getPriceBoard",
      summary: "Daily rate board with trend arrows",
      description: "Median rate per kg for every active category with a ±3% trend (`UP` / `DOWN` / `FLAT`) vs the previous week.",
      security: [],
      responses: {
        "200": okJson("Price board", {
          type: "object",
          properties: { updatedAt: { type: "string", format: "date-time" }, board: { type: "array", items: ref("PriceBoardItem") } },
        }),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/prices/history",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Reference & Pricing"],
      operationId: "getPriceHistory",
      summary: "Price history",
      security: [],
      parameters: [
        query("categoryId", { type: "integer" }, "Filter by material category"),
        query("days", { type: "integer", minimum: 7, maximum: 90, default: 30 }, "Look-back window (clamped to 7–90)"),
      ],
      responses: {
        "200": okJson("History", {
          type: "object",
          properties: { days: { type: "integer" }, count: { type: "integer" }, history: { type: "array", items: ref("PricePoint") } },
        }),
        "400": r("BadRequest"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/estimate",
    method: "post",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Reference & Pricing"],
      operationId: "estimateValue",
      summary: "Instant value estimate with ±10% band",
      security: [],
      requestBody: body(
        { type: "object", required: ["categoryId", "approxWeightGrams"], properties: { categoryId: { type: "integer", minimum: 1 }, approxWeightGrams: { type: "integer", minimum: 1 } } },
        { categoryId: 1, approxWeightGrams: 5000 }
      ),
      responses: {
        "200": okJson("Estimate", {
          type: "object",
          properties: {
            categoryId: { type: "integer" },
            approxWeightGrams: { type: "integer" },
            medianRatePaisePerKg: { type: "integer" },
            minRatePaisePerKg: { type: "integer" },
            maxRatePaisePerKg: { type: "integer" },
            estimatedValuePaise: { type: "integer" },
            estimatedMinPaise: { type: "integer" },
            estimatedMaxPaise: { type: "integer" },
            source: { type: "string", example: "PRICE_HISTORY" },
            formatted: { type: "object", properties: { ratePerKg: { type: "string", example: "₹340.00/kg" }, estimate: { type: "string", example: "₹1700" }, range: { type: "string", example: "₹1530 – ₹1870" } } },
          },
        }),
        "400": r("BadRequest"),
        ...baseErrors,
      },
    },
  },

  // ======================= MATCHING (public) =======================
  {
    path: "/api/v1/recyclers/match",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Matching"],
      operationId: "matchRecyclers",
      summary: "Ranked authorized recyclers",
      description: "Expanding radius (5→10→25→50 km) until ≥3 candidates; scored out of 100 (rate 40, distance 30, pickup 10, rating 10, freshness 10).",
      security: [],
      parameters: [
        query("categoryId", { type: "integer" }, "Material category", true),
        query("approxWeightGrams", { type: "integer" }, "Approximate weight in grams", true),
        query("latitude", { type: "number" }, "Collector latitude", true),
        query("longitude", { type: "number" }, "Collector longitude", true),
        query("pickupRequired", { type: "boolean", default: false }, "Only recyclers offering doorstep pickup"),
      ],
      responses: {
        "200": okJson("Ranking", {
          type: "object",
          properties: {
            searchRadiusKm: { type: "number" },
            totalFound: { type: "integer" },
            recyclers: { type: "array", items: ref("RankedRecycler") },
            exclusions: { type: "array", items: { type: "object", properties: { recyclerId: { type: "string" }, name: { type: "string" }, reason: { type: "string" } } } },
          },
        }),
        "400": r("BadRequest"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/recyclers/nearby",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Matching"],
      operationId: "getNearbyRecyclers",
      summary: "VERIFIED recyclers within a radius",
      security: [],
      parameters: [
        query("latitude", { type: "number", minimum: -90, maximum: 90 }, "Latitude", true),
        query("longitude", { type: "number", minimum: -180, maximum: 180 }, "Longitude", true),
        query("radiusKm", { type: "number", default: 25 }, "Search radius in km"),
      ],
      responses: {
        "200": okJson("Nearby recyclers", {
          type: "object",
          properties: { count: { type: "integer" }, radiusKm: { type: "number" }, recyclers: { type: "array", items: { type: "object", additionalProperties: true } } },
        }),
        "400": r("BadRequest"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/collection-points",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Matching"],
      operationId: "getCollectionPoints",
      summary: "Collection / drop points",
      description: "Pass both `latitude` and `longitude` to filter by `radiusKm` and sort by distance; otherwise returns all points.",
      security: [],
      parameters: [
        query("latitude", { type: "number" }, "Latitude (requires longitude)"),
        query("longitude", { type: "number" }, "Longitude (requires latitude)"),
        query("radiusKm", { type: "number", default: 30 }, "Radius in km"),
      ],
      responses: {
        "200": okJson("Points", { type: "object", properties: { count: { type: "integer" }, points: { type: "array", items: { type: "object", additionalProperties: true } } } }),
        "400": r("BadRequest"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/receipts/{token}",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Reference & Pricing"],
      operationId: "getPublicReceipt",
      summary: "Anonymised public receipt by share token",
      security: [],
      parameters: [idParam("token", "Receipt share token")],
      responses: {
        "200": okJson("Receipt", {
          type: "object",
          properties: {
            receipt: {
              type: "object",
              properties: { lotRef: { type: "string" }, categoryName: { type: "string" }, weightKg: { type: "string" }, finalPriceRupees: { type: "string" }, confirmedAt: { type: "string", format: "date-time" }, recyclerName: { type: "string" }, authorizationNo: { type: "string" } },
            },
          },
        }),
        "404": r("NotFound"),
        "410": { description: "Receipt link expired", content: { "application/json": { schema: ref("ErrorResponse") } } },
        ...baseErrors,
      },
    },
  },

  // ======================= LOTS =======================
  {
    path: "/api/v1/lots",
    method: "get",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Lots"],
      operationId: "listMyLots",
      summary: "List the signed-in collector's lots",
      security: bearerOrCookie,
      parameters: [query("status", ref("LotStatus"), "Filter by lot status")],
      responses: {
        "200": okJson("Lots", { type: "object", properties: { count: { type: "integer" }, lots: { type: "array", items: ref("Lot") } } }),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/lots",
    method: "post",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Lots"],
      operationId: "createLot",
      summary: "Create a DRAFT lot valued at today's price",
      description:
        "Step 1 of the lot flow. The lot is priced from the admin-set rate (`GET /api/v1/prices/today`); creation fails with `PRICE_NOT_SET` if the admin has not set one, and `LOCATION_REQUIRED` if no coordinates are given. Next step: `POST /api/v1/lots/{id}/confirm`.",
      security: bearerOrCookie,
      requestBody: body(
        {
          type: "object",
          required: ["categoryId", "approxWeightGrams"],
          properties: {
            id: { type: "string", format: "uuid", description: "Optional client-generated UUID" },
            categoryId: { type: "integer", minimum: 1 },
            approxWeightGrams: { type: "integer", minimum: 1 },
            latitude: { type: "number", description: "Used to find recyclers within 5 km" },
            longitude: { type: "number" },
            deviceLat: { type: "number", deprecated: true, description: "Older app builds; use `latitude`" },
            deviceLng: { type: "number", deprecated: true, description: "Older app builds; use `longitude`" },
            photos: { type: "array", items: { type: "string" }, description: "Storage keys obtained from /uploads/presign (validated against the caller)" },
          },
        },
        { categoryId: 1, approxWeightGrams: 5000, latitude: 19.0434, longitude: 72.8567, photos: [] }
      ),
      responses: {
        "201": okJson("Lot created", {
          type: "object",
          properties: {
            lot: {
              type: "object",
              properties: {
                id: { type: "string" },
                lotRef: { type: "string" },
                status: ref("LotStatus"),
                categoryId: { type: "integer" },
                categoryName: { type: "string" },
                approxWeightGrams: { type: "integer" },
                listedRatePerKgPaise: { type: "integer", nullable: true, description: "Admin's today's price at creation" },
                estimatedValuePaise: { type: "integer", nullable: true },
                latitude: { type: "number", nullable: true },
                longitude: { type: "number", nullable: true },
                collectedAt: { type: "string", format: "date-time" },
              },
            },
          },
        }),
        "400": r("BadRequest"),
        "409": r("Conflict"),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/lots/{id}",
    method: "get",
    roles: ["COLLECTOR", "ADMIN"],
    operation: {
      tags: ["Lots"],
      operationId: "getLot",
      summary: "Lot detail",
      description: "Collectors may only read their own lots; `ADMIN` can read any lot.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: { "200": okJson("Lot", { type: "object", properties: { lot: ref("Lot") } }), "403": r("Forbidden"), "404": r("NotFound"), ...authErrors },
    },
  },
  {
    path: "/api/v1/lots/{id}",
    method: "delete",
    roles: ["COLLECTOR", "ADMIN"],
    operation: {
      tags: ["Lots"],
      operationId: "deleteLot",
      summary: "Delete a lot and its dependent rows",
      description: "Owner collector or `ADMIN`. Rejected with `INVALID_STATE` once the lot is `HANDED_OVER` or `COMPLETED`.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: {
        "200": okJson("Deleted", { type: "object", properties: { message: { type: "string" }, deletedLotId: { type: "string" } } }),
        "400": r("BadRequest"),
        "403": r("Forbidden"),
        "404": r("NotFound"),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/match-recycler",
    method: "post",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Lots"],
      operationId: "matchRecyclerToLot",
      deprecated: true,
      summary: "RETIRED — always returns 410",
      description:
        "Collectors no longer pick a recycler directly. Use `POST /api/v1/lots/{id}/confirm`, then `GET /api/v1/lots/{id}/offers` and `POST /api/v1/lots/{id}/select`.",
      security: [],
      parameters: [LOT_ID],
      responses: {
        "410": { description: "Endpoint retired (`ENDPOINT_RETIRED`)", content: { "application/json": { schema: ref("ErrorResponse") } } },
      },
    },
  },

  // ======================= BARGAINING =======================
  {
    path: "/api/v1/lots/{id}/bargain",
    method: "get",
    roles: ["COLLECTOR", "RECYCLER", "ADMIN"],
    operation: {
      tags: ["Bargaining"],
      operationId: "getBargainState",
      summary: "Current negotiation state",
      description: "Only participants of the lot's transaction (owner collector, matched recycler staff) or `ADMIN`. `callerRole`, `canAccept` and `canCounter` are computed for the caller.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: { "200": okJson("Bargain state", ref("BargainState")), "400": r("BadRequest"), "403": r("Forbidden"), "404": r("NotFound"), ...authErrors },
    },
  },
  {
    path: "/api/v1/lots/{id}/bargain/offer",
    method: "post",
    roles: ["COLLECTOR", "RECYCLER", "ADMIN"],
    operation: {
      tags: ["Bargaining"],
      operationId: "submitBargainOffer",
      summary: "Submit an offer / counter-offer",
      description: "Provide `offerRatePaise` or `offerRateRupees`. Notifies the other party. Not allowed once the transaction is `PAID` or `CANCELLED`.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      requestBody: body(
        { type: "object", properties: { offerRatePaise: { type: "integer", minimum: 1 }, offerRateRupees: { type: "number", exclusiveMinimum: true, minimum: 0 }, note: { type: "string", maxLength: 200 } }, description: "At least one of offerRatePaise / offerRateRupees is required" },
        { offerRateRupees: 48, note: "Can meet at ₹48/kg if delivered before 4 PM" }
      ),
      responses: {
        "200": okJson("Offer recorded", {
          type: "object",
          properties: {
            message: { type: "string" },
            bargain: {
              type: "object",
              properties: { lotId: { type: "string" }, transactionId: { type: "string" }, bargainRatePaise: { type: "integer" }, bargainRateRupees: { type: "number" }, bargainBy: { type: "string", enum: ["COLLECTOR", "RECYCLER"] }, bargainStatus: ref("BargainStatus"), bargainNote: { type: "string" } },
            },
          },
        }),
        "400": r("BadRequest"),
        "403": r("Forbidden"),
        "404": r("NotFound"),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/bargain/accept",
    method: "post",
    roles: ["COLLECTOR", "RECYCLER", "ADMIN"],
    operation: {
      tags: ["Bargaining"],
      operationId: "acceptBargainOffer",
      summary: "Accept the other party's pending offer",
      description: "Locks `agreedRatePaise`, recomputes the price and notifies the other party. A party cannot accept its own offer (`ADMIN` may accept either).",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: {
        "200": okJson("Agreed", {
          type: "object",
          properties: {
            message: { type: "string" },
            agreedDeal: {
              type: "object",
              properties: { lotId: { type: "string" }, transactionId: { type: "string" }, agreedRatePaise: { type: "integer" }, agreedRateRupees: { type: "number" }, agreedPricePaise: { type: "integer" }, agreedPriceRupees: { type: "number" }, bargainStatus: { type: "string", example: "AGREED" } },
            },
          },
        }),
        "400": r("BadRequest"),
        "403": r("Forbidden"),
        "404": r("NotFound"),
        ...authErrors,
      },
    },
  },

  // ======================= HANDOVER =======================
  {
    path: "/api/v1/lots/{id}/handover",
    method: "get",
    roles: ["COLLECTOR", "RECYCLER", "ADMIN"],
    operation: {
      tags: ["Handover"],
      operationId: "getHandoverInfo",
      summary: "Verification code + QR payload for a lot",
      description:
        "Used by the collector to show the 4-digit code / QR, and by the recycler to read it. ⚠ The route only checks that the caller is signed in — it does not verify participation in the lot.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: {
        "200": okJson("Handover info", {
          type: "object",
          properties: {
            lotId: { type: "string" },
            lotRef: { type: "string" },
            category: { type: "string" },
            declaredWeightGrams: { type: "integer" },
            declaredWeightKg: { type: "string" },
            verificationCode: { type: "string", example: "4921" },
            qrPayload: { type: "string", example: "EWASTE:<lotId>:4921:5000" },
            status: ref("LotStatus"),
            transaction: { type: "object", nullable: true, additionalProperties: true },
            latestHandover: { type: "object", nullable: true, additionalProperties: true },
          },
        }),
        "404": r("NotFound"),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/handover",
    method: "post",
    roles: ["RECYCLER", "ADMIN"],
    operation: {
      tags: ["Handover"],
      operationId: "submitHandover",
      summary: "Record scale weight, payment and complete the lot",
      description:
        "Runs weight tolerance (5% / 25% / 40%) and location proof (`MATCH` / `NEAR` / `FAR`), writes the handover + payment, sets the transaction to `PAID` and the lot to `COMPLETED`, then notifies the collector. Payment is recorded with `recordedBy: RECYCLER`. ⚠ The route only checks that the caller is signed in; role/participation is not enforced in code.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      requestBody: body(
        {
          type: "object",
          required: ["scaleWeightGrams"],
          properties: {
            verificationCode: { type: "string" },
            scaleWeightGrams: { type: "integer", minimum: 1 },
            paymentMode: { ...ref("PaymentMethod"), default: "CASH" },
            paymentRef: { type: "string", description: "UPI reference" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            gpsAccuracyMeters: { type: "number" },
            mockLocationFlag: { type: "boolean", default: false },
          },
        },
        { verificationCode: "4921", scaleWeightGrams: 5100, paymentMode: "CASH", latitude: 19.0435, longitude: 72.8568, gpsAccuracyMeters: 15, mockLocationFlag: false }
      ),
      responses: {
        "201": okJson("Handover completed", {
          type: "object",
          properties: {
            message: { type: "string" },
            lotId: { type: "string" },
            lotRef: { type: "string" },
            confirmedWeightGrams: { type: "integer" },
            confirmedWeightKg: { type: "string" },
            tolerance: ref("WeightTolerance"),
            locationProof: ref("LocationProof"),
            payment: { type: "object", properties: { id: { type: "string" }, amountPaise: { type: "integer" }, amountRupees: { type: "number" }, method: ref("PaymentMethod"), status: { type: "string", example: "PAID" } } },
            handoverId: { type: "string" },
          },
        }),
        "400": r("BadRequest"),
        "404": r("NotFound"),
        ...authErrors,
      },
    },
  },

  // ======================= COLLECTOR SERVICES =======================
  {
    path: "/api/v1/ledger",
    method: "get",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Collector Services"],
      operationId: "getLedger",
      summary: "Earnings ledger (received vs pending)",
      security: bearer,
      responses: {
        "200": okJson("Ledger", {
          type: "object",
          properties: {
            receivedPaise: { type: "integer" },
            receivedRupees: { type: "string" },
            pendingPaise: { type: "integer" },
            pendingRupees: { type: "string" },
            totalLots: { type: "integer" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lotId: { type: "string" }, lotRef: { type: "string" }, categoryName: { type: "string" }, categoryNameHi: { type: "string" },
                  status: ref("LotStatus"), approxWeightGrams: { type: "integer" }, finalPricePaise: { type: "integer", nullable: true },
                  paidPaise: { type: "integer" }, pendingPaise: { type: "integer" }, paymentStatus: { type: "string" }, recyclerName: { type: "string", nullable: true },
                  payments: { type: "array", items: { type: "object", additionalProperties: true } },
                },
              },
            },
          },
        }),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/pickup-requests",
    method: "get",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Collector Services"],
      operationId: "listPickupRequests",
      summary: "List my doorstep pickup requests",
      security: bearer,
      responses: { "200": okJson("Requests", { type: "object", properties: { requests: { type: "array", items: ref("PickupRequest") } } }), ...authErrors },
    },
  },
  {
    path: "/api/v1/pickup-requests",
    method: "post",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Collector Services"],
      operationId: "createPickupRequest",
      summary: "Request a doorstep pickup (expires in 24 h)",
      security: bearer,
      requestBody: body(
        { type: "object", required: ["lotId", "recyclerId", "slot"], properties: { lotId: { type: "string" }, recyclerId: { type: "string" }, slot: { type: "string", format: "date-time" } } },
        { lotId: "c7a84091-6453-48b4-934d-17688dbba142", recyclerId: "rec-mumbai-01", slot: "2026-11-02T10:00:00.000Z" }
      ),
      responses: { "201": okJson("Requested", { type: "object", properties: { message: { type: "string" }, pickupRequest: ref("PickupRequest") } }), "400": r("BadRequest"), "403": r("Forbidden"), ...authErrors },
    },
  },
  {
    path: "/api/v1/coverage-requests",
    method: "post",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Collector Services"],
      operationId: "createCoverageRequest",
      summary: "Record unserviced-area demand",
      security: bearer,
      requestBody: body(
        { type: "object", required: ["latitude", "longitude", "categoryId", "approxWeightGrams"], properties: { latitude: { type: "number" }, longitude: { type: "number" }, categoryId: { type: "integer" }, approxWeightGrams: { type: "integer", minimum: 1 } } },
        { latitude: 19.043, longitude: 72.856, categoryId: 1, approxWeightGrams: 5000 }
      ),
      responses: { "201": okJson("Recorded", { type: "object", properties: { message: { type: "string" }, id: { type: "string" } } }), "400": r("BadRequest"), ...authErrors },
    },
  },

  // ======================= SYNC =======================
  {
    path: "/api/v1/sync/push",
    method: "post",
    roles: ["COLLECTOR", "FIELD_AGENT"],
    operation: {
      tags: ["Sync"],
      operationId: "syncPush",
      summary: "Push offline mutations (outbox)",
      description: "Up to 100 mutations; parents are applied first. Each item is validated on its own (a malformed one is a per-item `REJECTED / INVALID_PAYLOAD`). Results come back in request order, each with `clientMutationId`, `status` (`APPLIED`, `DUPLICATE` only for a repeat of an applied mutation, `CONFLICT`, `REJECTED`), `code`, `message`, `retryable`. `REJECTED` + `retryable:true` is not remembered, so the same mutation can be resent. Contract: docs/sync-contract.md.",
      security: bearer,
      requestBody: body(
        { type: "object", required: ["deviceId", "mutations"], properties: { deviceId: { type: "string" }, mutations: { type: "array", maxItems: 100, items: ref("SyncMutation") } } },
        {
          deviceId: "android-device-uuid",
          mutations: [
            { clientMutationId: "mutation-uuid-1", entity: "lot", entityId: "lot-uuid-1", op: "create", payload: { id: "lot-uuid-1", lotRef: "LOT-KW01-261101-0001", categoryId: 1, approxWeightGrams: 5000, transactionStatus: "SAVED", collectedAt: "2026-11-01T10:00:00.000Z" }, clientTimestamp: "2026-11-01T10:00:05.000Z" },
          ],
        }
      ),
      responses: {
        "200": okJson("Per-mutation results", { type: "object", properties: { deviceId: { type: "string" }, serverTimestamp: { type: "string", format: "date-time" }, totalMutations: { type: "integer" }, results: { type: "array", items: ref("SyncResult") } } }),
        "400": r("BadRequest"),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/sync/pull",
    method: "get",
    roles: ["COLLECTOR", "FIELD_AGENT"],
    operation: {
      tags: ["Sync"],
      operationId: "syncPull",
      summary: "Pull server-side changes since a cursor",
      description: "Lots, notifications and pickup requests changed after `since`, paged as one stream (at most `limit` items in total, default 200, max 500). `since` is an ISO time or a `nextSince` value returned earlier (opaque; send it back unchanged). Loop while `hasMore`. `lotUpdates` announces server-decided lot states (`CONFIRMED`, `PAID`, `REJECTED`, `DISPUTED`) in the client vocabulary. Contract: docs/sync-contract.md §4.",
      security: bearer,
      parameters: [
        query("since", { type: "string" }, "ISO time, or `nextSince` from the previous pull"),
        query("limit", { type: "integer", minimum: 1, maximum: 500 }, "Items per response across all collections"),
      ],
      responses: {
        "200": okJson("Changes", {
          type: "object",
          properties: {
            serverTimestamp: { type: "string", format: "date-time" },
            nextSince: { type: "string", description: "Opaque cursor: `<ISO>|<kind>|<id>`" },
            hasMore: { type: "boolean" },
            lots: { type: "array", items: { type: "object", additionalProperties: true } },
            lotUpdates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lotId: { type: "string" },
                  transactionStatus: { type: "string", enum: ["CONFIRMED", "PAID", "REJECTED", "DISPUTED"] },
                  finalPricePaise: { type: "integer", nullable: true },
                  confirmedWeightGrams: { type: "integer", nullable: true },
                  paymentStatus: { type: "string", enum: ["UNPAID", "PARTIAL", "PAID"] },
                  confirmedAt: { type: "string", format: "date-time", nullable: true },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
            notifications: { type: "array", items: ref("Notification") },
            pickupRequests: { type: "array", items: ref("PickupRequest") },
          },
        }),
        "400": r("BadRequest"),
        ...authErrors,
      },
    },
  },

  // ======================= UPLOADS =======================
  {
    path: "/api/v1/uploads/presign",
    method: "post",
    roles: ["COLLECTOR"],
    operation: {
      tags: ["Uploads"],
      operationId: "presignUpload",
      summary: "Get an upload URL + storage key",
      description: "Returned `storageKey` is prefixed `images/{userId}/` and must be used in lot `photos` / `lot_image` mutations.",
      security: bearer,
      requestBody: body(
        { type: "object", required: ["filename"], properties: { filename: { type: "string" }, contentType: { type: "string", default: "image/jpeg" } } },
        { filename: "pcb_lot_1.jpg", contentType: "image/jpeg" }
      ),
      responses: {
        "200": okJson("Presigned upload", { type: "object", properties: { uploadUrl: { type: "string" }, storageKey: { type: "string" }, expiresInSeconds: { type: "integer", example: 3600 } } }),
        "400": r("BadRequest"),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/uploads/local",
    method: "put",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Uploads"],
      operationId: "uploadLocalFile",
      summary: "Upload raw bytes to local storage (dev driver)",
      description: "Target of the `uploadUrl` returned by `/uploads/presign` when `STORAGE_DRIVER=local`. ⚠ No authentication is enforced by this route.",
      security: [],
      parameters: [query("key", { type: "string" }, "Sanitised storage key", true)],
      requestBody: { required: true, content: { "application/octet-stream": { schema: { type: "string", format: "binary" } }, "image/jpeg": { schema: { type: "string", format: "binary" } } } },
      responses: {
        "200": okJson("Stored", { type: "object", properties: { message: { type: "string" }, storageKey: { type: "string" }, bytes: { type: "integer" } } }),
        "400": r("BadRequest"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/uploads/local",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Uploads"],
      operationId: "downloadLocalFile",
      summary: "Read a locally stored file",
      security: [],
      parameters: [query("key", { type: "string" }, "Storage key", true)],
      responses: {
        "200": { description: "File bytes (served as image/jpeg)", content: { "image/jpeg": { schema: { type: "string", format: "binary" } } } },
        "400": r("BadRequest"),
        "404": r("NotFound"),
        ...baseErrors,
      },
    },
  },

  // ======================= NOTIFICATIONS =======================
  {
    path: "/api/v1/notifications",
    method: "get",
    roles: ALL_AUTHED,
    operation: {
      tags: ["Notifications"],
      operationId: "listNotifications",
      summary: "My latest 50 notifications + unread count",
      security: bearerOrCookie,
      responses: { "200": okJson("Notifications", { type: "object", properties: { unreadCount: { type: "integer" }, notifications: { type: "array", items: ref("Notification") } } }), ...authErrors },
    },
  },
  {
    path: "/api/v1/notifications",
    method: "post",
    roles: ["ADMIN"],
    operation: {
      tags: ["Notifications"],
      operationId: "sendNotification",
      summary: "Send a notification to a user",
      description: "Admin only (`FORBIDDEN` for any other role).",
      security: bearerOrCookie,
      requestBody: body(
        { type: "object", required: ["recipientUserId", "title", "body"], properties: { recipientUserId: { type: "string" }, title: { type: "string" }, body: { type: "string" }, dataJson: { type: "object", additionalProperties: true } } },
        { recipientUserId: "usr-uuid", title: "Rates updated", body: "New copper rate is live." }
      ),
      responses: { "201": okJson("Sent", { type: "object", properties: { message: { type: "string" }, notification: ref("Notification") } }), "400": r("BadRequest"), "403": r("Forbidden"), ...authErrors },
    },
  },
  {
    path: "/api/v1/notifications/read-all",
    method: "post",
    roles: ALL_AUTHED,
    operation: {
      tags: ["Notifications"],
      operationId: "markAllNotificationsRead",
      summary: "Mark all my notifications as read",
      security: bearerOrCookie,
      responses: { "200": okJson("Updated", { type: "object", properties: { message: { type: "string" }, count: { type: "integer" } } }), ...authErrors },
    },
  },
  {
    path: "/api/v1/notifications/{id}/read",
    method: "post",
    roles: ALL_AUTHED,
    operation: {
      tags: ["Notifications"],
      operationId: "markNotificationRead",
      summary: "Mark one notification as read",
      description: "Also available as `PATCH`. Only the owner (or `ADMIN`) may mark it read.",
      security: bearerOrCookie,
      parameters: [idParam("id", "Notification id")],
      responses: { "200": okJson("Updated", { type: "object", properties: { message: { type: "string" }, notification: ref("Notification") } }), "403": r("Forbidden"), "404": r("NotFound"), ...authErrors },
    },
  },
  {
    path: "/api/v1/notifications/{id}/read",
    method: "patch",
    roles: ALL_AUTHED,
    operation: {
      tags: ["Notifications"],
      operationId: "patchNotificationRead",
      summary: "Mark one notification as read (PATCH alias)",
      security: bearerOrCookie,
      parameters: [idParam("id", "Notification id")],
      responses: { "200": okJson("Updated", { type: "object", properties: { message: { type: "string" }, notification: ref("Notification") } }), "403": r("Forbidden"), "404": r("NotFound"), ...authErrors },
    },
  },

  // ======================= FIELD AGENT =======================
  {
    path: "/api/v1/field/collectors",
    method: "get",
    roles: ["FIELD_AGENT", "ADMIN"],
    operation: {
      tags: ["Field Agent"],
      operationId: "listOnboardedCollectors",
      summary: "Collectors onboarded (latest 50)",
      description: "`FIELD_AGENT` sees only collectors they onboarded; `ADMIN` sees all.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Collectors", {
          type: "object",
          properties: {
            count: { type: "integer" },
            collectors: { type: "array", items: { type: "object", properties: { id: { type: "string" }, shortCode: { type: "string" }, phone: { type: "string" }, operatingArea: { type: "string" }, district: { type: "string", nullable: true }, preferredLanguage: ref("Language"), totalLots: { type: "integer" }, createdAt: { type: "string", format: "date-time" } } } },
          },
        }),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/field/collectors",
    method: "post",
    roles: ["FIELD_AGENT"],
    operation: {
      tags: ["Field Agent"],
      operationId: "onboardCollector",
      summary: "Onboard a collector with digital consent (F1)",
      description: "⚠ Intended for `FIELD_AGENT`, but the route does not currently reject unauthenticated callers (the onboarding agent id is simply left empty).",
      security: bearerOrCookie,
      requestBody: body(
        {
          type: "object",
          required: ["phone", "pin", "operatingArea", "hasConsent"],
          properties: {
            phone: { type: "string", pattern: "^\\d{10}$" },
            pin: { type: "string", pattern: "^\\d{4}$" },
            preferredLanguage: { ...ref("Language"), default: "HI" },
            operatingArea: { type: "string", minLength: 2 },
            district: { type: "string" },
            hasConsent: { type: "boolean", enum: [true], description: "Must be true" },
          },
        },
        { phone: "9819999001", pin: "1234", preferredLanguage: "MR", operatingArea: "Kurla West Scrap Yard", district: "Mumbai", hasConsent: true }
      ),
      responses: {
        "201": okJson("Onboarded", {
          type: "object",
          properties: {
            message: { type: "string" },
            collector: { type: "object", properties: { id: { type: "string" }, userId: { type: "string" }, shortCode: { type: "string" }, phone: { type: "string" }, preferredLanguage: ref("Language"), operatingArea: { type: "string" } } },
          },
        }),
        "400": r("BadRequest"),
        "409": r("Conflict"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/field/prices",
    method: "get",
    roles: ["FIELD_AGENT", "ADMIN"],
    operation: {
      tags: ["Field Agent"],
      operationId: "listLoggedPrices",
      summary: "Market prices logged (latest 50)",
      description: "`FIELD_AGENT` sees only their own entries; `ADMIN` sees all.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Prices", {
          type: "object",
          properties: {
            count: { type: "integer" },
            prices: { type: "array", items: { type: "object", properties: { id: { type: "string" }, category: { type: "string" }, categoryId: { type: "integer" }, subCategory: { type: "string", nullable: true }, buyingPricePaise: { type: "integer" }, buyingPriceRupees: { type: "number" }, buyerType: { type: "string" }, area: { type: "string" }, district: { type: "string" }, recordedAt: { type: "string", format: "date-time" } } } },
          },
        }),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/field/prices",
    method: "post",
    roles: ["FIELD_AGENT"],
    operation: {
      tags: ["Field Agent"],
      operationId: "logMarketPrice",
      summary: "Log a ground spot price (F2)",
      description: "⚠ Intended for `FIELD_AGENT`, but the route does not currently reject unauthenticated callers (`recordedById` is left empty).",
      security: bearerOrCookie,
      requestBody: body(
        {
          type: "object",
          required: ["categoryId", "buyingPricePaise", "area"],
          properties: {
            categoryId: { type: "integer", minimum: 1 },
            subCategory: { type: "string" },
            buyingPricePaise: { type: "integer", minimum: 1 },
            buyerType: { type: "string", enum: ["SCRAP_DEALER", "RECYCLER"], default: "SCRAP_DEALER" },
            area: { type: "string", minLength: 2 },
            district: { type: "string", default: "Mumbai" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            recordedAt: { type: "string", format: "date-time" },
          },
        },
        { categoryId: 1, subCategory: "Armature wire", buyingPricePaise: 4400, buyerType: "SCRAP_DEALER", area: "Dharavi 60 Feet Road", district: "Mumbai", latitude: 19.041, longitude: 72.859 }
      ),
      responses: { "201": okJson("Logged", { type: "object", properties: { message: { type: "string" }, pricePoint: ref("PricePoint") } }), "400": r("BadRequest"), ...baseErrors },
    },
  },
  {
    path: "/api/v1/field/training-photos",
    method: "get",
    roles: ["FIELD_AGENT", "ADMIN"],
    operation: {
      tags: ["Field Agent"],
      operationId: "listTrainingPhotos",
      summary: "ML training samples captured (latest 50)",
      description: "`FIELD_AGENT` sees only their own samples; `ADMIN` sees all.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Samples", {
          type: "object",
          properties: {
            count: { type: "integer" },
            samples: { type: "array", items: { type: "object", properties: { id: { type: "string" }, category: { type: "string" }, categoryId: { type: "integer" }, labelSource: { type: "string" }, labelConfidence: { type: "number" }, quality: { type: "string" }, createdAt: { type: "string", format: "date-time" } } } },
          },
        }),
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/field/training-photos",
    method: "post",
    roles: ["FIELD_AGENT"],
    operation: {
      tags: ["Field Agent"],
      operationId: "logTrainingPhoto",
      summary: "Log a labelled training photo (F3)",
      description: "⚠ Intended for `FIELD_AGENT`, but the route does not currently reject unauthenticated callers (`capturedById` is left empty).",
      security: bearerOrCookie,
      requestBody: body(
        { type: "object", required: ["categoryId", "storageKey"], properties: { categoryId: { type: "integer", minimum: 1 }, storageKey: { type: "string", minLength: 5 }, sha256: { type: "string" }, labelConfidence: { type: "number", minimum: 0, maximum: 1, default: 1 } } },
        { categoryId: 2, storageKey: "training/agent_1/motherboard_close_up.jpg", labelConfidence: 1.0 }
      ),
      responses: { "201": okJson("Logged", { type: "object", properties: { message: { type: "string" }, sampleId: { type: "string" }, imageId: { type: "string" } } }), "400": r("BadRequest"), "404": r("NotFound"), ...baseErrors },
    },
  },
  {
    path: "/api/v1/field/stats",
    method: "get",
    roles: ["FIELD_AGENT", "ADMIN"],
    operation: {
      tags: ["Field Agent"],
      operationId: "getFieldStats",
      summary: "Productivity counters (total + today)",
      description: "`FIELD_AGENT` gets personal numbers; `ADMIN` gets platform-wide numbers.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Stats", {
          type: "object",
          properties: {
            agent: { type: "object", properties: { userId: { type: "string" }, phone: { type: "string" }, role: ref("Role") } },
            stats: {
              type: "object",
              properties: {
                totalCollectorsOnboarded: { type: "integer" }, collectorsOnboardedToday: { type: "integer" },
                totalPricesLogged: { type: "integer" }, pricesLoggedToday: { type: "integer" },
                totalTrainingPhotos: { type: "integer" }, trainingPhotosToday: { type: "integer" },
              },
            },
          },
        }),
        ...authErrors,
      },
    },
  },

  // ======================= ADMIN =======================
  {
    path: "/api/v1/admin/prices/export",
    method: "get",
    roles: ["ADMIN"],
    operation: {
      tags: ["Admin"],
      operationId: "exportPricesCsv",
      summary: "Export the full price dataset as CSV",
      security: bearerOrCookie,
      responses: {
        "200": {
          description: "CSV attachment `price-dataset-<timestamp>.csv`",
          content: { "text/csv": { schema: { type: "string" }, example: "ID,CategoryCode,CategoryName,BuyingPriceRupees,MarketLowRupees,MarketHighRupees,BuyerType,Source,Area,District,RecordedAt\n" } },
        },
        "401": r("Unauthorized"),
        "500": { description: "Plain-text error", content: { "text/plain": { schema: { type: "string" } } } },
      },
    },
  },
  {
    path: "/api/cron/expire-authorizations",
    method: "post",
    roles: ["ADMIN"],
    operation: {
      tags: ["Cron / Maintenance"],
      operationId: "cronExpireAuthorizations",
      summary: "Mark recyclers with a lapsed authorization as EXPIRED",
      description: "Scheduler endpoint secured by `CRON_SECRET`, not by a user session.",
      security: cron,
      responses: { "200": okJson("Done", { type: "object", properties: { executedAt: { type: "string", format: "date-time" }, expiredRecyclersCount: { type: "integer" } } }), ...authErrors },
    },
  },
  {
    path: "/api/cron/expire-requests",
    method: "post",
    roles: ["ADMIN"],
    operation: {
      tags: ["Cron / Maintenance"],
      operationId: "cronExpireRequests",
      summary: "Expire stale pickup requests (24 h) and lots (30 d)",
      description: "Scheduler endpoint secured by `CRON_SECRET`, not by a user session.",
      security: cron,
      responses: { "200": okJson("Done", { type: "object", properties: { executedAt: { type: "string", format: "date-time" }, expiredPickupsCount: { type: "integer" }, expiredLotsCount: { type: "integer" } } }), ...authErrors },
    },
  },

  // ======================= LOT FLOW: today's price -> confirm -> offers -> select -> pay =======================
  {
    path: "/api/v1/prices/today",
    method: "get",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Reference & Pricing"],
      operationId: "getTodayPrices",
      summary: "Admin-set price for today, per material",
      description: "`ratePerKgPaise` is `null` when the admin has not set a price; such materials cannot be listed.",
      security: [],
      responses: {
        "200": okJson("Today's prices", {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoryId: { type: "integer" }, code: { type: "string" }, nameEn: { type: "string" }, nameHi: { type: "string" }, nameMr: { type: "string" }, iconKey: { type: "string" },
                  isHazardous: { type: "boolean" }, ratePerKgPaise: { type: "integer", nullable: true }, updatedAt: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        }),
        "500": r("InternalError"),
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/confirm",
    method: "post",
    roles: ["COLLECTOR", "ADMIN"],
    operation: {
      tags: ["Lot Flow"],
      operationId: "confirmLot",
      summary: "Confirm a DRAFT lot and broadcast it to recyclers within 5 km",
      description: "Lot becomes `READY`. Notified recyclers see material, weight, price, distance and area — never the collector's name or phone.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: {
        "200": okJson("Confirmed", { type: "object", properties: { lotId: { type: "string" }, status: { type: "string", example: "READY" }, recyclersNotified: { type: "integer" } } }),
        "403": r("Forbidden"),
        "404": r("NotFound"),
        "409": { description: "Lot is not in DRAFT state (`INVALID_STATE`)", content: { "application/json": { schema: ref("ErrorResponse") } } },
        ...authErrors,
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/offers",
    method: "get",
    roles: ["COLLECTOR", "ADMIN"],
    operation: {
      tags: ["Lot Flow"],
      operationId: "getLotOffers",
      summary: "Recyclers ready to buy this lot (poll while READY)",
      description: "Returns only `INTERESTED` / `SELECTED` offers, plus broadcast counters.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: {
        "200": okJson("Offers", {
          type: "object",
          properties: {
            lotId: { type: "string" },
            lotStatus: ref("LotStatus"),
            summary: { type: "object", properties: { notified: { type: "integer" }, interested: { type: "integer" }, waiting: { type: "integer" }, declined: { type: "integer" } } },
            offers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  offerId: { type: "string" },
                  status: ref("LotOfferStatus"),
                  distanceKm: { type: "number" },
                  ratePerKgPaise: { type: "integer", nullable: true },
                  totalPaise: { type: "integer" },
                  respondedAt: { type: "string", format: "date-time", nullable: true },
                  recycler: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, address: { type: "string" }, area: { type: "string" }, latitude: { type: "number" }, longitude: { type: "number" } } },
                },
              },
            },
          },
        }),
        "404": r("NotFound"),
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/search-again",
    method: "post",
    roles: ["COLLECTOR", "ADMIN"],
    operation: {
      tags: ["Lot Flow"],
      operationId: "searchAgain",
      summary: "Re-run the 5 km broadcast for a READY lot",
      description: "Notifies only recyclers that were not notified before.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: {
        "200": okJson("Rebroadcast", { type: "object", properties: { lotId: { type: "string" }, newlyNotified: { type: "integer" }, totalNotified: { type: "integer" } } }),
        "404": r("NotFound"),
        "409": { description: "Lot is not READY (`INVALID_STATE`)", content: { "application/json": { schema: ref("ErrorResponse") } } },
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/select",
    method: "post",
    roles: ["COLLECTOR", "ADMIN"],
    operation: {
      tags: ["Lot Flow"],
      operationId: "selectOffer",
      summary: "Sell the lot to one INTERESTED recycler",
      description: "Both sides can then see each other's details. Returns the deal with its payment link.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      requestBody: body({ type: "object", required: ["offerId"], properties: { offerId: { type: "string" } } }, { offerId: "offer-uuid" }),
      responses: {
        "200": okJson("Deal created", { type: "object", properties: { deal: ref("DealView") } }),
        "400": r("BadRequest"),
        "404": r("NotFound"),
        "409": { description: "`OFFER_NOT_AVAILABLE` or `ALREADY_SELECTED`", content: { "application/json": { schema: ref("ErrorResponse") } } },
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/lots/{id}/deal",
    method: "get",
    roles: ["COLLECTOR", "RECYCLER", "ADMIN"],
    operation: {
      tags: ["Lot Flow"],
      operationId: "getDeal",
      summary: "Full deal view (both parties, amount, payment link)",
      description: "Only the lot's collector, the selected recycler or an admin; otherwise `NOT_FOUND`. `NO_DEAL` (404) until a recycler has been selected.",
      security: bearerOrCookie,
      parameters: [LOT_ID],
      responses: { "200": okJson("Deal", { type: "object", properties: { deal: ref("DealView") } }), "404": r("NotFound"), ...authErrors, "403": r("Forbidden") },
    },
  },
  {
    path: "/api/v1/payments/{token}/demo-pay",
    method: "post",
    roles: ["COLLECTOR", "RECYCLER", "ADMIN"],
    operation: {
      tags: ["Lot Flow"],
      operationId: "demoPay",
      summary: "DEMO payment: mark the deal PAID from the scanned QR token",
      description: "No real money moves. The QR encodes `{origin}/pay/{token}`; the app takes the token and calls this. Calling it again is safe and returns the same paid deal.",
      security: bearerOrCookie,
      parameters: [idParam("token", "Payment token from the deal's `paymentToken` / QR")],
      responses: {
        "200": okJson("Paid", { type: "object", properties: { result: { type: "string" }, deal: ref("DealView") } }),
        "404": r("NotFound"),
        "409": { description: "Lot cannot be paid in its current state (`NOT_PAYABLE`)", content: { "application/json": { schema: ref("ErrorResponse") } } },
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },

  // ======================= RECYCLER =======================
  {
    path: "/api/v1/auth/staff-login",
    method: "post",
    roles: ["PUBLIC"],
    operation: {
      tags: ["Auth"],
      operationId: "staffLogin",
      summary: "Recycler staff / admin sign-in with phone + password",
      description: "Collectors use `POST /api/v1/auth/login` with a PIN. Locked for 15 minutes after repeated failures.",
      security: [],
      requestBody: body(
        { type: "object", required: ["phone", "password"], properties: { phone: { type: "string", pattern: "^\\d{10}$" }, password: { type: "string" } } },
        { phone: "9876543210", password: "secret123" }
      ),
      responses: {
        "200": okJson("Signed in", {
          type: "object",
          properties: {
            token: { type: "string" },
            profile: {
              type: "object",
              properties: { userId: { type: "string" }, phone: { type: "string" }, role: ref("Role"), recyclerId: { type: "string", nullable: true }, recyclerName: { type: "string", nullable: true } },
            },
          },
        }),
        "400": r("BadRequest"),
        "401": r("Unauthorized"),
        "429": r("TooManyRequests"),
        ...baseErrors,
      },
    },
  },
  {
    path: "/api/v1/recycler/requests",
    method: "get",
    roles: ["RECYCLER"],
    operation: {
      tags: ["Recycler"],
      operationId: "listLotRequests",
      summary: "Open lot requests within 5 km",
      description: "Lots still `READY` and looking for a buyer. The collector's identity is never included. `NO_FACILITY` (403) if the account is not linked to a recycler.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Requests", {
          type: "object",
          properties: {
            requests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  offerId: { type: "string" },
                  status: { type: "string", enum: ["NOTIFIED", "INTERESTED"], description: "NOTIFIED = not answered; INTERESTED = waiting for the collector" },
                  myRatePerKgPaise: { type: "integer", nullable: true },
                  distanceKm: { type: "number" },
                  notifiedAt: { type: "string", format: "date-time" },
                  lot: {
                    type: "object",
                    properties: {
                      lotId: { type: "string" }, lotRef: { type: "string" },
                      material: { type: "object", properties: { id: { type: "integer" }, nameEn: { type: "string" }, nameHi: { type: "string" }, nameMr: { type: "string" } } },
                      approxWeightGrams: { type: "integer" }, listedRatePerKgPaise: { type: "integer", nullable: true }, listedValuePaise: { type: "integer", nullable: true },
                      area: { type: "string" }, collectedAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        }),
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/recycler/requests/{offerId}",
    method: "post",
    roles: ["RECYCLER"],
    operation: {
      tags: ["Recycler"],
      operationId: "respondToLotRequest",
      summary: "Answer a lot request: INTERESTED (with rate) or DECLINED",
      description: "`INTERESTED` notifies the collector and adds this recycler to their list.",
      security: bearerOrCookie,
      parameters: [idParam("offerId", "Offer id from `GET /recycler/requests`")],
      requestBody: body(
        {
          oneOf: [
            { type: "object", required: ["response", "ratePerKgPaise"], properties: { response: { type: "string", enum: ["INTERESTED"] }, ratePerKgPaise: { type: "integer", minimum: 1 } } },
            { type: "object", required: ["response"], properties: { response: { type: "string", enum: ["DECLINED"] } } },
          ],
        },
        { response: "INTERESTED", ratePerKgPaise: 4500 }
      ),
      responses: {
        "200": okJson("Recorded", { type: "object", additionalProperties: true, properties: { offerId: { type: "string" } } }),
        "400": r("BadRequest"),
        "404": r("NotFound"),
        "409": { description: "Lot no longer open (`NOT_OPEN`)", content: { "application/json": { schema: ref("ErrorResponse") } } },
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/recycler/deals",
    method: "get",
    roles: ["RECYCLER"],
    operation: {
      tags: ["Recycler"],
      operationId: "listRecyclerDeals",
      summary: "Lots where the collector chose this recycler (latest 50)",
      description: "Full details for one deal: `GET /api/v1/lots/{id}/deal`.",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Deals", {
          type: "object",
          properties: {
            deals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lotId: { type: "string" }, lotRef: { type: "string" },
                  material: { type: "object", properties: { id: { type: "integer" }, nameEn: { type: "string" }, nameHi: { type: "string" }, nameMr: { type: "string" } } },
                  approxWeightGrams: { type: "integer" }, ratePerKgPaise: { type: "integer" }, amountPaise: { type: "integer" },
                  paymentStatus: { type: "string", enum: ["UNPAID", "PARTIAL", "PAID"] },
                  collector: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, area: { type: "string" } } },
                  updatedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        }),
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },

  // ======================= ADMIN: prices & recyclers =======================
  {
    path: "/api/v1/admin/prices/today",
    method: "post",
    roles: ["ADMIN"],
    operation: {
      tags: ["Admin"],
      operationId: "setTodayPrices",
      summary: "Set today's price (paise/kg) for one or more materials",
      description: "Read current prices with the public `GET /api/v1/prices/today`.",
      security: bearerOrCookie,
      requestBody: body(
        {
          type: "object",
          required: ["prices"],
          properties: {
            prices: { type: "array", minItems: 1, items: { type: "object", required: ["categoryId", "ratePerKgPaise"], properties: { categoryId: { type: "integer", minimum: 1 }, ratePerKgPaise: { type: "integer", minimum: 1 } } } },
          },
        },
        { prices: [{ categoryId: 1, ratePerKgPaise: 34000 }] }
      ),
      responses: { "200": okJson("Updated", { type: "object", additionalProperties: true, properties: { updated: {} } }), "400": r("BadRequest"), ...authErrors, "403": r("Forbidden") },
    },
  },
  {
    path: "/api/v1/admin/recyclers",
    method: "get",
    roles: ["ADMIN"],
    operation: {
      tags: ["Admin"],
      operationId: "listRecyclers",
      summary: "List all recyclers",
      security: bearerOrCookie,
      responses: {
        "200": okJson("Recyclers", {
          type: "object",
          properties: {
            recyclers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" }, name: { type: "string" }, contactPhone: { type: "string" }, address: { type: "string" }, area: { type: "string" }, district: { type: "string", nullable: true },
                  latitude: { type: "number" }, longitude: { type: "number" }, authorizationNo: { type: "string" },
                  authorizationStatus: { type: "string", enum: ["PENDING", "VERIFIED", "EXPIRED", "SUSPENDED"] },
                  authorizationValidTill: { type: "string", format: "date-time", nullable: true },
                  staffPhones: { type: "array", items: { type: "string" } },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        }),
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/admin/recyclers",
    method: "post",
    roles: ["ADMIN"],
    operation: {
      tags: ["Admin"],
      operationId: "createRecycler",
      summary: "Add a verified recycler with one staff login",
      description: "Staff sign in with `staffPhone` + `staffPassword` via `POST /api/v1/auth/staff-login`. Latitude / longitude decide which collectors (within 5 km) reach this recycler.",
      security: bearerOrCookie,
      requestBody: body(
        {
          type: "object",
          required: ["name", "contactPhone", "authorizationNo", "address", "area", "latitude", "longitude", "staffPhone", "staffPassword"],
          properties: {
            name: { type: "string", minLength: 2 },
            contactPhone: { type: "string", minLength: 10 },
            authorizationNo: { type: "string", minLength: 2 },
            authorizationValidTill: { type: "string", format: "date-time" },
            address: { type: "string", minLength: 2 },
            area: { type: "string", minLength: 2 },
            district: { type: "string" },
            state: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            serviceRadiusKm: { type: "number", exclusiveMinimum: true, minimum: 0 },
            staffPhone: { type: "string", pattern: "^\\d{10}$" },
            staffPassword: { type: "string", minLength: 6 },
          },
        },
        { name: "EcoRecycle Mumbai Hub", contactPhone: "9876543210", authorizationNo: "MPCB/2026/001", address: "Plot 12, Dharavi Link Road", area: "Dharavi", district: "Mumbai", latitude: 19.043, longitude: 72.856, staffPhone: "9876500001", staffPassword: "secret123" }
      ),
      responses: {
        "201": okJson("Created", {
          type: "object",
          properties: { recycler: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, authorizationStatus: { type: "string" } } } },
        }),
        "400": r("BadRequest"),
        ...authErrors,
        "403": r("Forbidden"),
      },
    },
  },
  {
    path: "/api/v1/admin/recyclers/{id}",
    method: "patch",
    roles: ["ADMIN"],
    operation: {
      tags: ["Admin"],
      operationId: "setRecyclerStatus",
      summary: "Approve (VERIFIED), suspend or expire a recycler",
      description: "Only `VERIFIED` recyclers receive lot requests.",
      security: bearerOrCookie,
      parameters: [idParam("id", "Recycler id")],
      requestBody: body(
        { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["VERIFIED", "SUSPENDED", "EXPIRED"] }, notes: { type: "string", maxLength: 500 } } },
        { status: "VERIFIED" }
      ),
      responses: { "200": okJson("Updated", { type: "object", properties: { id: { type: "string" }, status: { type: "string" } } }), "400": r("BadRequest"), "404": r("NotFound"), ...authErrors, "403": r("Forbidden") },
    },
  },
];
