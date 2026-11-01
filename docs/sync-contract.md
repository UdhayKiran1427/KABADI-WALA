# Sync & Auth Contract — Flutter app ⇄ Next.js server (CANONICAL)

This is the single source of truth for everything the Flutter collector app (`E_waste/`) and the server (`KABADI-WALA/`) exchange over `/api/v1/auth/*`, `/api/v1/sync/*` and `/api/v1/reference/bootstrap`. When another document disagrees, **this file wins**.

- Machine-readable form: [`src/lib/contract/syncContract.ts`](../src/lib/contract/syncContract.ts) (zod; `PushRequestSchema` is what the push route parses with).
- Lot status table: [`src/lib/domain/lotStatusMapping.ts`](../src/lib/domain/lotStatusMapping.ts).
- Server→phone price mapping: [`src/lib/contract/referenceMapping.ts`](../src/lib/contract/referenceMapping.ts).
- Shared fixtures: [`tests/fixtures/contract/`](../tests/fixtures/contract) (copied to `E_waste/test/fixtures/contract/`, see §9).
- Phone-side behaviour (outbox, backoff, screens): `E_waste/docs/api_contract.md` (points here).

**How to read the status marks.** Phase 1 wrote this contract, the mapping function, the schemas and the fixtures; Phase 2 made the server (sync engine, push/pull routes, recycler verify flow) follow it. Where today's code still differs, the row is marked **⚠ gap** and listed in §10. Unmarked behaviour is implemented and tested.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Money / weight | Integer **paise** / integer **grams**, everywhere on the wire. Never floats, never rupees/kg. |
| Ids | UUID v4 strings generated on the phone for everything it creates. Server-created rows (notifications, pickup status…) use server UUIDs. Recyclers keep their string ids (`rec-…`), categories keep integer ids. |
| Time | ISO-8601 UTC with `Z` (`2026-11-01T10:15:30.000Z`). |
| Phone | **10 digits**, no `+91`, no spaces (`9876543210`). The phone strips formatting before sending. |
| Language | Uppercase `HI` \| `MR` \| `EN`. |
| PIN | 4 digits. |
| Auth | `Authorization: Bearer <JWT>` (HS256, 30 days) from register / login / restore / pin-recovery. 401 ⇒ token missing/expired ⇒ phone treats it as a transport error until the user signs in again. |
| Transport errors | Timeouts, 5xx, no network, 401: the phone keeps the whole batch, `attempts + 1`, waits `2^attempts` s (max 64 s). |

### 1.1 Response envelope

```jsonc
// success (HTTP 200/201)
{ "data": { /* endpoint specific */ } }

// error (HTTP 4xx/5xx)
{ "error": { "code": "VALIDATION_ERROR", "message": "Phone must be a valid 10-digit number", "details": { /* optional */ } } }
```

Nothing else is allowed at the top level: no `status`, `success`, `token`, `message` or string-valued `error`. (`HttpRemoteApi` flattens `data` into the map it returns to callers; that is a client-side convenience, not the wire format.)

| HTTP | `error.code` examples |
|---|---|
| 400 | `INVALID_JSON`, `VALIDATION_ERROR`, `INVALID_OLD_PIN` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 403 | `RECOVERY_FAILED`, `FORBIDDEN` |
| 409 | `PHONE_ALREADY_EXISTS` |
| 429 | `ACCOUNT_LOCKED` |
| 500 | `INTERNAL_ERROR` (message must be generic — ⚠ gap, see §10 S11) |

---

## 2. Auth (collector / field-agent mobile)

All bodies are JSON. Fixtures: `auth_register.json`, `auth_login.json`, `auth_restore.json`, `auth_pin_recovery.json`, `auth_change_pin.json`, `auth_me.json`, `error_login_invalid.json`.

**`CollectorProfile`** (identical in every auth response — ⚠ gap: login omits `name`, pin-recovery omits `name`/`phone`):

| Field | Type | Notes |
|---|---|---|
| `collectorId` | uuid | Same id the phone uses as `entityId` for `profile` mutations. |
| `userId` | uuid | |
| `name` | string? | Optional; the app does not ask for one (Q1). |
| `shortCode` | string 3–6 | Printed in lot refs and used for PIN recovery. |
| `preferredLanguage` | `HI\|MR\|EN` | |
| `operatingArea` | string | |
| `phone` | 10 digits | |
| `lotCounter` | int, **restore only** | Number of lots the server holds; phone continues numbering from it. |

| Endpoint | Auth | Request | Success `data` | Errors |
|---|---|---|---|---|
| `POST /auth/register` | – | `{ name?, phone, pin, preferredLanguage?="HI", operatingArea, district?, consent?: { version?="1.0", locationConsent?=true } }` | `201 { token, profile }` | 400 `VALIDATION_ERROR`, 409 `PHONE_ALREADY_EXISTS` |
| `POST /auth/login` | – | `{ phone, pin }` | `{ token, profile \| null }` (`null` for non-collector users) | 401 `INVALID_CREDENTIALS` (message states remaining attempts), 429 `ACCOUNT_LOCKED` (5 failures ⇒ 15 min) |
| `POST /auth/restore-on-new-phone` | – | `{ phone, pin, deviceId (≥4 chars) }` | `{ token, profile + lotCounter }` | 401 `INVALID_CREDENTIALS` |
| `POST /auth/pin-recovery` | – | `{ phone, shortCode, operatingArea, newPin }` (OTP-free; area is a fuzzy match) | `{ message, token, profile }` | 403 `RECOVERY_FAILED` (never says which field was wrong). ⚠ gap: no rate limit yet (§10 S10). |
| `POST /auth/change-pin` | Bearer | `{ oldPin, newPin }` | `{ message }` | 400 `INVALID_OLD_PIN`, 401 |
| `GET /auth/me` | Bearer (any role) | – | `{ userId, phone, role, language, collectorId?, shortCode?, preferredLanguage?, operatingArea?, district?, collector \| null, recycler \| null }` | 401 |

