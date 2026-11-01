# Schema Changes Log (MongoDB Transition & Drift v3 Extensions)

## 1. MongoDB Architecture Transition
- Changed datasource provider from `postgresql` to `mongodb`.
- Removed unsupported `@db.Decimal` annotations; converted all currency to integer **PAISE** and weights to integer **GRAMS**.
- Maintained client UUIDs without default `@default(uuid())` on client-created entities (`Lot`, `LotImage`, `Handover`, `Payment`, `PricePoint`, `SyncMutation`).
- Retained integer IDs for `MaterialCategory` (`id Int @id @map("_id")`) matching Drift categories. Added `nextCategoryId()` helper.
- Removed SQL `@autoincrement()` from `SafetyTopic` and `ModelVersion`; switched to `String @id @default(uuid()) @map("_id")`.
- Set `relationMode = "prisma"` with `@@index` on foreign key fields.
- Replaced partial unique index for current rates with transactional concurrency enforcement.

## 2. Model Extensions for Drift v3 & Functional Requirements
- **Lot**: Added `subCategory`, `chosenRecyclerId`, `quotedRatePaise`, `finalPricePaise`, `transactionStatus`, `paymentStatus`.
- **LotStatus**: Added `REJECTED`, `EXPIRED`, `DISPUTED`.
- **Handover**: Added `verificationCode` (4-digit code), `accuracy`, `locationSource`, `distanceToRecyclerMeters`, `locationClass`, `mockLocationFlag`.
- **Payment**: Added `recordedBy` (`COLLECTOR` | `RECYCLER`) and `canonicalId` for double-entry merging.
- **New Operational Models**:
  - `ConsentRecord`: Collector consent version, timestamp, language, location consent flag.
  - `DeviceRestore`: Device migration and PIN restoration records.
  - `BatchHandover` & `BatchHandoverItem`: Multi-lot single QR handover.
  - `Dispute`: Dispute resolution audit log.
  - `IncidentReport`: Safety incident logging.
  - `SafetyQuizResult`: Mobile quiz completions.
  - `PriceAlert`: Category price tracking.
  - `Notification`: Push notification queue for sync pull.
  - `RecyclerRating`: 1-5 star ratings + comments.
  - `ReceiptShareToken`: Public receipt token without PII.
  - `AreaCentroid`: Lat/lng cluster centroids.
  - `RecyclerServiceArea`: Custom service zones, pickup radii, and minimum weights.
  - `CollectionPoint`: Recycler drop-offs, aggregation centers, mobile camps.
  - `PickupRequest`: On-demand pickup requests with 24h expiry.
  - `CoverageRequest`: Unserviced area demand telemetry.
  - `PlatformFeeConfig`: Platform fee and commission rates.
  - `DatasetCard` & `DataValidationResult`: Anomaly tracking and AI dataset health.

## 3. Phase 2 — sync contract (APPLIED 2026-11-02; MongoDB, no migration files: `npx prisma db push`)
All changes are additive or relax a constraint; existing documents stay valid.
- **Handover**: `verificationCode` becomes **optional** (phone handovers no longer store a plain code; it is a LEGACY value for web/REST-created handovers), new `codeHash String?` (sha256 of `"<handoverRef>:<code>"`), `packedSafely Boolean @default(false)`, `acceptedByCollectorAt DateTime?`. `HandoverStatus` += `WEIGHED`, `REJECTED`, `CANCELLED`.
- **BatchHandover**: `verificationCode` optional (LEGACY), new `codeHash String?`, `collectorId String?`, `totalWeightGrams Int?`, `capturedAt DateTime?`.
- **Lot**: `expectedValuePaise Int?`, `expiresAt DateTime?`, `soldBy String?`, `cancelReason String?`, `cancelledAt DateTime?`. (`paymentStatus` stays server-derived from `Payment` rows.)
- **LotImage**: `lotId` optional (TRAINING photos belong to no lot), new `imageHash String?` (64-bit dHash), `angle String?`. `ImageKind` += `DISPUTE`.
- **Dispute**: `hasEvidence Boolean @default(false)`.
- **IncidentReport**: `type String?`, `note String?`, `occurredAt DateTime?`, `latitude Float?`, `longitude Float?` (`description`/`severity` are filled by the server from `type`).
- **New model `DealerComparison`**: client-UUID `id`, `lotId` (unique, one comparison per lot), `collectorId`, `categoryId`, `dealerRatePaise`, `ourRatePaise`, `clientCreatedAt`, timestamps.
- Not done from the Phase 1 plan: `Dispute.status` (a collector cannot resolve disputes, resolution stays in `resolution`/`resolvedAt`), `Handover.arrivedAt/arrivalDistanceM/disputeId/batchId/weightToleranceStatus/codeVerified` (arrival fields already existed; the rest are not needed by the server flow).
- **Lot state machine** (`src/lib/domain/lotStateMachine.ts`, code not schema): `MATCHED→REJECTED`, `HANDED_OVER→CANCELLED`, `REJECTED→MATCHED|CANCELLED`, `EXPIRED→MATCHED|CANCELLED`, `DISPUTED→CANCELLED`; only `COMPLETED` and `CANCELLED` are terminal.
- **Semantics change (no schema change)**: the recycler portal's "confirm" now leaves a lot `HANDED_OVER` + `transactionStatus CONFIRMED` (client state CONFIRMED); `COMPLETED` (client state PAID) is set only when the lot is paid.
