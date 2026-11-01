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