`POST /auth/staff-login` (recycler / admin web) is out of scope here.
Not part of the contract: `/auth/reset-pin/otp` (the phone calls it today; ⚠ gap F11 — there is no SMS gateway, PIN recovery is the shortCode flow above).

---

## 3. `POST /api/v1/sync/push`

Auth: Bearer only (no web cookie), user must exist and be active. Callers: collectors (everything except `price_point` and TRAINING photos) and field agents (`price_point`, TRAINING `lot_image`); other roles get 401.

### 3.1 Request

```jsonc
{
  "deviceId": "7d1f4c2a-…",            // stable per app install (uuid); not a constant — ⚠ gap F3
  "mutations": [                        // 0–100 accepted; the phone sends ≤ 20, oldest first
    {
      "clientMutationId": "c0000000-…", // uuid v4, idempotency key, reused unchanged on every retry
      "entity": "lot",                  // §7
      "entityId": "a1000000-…",         // primary key of the row (see §7 for profile)
      "op": "create",                   // "create" | "update"
      "payload": { /* JSON object, per-entity, §7 */ },
      "clientTimestamp": "2026-11-01T10:15:30.000Z" // when the change was made on the phone
    }
  ]
}
```

On the wire the payload is a JSON **object** (`payload`) and the time is `clientTimestamp`. Inside the app the outbox/`RemoteApi.pushChanges` still uses `payloadJson` (string) and `createdAt`; `HttpRemoteApi` converts. Fixture: `push_request.json` (20 mutations, one per pushable entity).

### 3.2 Response (`200`, even when every mutation is rejected)

```jsonc
{ "data": {
    "deviceId": "7d1f4c2a-…",
    "serverTimestamp": "2026-11-01T12:20:00.000Z",
    "totalMutations": 20,
    "results": [ /* exactly one per request mutation */ ]
} }
```

Results are returned **in request order**. The engine sets `clientMutationId` centrally (handlers cannot return a result without it). Every result contains all of these:

| Field | Type | Meaning |
|---|---|---|
| `clientMutationId` | uuid | The request's id. The phone matches results by this — never by `canonicalId`. A request item that is not even a valid mutation (no usable id) is answered in its own slot with `clientMutationId: ""` and `INVALID_PAYLOAD`. |
| `status` | `APPLIED\|DUPLICATE\|CONFLICT\|REJECTED` | Uppercase. `DUPLICATE` is only ever the answer to a repeat of a mutation that was `APPLIED`. |
| `code` | string | Machine code, `OK` for `APPLIED`. Table below. |
| `message` | string | Human text for logs / `lastError`. Never contains stack traces, SQL or other users' data. |
| `retryable` | bool | Only `REJECTED` may be `true`. |
| `canonicalId` | string? | Id of the row the server holds (differs from `entityId` only when payments merge). |
| `serverState` | object? | `CONFLICT` only: the server's copy, in the same shape as the pull item for that entity. |

| `status` | Phone action |
|---|---|
| `APPLIED`, `DUPLICATE` | Delete the outbox row; mark the entity `synced` when nothing else is queued for it. |
| `CONFLICT` | Keep the row with `lastError = "CONFLICT: <message>"`, never resend, flag entity + parent lot ("Check" chip in C12). |
| `REJECTED`, `retryable: true` | Keep, `attempts + 1`, retry with the normal backoff (e.g. the parent lot has not arrived yet). |
| `REJECTED`, `retryable: false` | Keep with `lastError`, **never resend**, show "Check" (⚠ gap F7: the phone currently retries every rejection forever). |

A mutation missing from `results` is treated as `REJECTED, retryable: true`.

| `code` | Status | Retryable | Notes |
|---|---|---|---|
| `OK` | APPLIED | no | |
| `ALREADY_PROCESSED` | DUPLICATE | no | Server returns the stored code/message/`canonicalId` of the first processing when it has them. |
| `UNKNOWN_ENTITY` | REJECTED | no | Includes retired names (§7.2). |
| `MUTATION_ID_IN_USE` | REJECTED | no | The `clientMutationId` was first used by another account. |
| `INVALID_OP` | REJECTED | no | Op not valid for the entity (e.g. `update` on `payment`). New. |
| `INVALID_PAYLOAD` | REJECTED | no | Failed the per-entity schema (unknown field, wrong type, bad enum). New. |
| `FORBIDDEN_FIELD` | REJECTED | no | Server-owned field or state in the payload (§7 "server-owned"). |
| `FORBIDDEN` / `FORBIDDEN_ROLE` | REJECTED | no | Row belongs to someone else / role may not push this entity. `FORBIDDEN_ROLE` is new. |
| `INVALID_LOT_REF`, `CATEGORY_NOT_FOUND`, `COLLECTOR_PROFILE_MISSING`, `INVALID_STORAGE_KEY`, `RECYCLER_NOT_AUTHORIZED`, `RECYCLER_AUTHORIZATION_EXPIRED`, `MATERIAL_NOT_ACCEPTED` | REJECTED | no | |
| `PARENT_LOT_NOT_FOUND`, `PARENT_HANDOVER_NOT_FOUND`, `PARENT_DISPUTE_NOT_FOUND`, `PARENT_PICKUP_NOT_FOUND` | REJECTED | **yes** | Parent not synced yet. |
| `OBJECT_NOT_UPLOADED` | REJECTED | **yes** | `lot_image` arrived before its file reached storage; retry after the upload. |
| `LOT_LOCKED` | REJECTED | no | Edit of a lot that is `CONFIRMED`, `PAID`, `CANCELLED` or `DISPUTED`. |
| `DUPLICATE_HANDOVER_REF`, `DUPLICATE_BATCH_REF` | CONFLICT | no | |
| `TOPIC_NOT_FOUND` | REJECTED | no | `quiz_result` for an unknown safety topic. |
| `IGNORED_SERVER_OWNED_FIELD` | **APPLIED** | no | Applied, but a server-owned field the server derives itself (`paymentStatus` on `lot`) was ignored; `message` names it. |
| `PROCESSING_ERROR` | REJECTED | **yes** | Unexpected failure; message is generic. |
| `DUPLICATE_LOT_REF` | CONFLICT | no | A different lot already owns this `lotRef`. |
| `INVALID_STATE_TRANSITION` | CONFLICT (illegal move) / REJECTED (forbidden actor) | no | |
| `STALE_QUOTED_RATE` | CONFLICT | no | Quoted rate differs from a rate older than 7 days. |

### 3.3 Server processing rules

1. **Idempotency, per user.** The server remembers a mutation by `clientMutationId` (a `SyncMutation` row). A repeat is answered from that row with its **original** outcome:
   - stored `APPLIED` → `DUPLICATE` (`ALREADY_PROCESSED`, same `canonicalId`), nothing is written again;
   - stored `CONFLICT` → `CONFLICT` again (same code/message/`serverState`);
   - stored `REJECTED` (non-retryable) → `REJECTED` again with the same code. It is **never** turned into `DUPLICATE`.
   Another account's id is `REJECTED / MUTATION_ID_IN_USE`.
   **What is remembered:** `APPLIED` (written in the same transaction as the change), `CONFLICT`, and `REJECTED` with `retryable: false`. `REJECTED` with `retryable: true` (including `PROCESSING_ERROR`) is **never** remembered — otherwise the retry would come back as a duplicate and the change would be lost silently. Any outcome other than `APPLIED` rolls back whatever the handler wrote. Rows that an earlier engine version stored with a retryable code are forgotten on the next push.
   **Creates are idempotent on the entity id** too: re-creating a row you already own answers `APPLIED` ("already exists") without touching it; someone else's row is `FORBIDDEN`.
2. **Order:** within a request the server sorts parents first (`lot`, `lot_image`, `handover`, `batch_handover`, `payment`, …), creates before updates, then by `clientTimestamp`.
3. **One bad row never fails the batch.** Each item is validated on its own; a malformed one becomes a non-retryable `REJECTED / INVALID_PAYLOAD` in its slot. Each valid mutation runs in its own transaction (guarantee: a mutation is applied completely or not at all; a batch is not atomic).
4. **Only the entity contract in §7 is accepted.** Unknown fields are `INVALID_PAYLOAD`, not silently stored. For older app builds the server first tolerates: redundant `id`/`lotId` equal to the entity id, lot `paymentStatus` (ignored with `IGNORED_SERVER_OWNED_FIELD`), handover `handoverLat/handoverLng/accuracyM` (mapped to `latitude/longitude/accuracy`), `spoofingFlags` containing a mock marker (→ `mockLocationFlag`), `geoFlag`/`spoofingFlags` (dropped) and phone file paths (`localPath`).
5. **Server-owned state is never taken from the phone** (§6, §7). The server derives distances, tolerance, final price, payment status and lot completion itself.
6. **A handover or dispute `create` does not change the lot's status.** Lot status moves only through `lot` mutations (client intent, validated along the client path and the server state machine) and server-side events (recycler confirms, payment completes, expiry).
7. **`paymentStatus` is derived** from the lot's `Payment` rows (`UNPAID`/`PARTIAL`/`PAID`); a fully paid `CONFIRMED` lot becomes `COMPLETED` (client state `PAID`) by the server.

---

## 4. `GET /api/v1/sync/pull?since=<ISO>`

Auth: Bearer. Returns what changed for **this** user since `since` (default: epoch). Fixture: `pull_response.json`.

```jsonc
{ "data": {
    "serverTimestamp": "2026-11-01T12:30:00.000Z", // server clock when the response was built
    "nextSince":       "2026-11-01T12:25:10.000Z", // pass as `since` on the next call
    "hasMore":         false,                       // true ⇒ call again at once with since = nextSince
    "lots":            [ /* §4.1 */ ],
    "lotUpdates":      [ /* §4.2 */ ],
    "notifications":   [ /* §4.3 */ ],
    "pickupRequests":  [ /* §4.4 */ ]
} }
```

All seven keys are always present (empty arrays when nothing changed).

**Cursor.** The three collections are paged as one stream ordered by (timestamp, kind, id), at most `limit` items per response in total (`?limit=`, default 200, max 500). `nextSince` names the **last delivered item**: its format is `<ISO>|<kind rank>|<id>` (e.g. `2026-11-01T12:25:10.000Z|1|c5000000-…`). Treat it as an **opaque string** and send it back unchanged as `since`; a plain ISO time (first call, epoch) means "strictly after that instant". Because the cursor includes the id, rows that share one timestamp are neither skipped nor repeated at a page boundary. When nothing new exists `nextSince` is the `since` you sent. The phone stores `nextSince` as its pull cursor (`SyncMeta`, no schema change) and loops while `hasMore`. `serverTimestamp` is read **before** the queries and is informational (clock skew, "last synced"); it is not used as a cursor. `since` that is neither ISO nor a cursor → `400 VALIDATION_ERROR`.

### 4.1 `lots[]` — authoritative lot rows (client vocabulary)

`id, lotRef, categoryId, subCategory?, approxWeightGrams, estimatedValuePaise?, estimatedMinPaise?, estimatedMaxPaise?, transactionStatus, chosenRecyclerId?, quotedRatePaise?, finalPricePaise?, confirmedWeightGrams?, paymentStatus (UNPAID|PARTIAL|PAID), collectedAt, createdAt, updatedAt, handovers[{id, handoverRef, status, declaredWeightGrams, confirmedWeightGrams?}], payments[{id, amountPaise, method, upiRef?, paidAt, recordedBy}]`

- `transactionStatus` is the **client vocabulary** from §6 (`toClientLotState`). The server's `LotStatus` is never sent.
- Handovers and payments are slim: **no** `verificationCode`, `codeHash`, `qrPayload`, coordinates or recycler internals. The serializer (`serializers.ts`) lists fields explicitly, and a test asserts no secret appears in a pull.
- `PickupRequest.collectorId` holds the owning **user** id (sync handler, REST route and web portal all write it; pull filters on it).
- Phone v1 does not read `lots` (it reads `lotUpdates`); it is for restore-on-new-phone and catching up lots created on another device.

### 4.2 `lotUpdates[]` — server-owned changes to lots the phone already has

`{ lotId, transactionStatus, finalPricePaise?, confirmedWeightGrams?, paymentStatus?, confirmedAt?, updatedAt }` (`confirmedAt` = the recycler's confirmation time)

Emitted for every lot in the page whose current client state is `CONFIRMED`, `PAID`, `REJECTED` (recycler declined) or `DISPUTED`; it is repeated on later pages whenever the lot changes, so the phone must treat it as idempotent. The phone applies it through its lot state machine **without** queueing a push (`transitionLot(fromServer: true)`), ignoring unknown lots and lots that already moved on. ⚠ gap F8: `LotUpdateSyncer` handles only `CONFIRMED`.

### 4.3 `notifications[]`

`{ id, title, body, isRead, dataJson (string|null: JSON {type, relatedId}), createdAt }`. ⚠ Phone v1 does not ingest these yet.

### 4.4 `pickupRequests[]`

`{ id, lotId, recyclerId, slot, status (REQUESTED|ACCEPTED|ON_THE_WAY|ARRIVED|COMPLETED|EXPIRED|CANCELLED), expiresAt, createdAt, updatedAt }`. ⚠ Phone v1 does not ingest these yet.

---

## 5. `GET /api/v1/reference/bootstrap?since=<ISO>`

Public (no token). Reference data the phone caches for offline use. Fixture: `bootstrap_response.json`.

### 5.1 What the route returns today (`src/app/api/v1/reference/bootstrap/route.ts`)

`{ timestamp, categories, safetyTopics, prices, recyclers, recyclerRates, collectionPoints, areaCentroids }`

| Key | Today's items | Differs from what `ReferenceDataSyncer` reads |
|---|---|---|
| (top) | `timestamp` | needs **`serverTimestamp`** |
| `categories` | `{ id, code, parentId, nameEn, nameHi, nameMr, iconKey, isHazardous }` | matches (syncer ignores `parentId`) |
| `prices` | `{ id, categoryId, area, district, recordedAt, buyingPricePaise, marketLowPaise, marketHighPaise }` (newest 200 since `since`) | needs **`benchmarkPricePaise`**, **`tolerancePercent`**, `buyerType`, `source`; the syncer does `item['benchmarkPricePaise'] as int` and would crash |
| `recyclers` | `{ id, name, latitude, longitude, authorizationStatus, authorizationValidTill, pickupAvailable, serviceRadiusKm, contactPhone, minimumWeightGrams, pickupChargePaise }` (VERIFIED only) | matches (syncer defaults `openFrom/openTo/rating`; extra keys ignored) |
| `recyclerRates` | `{ recyclerId, categoryId, ratePerKgPaise }` (current rates) | add **`updatedAt`** (the rate's `effectiveFrom`), else the phone shows "updated today" for every rate |
| `safetyTopics`, `collectionPoints`, `areaCentroids` | raw Prisma rows | not consumed by the phone yet |

### 5.2 Canonical shape (decision: the **server** adopts the syncer's names)

`serverTimestamp` (ISO) + the keys above, with `prices[]` as:

| Field | Source |
|---|---|
| `id` | `PricePoint.id` (stable ⇒ re-sends are no-ops on the phone) |
| `categoryId`, `area`, `district`, `recordedAt` | same names |
| `benchmarkPricePaise` | `buyingPricePaise` |
| `tolerancePercent` | smallest whole % so that `benchmark ± t%` covers `[marketLowPaise, marketHighPaise]`; `15` when the band is unknown (`toleranceFromBand`) |
| `buyerType` | `PricePoint.buyerType`, else `RECYCLER` for source RECYCLER, `SCRAP_DEALER` for FIELD_AGENT, `MARKET` for ADMIN (`toClientBuyerType`) |
| `source` | `FIELD_AGENT→FIELD`, `RECYCLER→RECYCLER`, `ADMIN→ADMIN` (`toClientSource`) |

Implemented by `mapPricePointToClient` (unit-tested). The bootstrap route must build `prices[]` with it (⚠ gap S6).

Semantics the phone relies on:
- `recyclers` and `recyclerRates` are a **full snapshot of VERIFIED, in-date recyclers**. The phone must drop cached recyclers/rates that are absent (⚠ gap F10: the syncer only upserts, so a suspended recycler stays on the phone).
- `categories` upsert by id. `prices` are appended to the phone's history (never overwritten), 12-week window, so the server returns the last 12 weeks (not "newest 200").
- `since` only narrows `prices`.

The phone's sync run is **push → bootstrap → pull → photos**. The old `GET /sync/reference` does not exist (⚠ gap F1: `HttpRemoteApi.pullReference` calls it, then falls back to `/sync/pull` on 404, and never calls bootstrap).

---

## 6. Lot status mapping (one table)

Implemented once, in [`lotStatusMapping.ts`](../src/lib/domain/lotStatusMapping.ts) (`toServerLotState`, `toClientLotState`, `CLIENT_PUSHABLE_LOT_STATES`), unit-tested (`tests/domain/lotStatusMapping.test.ts`). The wire always uses the **client vocabulary** in a field called `transactionStatus`; server `LotStatus`/`TransactionStatus` never cross the wire.

### 6.1 Table

| Client state | Server `LotStatus` | Server `TransactionStatus` | Who may set it via push |
|---|---|---|---|
| `DRAFT` | `DRAFT` | `QUOTED` | phone |
| `SAVED` | `READY` | `QUOTED` | phone |
| `QUOTED` | `MATCHED` | `QUOTED` | phone |
| `HANDOVER_PENDING` | `HANDED_OVER` | `HANDED_OVER` | phone |
| `CONFIRMED` | `HANDED_OVER` | `CONFIRMED` | **server only** (reaches the phone via `lotUpdates`) |
| `PAID` | `COMPLETED` | `PAID` | **server only** |
| `REJECTED` | `REJECTED` | `QUOTED` | **server only** (decision D7) |
| `CANCELLED` | `CANCELLED` | `CANCELLED` | phone |
| `EXPIRED` | `EXPIRED` | `QUOTED` | phone (7-day timer) and server cron |
| `DISPUTED` | `DISPUTED` | `DISPUTED` | phone |

Reverse (`toClientLotState`): the lot status decides; only `HANDED_OVER` looks at the transaction (`CONFIRMED`/`PAID` ⇒ `CONFIRMED`, else `HANDOVER_PENDING`). Round trip is lossless for all ten states (tested).

### 6.2 Deviations from the first proposal

- **D7 `REJECTED` is server-owned.** It records the *recycler's* refusal; if the phone could assert it, a collector could forge a refusal. Same reasoning as `CONFIRMED`/`PAID`. The phone's "Recycler said no" button is a mock-mode simulation of what arrives through `lotUpdates` in production.
- **D8 `REJECTED` and `EXPIRED` keep `transactionStatus = QUOTED`.** `TransactionStatus` has no value for them (the quote is what was refused / lapsed). The lot status alone identifies them on the way back, so no enum change is needed.

### 6.3 Client moves the server state machine must accept

The phone's transition table (`lotTransitions` in `lot_state.dart`, mirrored by `CLIENT_LOT_TRANSITIONS`) contains seven moves that `lotStateMachine.ts` refuses today (`findServerMachineGaps()`; a `todo` test tracks it). Required additions (additive; REJECTED and EXPIRED stop being terminal because the lot is "still the collector's" and can be re-quoted):

| Client move | Server move to allow |
|---|---|
| `QUOTED → REJECTED` | `MATCHED → REJECTED` |
| `HANDOVER_PENDING → CANCELLED` | `HANDED_OVER → CANCELLED` |
| `REJECTED → QUOTED` / `→ CANCELLED` | `REJECTED → MATCHED` / `→ CANCELLED` |
| `EXPIRED → QUOTED` / `→ CANCELLED` | `EXPIRED → MATCHED` / `→ CANCELLED` |
| `DISPUTED → CANCELLED` | `DISPUTED → CANCELLED` |

Server-side, `PAID` is the only way to `COMPLETED`, and `COMPLETED` stays terminal.

---

## 7. Entities

### 7.1 Pushable entities

"Server-owned" = the phone must not send it; the server answers `REJECTED / FORBIDDEN_FIELD` (or `INVALID_PAYLOAD` for unknown names). All fields are exactly the keys listed; anything else is `INVALID_PAYLOAD`. `payload.id`, when present, must equal `entityId`. `✓` = handler already exists in `syncEngine.ts` (its field names may still differ ⚠), `new` = handler to be written.

| Entity | Ops | Payload fields (phone → server) | Server-owned / never sent | Handler |
|---|---|---|---|---|
| `lot` | create, update | **create:** `id, lotRef, categoryId, approxWeightGrams, transactionStatus (DRAFT\|SAVED\|QUOTED), collectedAt`, optional `subCategory, description, estimatedValuePaise, estimatedMinPaise, estimatedMaxPaise, aiCategoryId, aiConfidence, expiresAt, collectLat, collectLng, isHazardous, soldBy`. **update** (any subset): `transactionStatus (DRAFT\|SAVED\|QUOTED\|HANDOVER_PENDING\|CANCELLED\|EXPIRED\|DISPUTED), categoryId, isHazardous, description, approxWeightGrams, estimate*Paise, chosenRecyclerId, quotedRatePaise, expectedValuePaise, cancelReason (PRICE_LOW\|SOLD_ELSEWHERE\|WRONG_MATERIAL\|OTHER), cancelledAt` | `finalPricePaise`, `confirmedWeightGrams`, `paymentStatus`; `transactionStatus` ∈ {`CONFIRMED`,`PAID`,`REJECTED`}; `lotRef` after create | ✓ (walks the client path through the state machine, quotes from the recycler's rate card, creates the `Transaction`) |
| `lot_image` | create | `id, kind (COLLECTION\|HANDOVER\|DISPUTE\|TRAINING), storageKey`, `lotId` (all kinds except TRAINING), optional `sha256` (64 hex), `imageHash` (16 hex, 64-bit dHash), `bytes, widthPx, heightPx, takenAt`; TRAINING also `categoryId, angle (top\|side)` and **no** `lotId`. **Upload first** (§8): the object behind `storageKey` must exist or the answer is retryable `OBJECT_NOT_UPLOADED` | phone-local `localPath` is never sent; TRAINING from field agents only | ✓ |
| `handover` | create, update | **create:** `id, lotId, handoverRef, declaredWeightGrams, qrPayload, codeHash, capturedAt`, optional `latitude, longitude, accuracy, locationSource (GPS\|NETWORK\|MANUAL), mockLocationFlag, batchId`. **update** (subset): `packedSafely, acceptedByCollector (true), status (CANCELLED\|DISPUTED), disputeId, arrivedAt, arrivalDistanceM`, location fields | `confirmedWeightGrams`, `codeVerified`, `weightToleranceStatus`, `recyclerConfirmedAt`, `locationClass`, `distanceToRecyclerMeters`; `status` ∈ {`CONFIRMED`,`WEIGHED`,`REJECTED`}; the plain code | ✓ (stores `codeHash`, never generates a code; update applies only the allowed fields; `acceptedByCollector` on a `WEIGHED` handover confirms it at a server-computed price) |
| `batch_handover` | create | `id, batchRef, recyclerId, lotIds[≥1], totalWeightGrams, qrPayload, codeHash, capturedAt` | `status` (CONFIRMED/PAID come from the recycler / payments) | ✓ |
| `payment` | create | `id, lotId, amountPaise (>0), method (CASH\|UPI), paidAt`, optional `upiRef, batchId` | `recordedBy`, `confirmedByCollector`, `canonicalId`, lot `paymentStatus`/`PAID` | ✓ (merge rule below; ownership checked; `paymentStatus` recomputed) |
| `price_point` | create | `id, categoryId, buyingPricePaise (>0), buyerType (MARKET\|SCRAP_DEALER\|RECYCLER), area, recordedAt`, optional `latitude, longitude`. **Field agents only** (`FORBIDDEN_ROLE` otherwise) | `source` (= FIELD_AGENT), `recordedById` | ✓ |
| `consent` | create | `id, version, language, locationConsent, timestamp` | – | ✓ |
| `pickup_request` | create, update | **create:** `id, lotId, recyclerId, slot`. **update:** `status: "CANCELLED"` | `status` otherwise, `expiresAt` (24 h) | ✓ create only |
| `coverage_request` | create | `id, latitude, longitude, categoryId, approxWeightGrams` (server rounds to 3 decimals for analytics) | – | ✓ |
| `dispute` | create, update | **create:** `id, lotId, handoverId, reason (WRONG_WEIGHT\|WRONG_PRICE\|MATERIAL_REJECTED\|OTHER), hasEvidence, createdAt` (evidence photo = `lot_image` kind DISPUTE). **update:** `hasEvidence` only | `raisedBy` (= COLLECTOR), `status`, `resolutionNote`, `resolvedAt`: **a collector can never resolve a dispute** (decision D9, deviation from "update may apply resolution"); the resolution is the recycler's/server's and reaches the phone through `lotUpdates` | ✓ |
| `incident` | create | `id, type (burn\|cut\|battery_leak\|fumes\|other), occurredAt`, optional `note, latitude, longitude` (null = no GPS fix), `lotId` | `severity` (derived from `type`) | ✓ |
| `quiz_result` | create | `id, topicId, score, passed, completedAt` | – | ✓ (phone does not enqueue yet) |
| `rating` | create | `id, recyclerId, rating (1–5), comment?` | – | ✓ (phone does not enqueue yet) |
| `profile` | create, update | `preferredLanguage?, operatingArea?`. `entityId` = `collectorId`. `create` behaves as `update` (identity already exists from `/auth/register`) | `phone`, `shortCode`, `name`, `collectorId` | ✓ |
| `dealer_comparison` | create, update | `id, lotId, categoryId, dealerRatePaise, ourRatePaise, createdAt` (one per lot; a second save is an `update` with the same `id`) | – | ✓ (new model `DealerComparison`) |

**Payment merge rule (unchanged):** a collector `payment` with the same `lotId`, `amountPaise` and `method` as a recycler-recorded payment is merged into it (`confirmedByCollector = true`, result `APPLIED` with `canonicalId` = the recycler's payment id), so totals never double count.

**Handover codes:** only `codeHash` = SHA-256 hex of `"<handoverRef>:<4-digit code>"` (batches: `"<batchRef>:<code>"`, UTF-8) is ever sent or stored. The plain code stays on the phone and is read to the recycler. The recycler portal (`/recycler/verify` + `confirmHandoverAction`) asks for the code, hashes it with the handover's ref and compares in constant time (`verifyEnteredHandoverCode`); a bare 4-digit lookup tests the hash against that facility's open handovers. The plain `verificationCode` column is a LEGACY fallback read only for handovers without a hash (web/REST-created ones). Test vectors shared with the Dart implementation: `handover_code_vectors.json`.

**Ownership checks:** every `entityId` / `lotId` / `handoverId` must belong to the authenticated user; otherwise `REJECTED / FORBIDDEN`.

### 7.2 Entities that are NOT pushable (decisions)

| Name | Decision | Why |
|---|---|---|
| `safety_incident` | renamed **`incident`** | Server name is the sensible one (adapt to server). |
| `batch` | renamed **`batch_handover`**; update mutations (`status CONFIRMED/PAID`) dropped | Server name; confirmation and payment settlement of a batch are recycler/server events. |
| `collector` | **removed** | Registration is `POST /auth/register`; later changes are `profile`. The old payload also carried `name` and `phone`. |
| `recycler_rate` | **removed from the app** (D5) | A recycler edits rates in the recycler web portal (R3) with a web session; a collector/field token must never be able to change a recycler's rates. The only mobile code path is the legacy Provider-based recycler demo screen. Rates arrive via bootstrap. |
| `transaction` | **removed** | The server creates the transaction itself when a lot is quoted to a recycler. The phone never pushed it. |
| `profile` | **kept, new server handler** (D6) | The only way a language/area change made offline reaches the server; tiny, own-row only. |
| `dealer_comparison` | **kept, new server handler** (D4) | Powers the "Extra earned using the app" figure (C10/C19) and impact reporting; the dealer's rate exists only on the phone and cannot be reconstructed server-side. Needs additive model `DealerComparison` (§10 S4). |

---

## 8. Photos

**Upload first, then push the metadata** (decision D10, replaces the earlier metadata-first idea; the phone's `lot_image` row waits until the upload succeeds):

1. `POST /api/v1/uploads/presign` `{ filename, contentType }` → `{ uploadUrl, storageKey, expiresInSeconds }`. `storageKey` is always under `images/<userId>/`.
2. The phone `PUT`s the JPEG (< 150 KB; EXIF/XMP/IPTC already stripped for TRAINING) to `uploadUrl` (local dev driver: `PUT /api/v1/uploads/local?key=…` with the Bearer header).
3. The phone pushes `lot_image` `create` with that `storageKey` (+ `sha256`, `imageHash`, …). The server checks the prefix (`INVALID_STORAGE_KEY`) and that the object exists (`OBJECT_NOT_UPLOADED`, **retryable**, not remembered, so the same mutation can simply be retried after the upload).

`imageHash` (perceptual dHash) is separate from `sha256` (byte hash). A photo whose `sha256` or `imageHash` equals one already attached to another lot raises a duplicate-photo anomaly flag (exact match; the ≤ 5-bit Hamming comparison is a future improvement). `POST /api/v1/upload/image`, which the phone calls today, does not exist (⚠ gap F2).

---

## 9. Fixtures — keeping both sides honest

`tests/fixtures/contract/*.json` is the canonical sample set; **KABADI-WALA is the master copy**.

| File | Content |
|---|---|
| `push_request.json` / `push_response.json` | 20 mutations (every pushable entity, create + update) / matching results with APPLIED, DUPLICATE, CONFLICT, REJECTED |
| `pull_response.json` | full pull envelope incl. CONFIRMED and PAID `lotUpdates` |
| `bootstrap_response.json` | canonical bootstrap (§5.2) |
| `auth_*.json`, `error_login_invalid.json` | `{ httpStatus, request, response }` per auth endpoint + an error |

- **Server:** `tests/unit/syncContractFixtures.test.ts` validates every fixture against `syncContract.ts` (the push request with the route's own `PushRequestSchema`) and runs `mapPricePointToClient`, `sortMutations` and the lot mapping on them. Run: `npx tsx --test "tests/unit/**/*.test.ts"`.
- **Flutter:** `E_waste/test/contract_fixtures_test.dart` pushes the request fixture through `HttpRemoteApi` and parses the response, applies the bootstrap and pull fixtures with `ReferenceDataSyncer` / `LotUpdateSyncer`, and drives every auth call. Run: `scripts/verify.sh test/contract_fixtures_test.dart`.
- **Sync rule:** change a fixture only in `KABADI-WALA/tests/fixtures/contract/`, then copy:
  `cp KABADI-WALA/tests/fixtures/contract/*.json E_waste/test/fixtures/contract/`
  The server test `E_waste/test/fixtures/contract is a byte-for-byte copy…` fails when the two folders differ (it is skipped only when `E_waste` is not checked out next to `KABADI-WALA`).
- Changing the contract = this document + `syncContract.ts` + the fixtures + both test suites, in one change.

---

## 10. Gap list (what later phases must do)

**Server** (Phase 2 = engine/routes, Phase 4 = security)

| # | Gap | Status |
|---|---|---|
| S1 | `clientMutationId`/`code`/`message`/`retryable` on every result, `serverTimestamp` on push, `INVALID_OP`/`INVALID_PAYLOAD` via `ENTITY_CONTRACT` | ✅ Phase 2 |
| S2 | `lot` handler on client vocabulary + mapping, server-owned states refused, extra lot fields stored, `Transaction` created on quote | ✅ Phase 2 |
| S3 | `codeHash` stored (plain code legacy-only), recycler verify by hash, handover `update`, new handover statuses | ✅ Phase 2 |
| S4 | Handlers `profile`, `dealer_comparison`, `batch_handover`, `incident`, `dispute` update, `pickup_request` cancel, `lot_image` fields; schema additions logged in `schema-changes.md` | ✅ Phase 2 |
| S5 | Pull: `serverTimestamp`, `lotUpdates`, compound cursor, slim serializers (no secrets) | ✅ Phase 2 |
| S6 | Bootstrap: `serverTimestamp`, `mapPricePointToClient`, `recyclerRates[].updatedAt`, last-12-weeks prices, expired recyclers excluded | ⏳ not done (route unchanged) |
| S7 | `lotStateMachine.ts` accepts the §6.3 moves | ✅ Phase 2 |
| S8 | Sync endpoints accept FIELD_AGENT tokens, role check per entity | ✅ Phase 2 (`getAuthSyncActor`) |
| S9 | Idempotency scoped to the user | ✅ Phase 2 |
| S10 | Unify `CollectorProfile`; rate-limit `/auth/pin-recovery` | ⏳ Phase 4 |
| S11 | 500 responses must not echo `err.message` | ◐ sync/pull/push done; remaining routes Phase 4 |
| S12 | `uploads/presign` accepts `imageId` | ✖ dropped: upload-first flow does not need it |
| S13 | Update `src/lib/openapi/paths.ts`, then `npm run docs:openapi` | ✅ push/pull updated Phase 2 |

**Flutter** (Phase 3)

| # | Gap | Status |
|---|---|---|
| F1 | `pullReference` → `reference/bootstrap`, `pullChanges` → loop `sync/pull` on a persisted server cursor; no 404 fallback | ✅ Phase 3 |
| F2 | Upload (presign + PUT, Bearer only for our own host) before the `lot_image` row is pushed; the row waits, then carries `storageKey` + `sha256` | ✅ Phase 3 |
| F3 | Stable per-install `deviceId` (`SyncMeta.deviceId`) | ✅ Phase 3 |
| F4 | Contract payloads: `WireMapper` (one tested place) renames, strips and re-names fields for a real server, including rows queued by older app versions; `incident` / `batch_handover` also renamed at the source | ✅ Phase 3 (handover coordinates are renamed by the mapper, not at the source) |
| F5 | Server-owned fields/states are never sent to a real server (they stay local; the mock server still gets them) | ✅ Phase 3 |
| F6 | `collector` and `recycler_rate` are no longer enqueued; legacy rows are dropped by the mapper | ✅ Phase 3 |
| F7 | `REJECTED` + `retryable:false` rows are parked (`REJECTED: ` prefix, "Check" chip, never resent); retryable ones back off per row | ✅ Phase 3 |
| F8 | `LotUpdateSyncer`: `CONFIRMED`, `PAID`, `REJECTED` | ✅ Phase 3 (`DISPUTED` is phone-originated and ignored) |
| F9 | Ingest `notifications` / `pickupRequests` | ⏳ not done (optional) |
| F10 | `ReferenceDataSyncer`: drop recyclers/rates missing from the snapshot | ⏳ not done |
| F11 | No calls to `/auth/reset-pin/otp` or `/sync/my-data` (both now throw `UnsupportedError` against the real server, mock only) | ✅ Phase 3. Still open: staff sign-in calls `/auth/role-login` and `/auth/staff-register`, which the server does not have |
| F12 | Old `http_remote_api_test.dart` shapes | ✅ updated where behaviour changed; the file still contains tests of endpoints that exist only for the online flow |
| F13 | Auth: real `register` with the user's PIN, `login`, restore on a new phone, PIN recovery, 401 handling ("sign in again" banner), token in secure storage only, no `local-demo` outside mock mode | ✅ Phase 3 |
| F14 | No compiled-in server URL: `--dart-define=API_BASE_URL` / `STAGING_API_BASE_URL`, default local dev server | ✅ Phase 3 |

### Open questions for the product owner

- **Q1 (resolved in Phase 3, preferred option taken):** `name` is optional on `/auth/register` and the app sends none. `PROJECT.md` and the consent text still need to be reconciled in Phase 4.
- **Q2:** `pickup_request` and `coverage_request` are marked "old flow" in `APP_API_GUIDE.md` §4.9 (their REST endpoints), yet `syncEngine` handles them and the contract keeps them. Confirm they stay in the offline contract.

---

## 11. Superseded documents

| Document | Status |
|---|---|
| `E_waste/docs/api_contract.md` | Rewritten as the phone-side companion; wire details live here. |
| `E_waste/docs/backend_implementation_guide.md` | **Superseded** (PostgreSQL/PostGIS design, `payloadJson` push, `/sync/reference`). Kept for history only. |
| `E_waste/docs/API_DOCUMENTATION.md` §3–4 | Endpoint table updated to point here; `RemoteApi` Dart interface notes still valid. |
| `KABADI-WALA/docs/API.md` §3 (sync) and §4.1 (auth) | Defer to this file where they differ. |
| `KABADI-WALA/docs/APP_API_GUIDE.md` §4.8 sync row | Offline sync is specified here. |
| `KABADI-WALA/docs/contract-diff.md` | Column-level Drift↔Prisma diff (v3); still a useful reference for table columns, not for wire format. |
