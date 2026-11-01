# Contract Diff: Drift Schema (v3) vs Prisma MongoDB Server Schema

This document details every table and column in the Flutter mobile Drift database (`local_db.dart` v3) compared with the server Prisma model and fields, noting units, mappings, and reconciliations.

## Summary of Conventions & Reconciliation Rules
1. **Source of Truth**: `local_db.dart` (v3) is the absolute contract for mobile data exchanges.
2. **Units**:
   - **Money**: Integer **PAISE** across both client and server (e.g. 1500 paise = ₹15.00). No floating-point or Decimal rounding issues.
   - **Weight**: Integer **GRAMS** across both client and server (e.g. 10000 grams = 10.00 kg).
3. **Primary Keys & Identifiers**:
   - Offline-created entities (`Lot`, `LotImage`, `Handover`, `Payment`, `PricePoint`, `SyncMutation`) use client-generated UUIDs (`id String @id @map("_id")` without `@default(uuid())`).
   - Server-created entities use `@default(uuid())`.
   - `MaterialCategory` uses explicit `Int` IDs (`id Int @id @map("_id")`) to preserve matching category integers between mobile and backend.
4. **Relations**:
   - Drift `Lots` contains denormalized lifecycle fields (`chosenRecyclerId`, `quotedRatePaise`, `finalPricePaise`, `transactionStatus`, `paymentStatus`) for instant offline queries and UI rendering. The server mirrors these directly on the `Lot` model while maintaining the formal `Transaction` entity.
   - Handover and Payment in Drift directly reference `lotId`. The server supports direct `lotId` on `Handover` and `Payment` (as well as optional `transactionId`).

---

## Detailed Table & Column Mapping

### 1. Categories (`local_db.dart: Categories` -> Prisma: `MaterialCategory`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Int` (PK) | `id` | `Int` (`@id @map("_id")`) | Explicit Int ID | Match. Admin auto-assigns `max(id) + 1`. |
| `code` | `Text` | `code` | `String` (`@unique`) | Material code (e.g. `PCB`, `BATTERY`) | Match |
| `parentId` | `Int?` | `parentId` | `Int?` | Sub-category support | Match |
| `nameEn` | `Text` | `nameEn` | `String` | English display name | Match |
| `nameHi` | `Text` | `nameHi` | `String` | Hindi display name | Match |
| `nameMr` | `Text` | `nameMr` | `String` | Marathi display name | Match |
| `iconKey` | `Text` | `iconKey` | `String` | Asset key for mobile UI icon | Match |
| `isHazardous`| `Bool` | `isHazardous`| `Boolean` (`@default(false)`) | Safety hazard flag | Match |
| — | — | `defaultUnit`| `Unit` (`@default(KG)`) | Server metadata | Retained on server |
| — | — | `isActive` | `Boolean` (`@default(true)`) | Soft-delete / catalog flag | Retained on server |

---

### 2. PriceCache (`local_db.dart: PriceCache` -> Prisma: `PricePoint`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` (PK) | `id` | `String` (`@id @map("_id")`) | UUID | Match |
| `categoryId` | `Int` | `categoryId` | `Int` | FK to MaterialCategory | Match |
| `area` | `Text` | `area` | `String` | Locality name | Match |
| `district` | `Text` | `district` | `String` | District name | Match |
| `recordedAt` | `DateTime` | `recordedAt` | `DateTime` | UTC ISO-8601 | Match |
| `buyingPricePaise` | `Int` | `buyingPricePaise` | `Int` | **Paise per kg** | Aligned from Decimal rupees |
| `marketLowPaise` | `Int?` | `marketLowPaise` | `Int?` | **Paise per kg** | Aligned from Decimal rupees |
| `marketHighPaise` | `Int?` | `marketHighPaise` | `Int?` | **Paise per kg** | Aligned from Decimal rupees |
| — | — | `subCategory` | `String?` | Sub-category distinction | Added to Prisma |
| — | — | `buyerType` | `String?` | `SCRAP_DEALER` / `RECYCLER` | Added to Prisma (from F2 PendingPrices) |
| — | — | `latitude` | `Float?` | Recorded coordinate | Retained on server |
| — | — | `longitude` | `Float?` | Recorded coordinate | Retained on server |

---

### 3. RecyclerCache (`local_db.dart: RecyclerCache` -> Prisma: `Recycler`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` (PK) | `id` | `String` (`@id @map("_id")`) | UUID | Match |
| `name` | `Text` | `name` | `String` | Business name | Match |
| `latitude` | `Real` | `latitude` | `Float` | Coordinate | Match |
| `longitude` | `Real` | `longitude` | `Float` | Coordinate | Match |
| `authorizationStatus` | `Text` | `authorizationStatus`| `AuthStatus` enum | `PENDING`, `VERIFIED`, `EXPIRED`, `SUSPENDED` | Match |
| `authorizationValidTill` | `DateTime?` | `authorizationValidTill` | `DateTime?` | Expiry timestamp | Match |
| `pickupAvailable` | `Bool` | `pickupAvailable` | `Boolean` | Doorstep pickup flag | Match |
| `serviceRadiusKm` | `Real` | `serviceRadiusKm` | `Float` | Service range in km | Match |
| `contactPhone` | `Text` | `contactPhone` | `String` | Recycler phone number | Match |
| — | — | `authorizationNo` | `String` (`@unique`) | Official license/cert number | Retained on server |
| — | — | `minimumWeightGrams`| `Int` (`@default(0)`) | Minimum lot weight in grams for pickup | Added to Prisma |
| — | — | `pickupChargePaise` | `Int` (`@default(0)`) | Pickup fee in paise | Added to Prisma |
| — | — | `openingHours` | `String?` | Operating schedule | Added to Prisma |

---

### 4. RecyclerRateCache (`local_db.dart: RecyclerRateCache` -> Prisma: `RecyclerRate`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `recyclerId` | `Text` | `recyclerId` | `String` | FK to Recycler | Match |
| `categoryId` | `Int` | `categoryId` | `Int` | FK to MaterialCategory | Match |
| `ratePerKgPaise` | `Int` | `ratePerKgPaise` | `Int` | **Paise per kg** | Aligned from Decimal rupees |
| — | — | `isCurrent` | `Boolean` (`@default(true)`) | Active rate flag | Enforced 1 current rate per (recycler, category) in transactions |
| — | — | `effectiveFrom` | `DateTime` (`@default(now())`) | Rate effective timestamp | Retained on server |

---

### 5. Lots (`local_db.dart: Lots` -> Prisma: `Lot`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` (PK) | `id` | `String` (`@id @map("_id")`) | Client-generated UUID | Match |
| `lotRef` | `Text` (`@unique`) | `lotRef` | `String` (`@unique`) | `LOT-{shortCode}-{yyMMdd}-{seq}` | Match |
| `categoryId` | `Int` | `categoryId` | `Int` | FK to MaterialCategory | Match |
| `subCategory` | `Text?` | `subCategory` | `String?` | Detail classification | Match |
| `description` | `Text?` | `description` | `String?` | Optional lot notes | Match |
| `condition` | `Text` | `condition` | `Condition` enum | `WORKING`, `DAMAGED`, `BROKEN`, `UNKNOWN` | Match |
| `sourceType` | `Text` | `sourceType` | `SourceType` enum | `HOUSEHOLD`, `OFFICE`, `SHOP`, `REPAIR_SHOP`, `OTHER` | Match |
| `approxWeightGrams` | `Int` | `approxWeightGrams` | `Int` | **Grams** | Aligned from Decimal approxWeightKg |
| `estimatedValuePaise` | `Int?` | `estimatedValuePaise` | `Int?` | **Paise** | Aligned from Decimal rupees |
| `estimatedMinPaise` | `Int?` | `estimatedMinPaise` | `Int?` | **Paise** | Aligned from Decimal rupees |
| `estimatedMaxPaise` | `Int?` | `estimatedMaxPaise` | `Int?` | **Paise** | Aligned from Decimal rupees |
| `aiCategoryId` | `Int?` | `aiCategoryId` | `Int?` | ML suggested category | Match |
| `aiConfidence` | `Real?` | `aiConfidence` | `Float?` | Classification confidence 0..1 | Match |
| `status` | `Text` | `status` | `LotStatus` enum | `DRAFT`, `READY`, `MATCHED`, `HANDED_OVER`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`, `DISPUTED` | Extended with `REJECTED`, `EXPIRED`, `DISPUTED` |
| `collectedAt` | `DateTime` | `collectedAt` | `DateTime` | Timestamp collected | Match |
| `collectLat` | `Real?` | `collectLat` | `Float?` | Geolocation latitude | Match |
| `collectLng` | `Real?` | `collectLng` | `Float?` | Geolocation longitude | Match |
| `chosenRecyclerId` | `Text?` | `chosenRecyclerId` | `String?` | Recycler selected by collector (C7) | Added to Lot on server |
| `quotedRatePaise` | `Int?` | `quotedRatePaise` | `Int?` | Quoted rate in **Paise per kg** | Added to Lot on server |
| `finalPricePaise` | `Int?` | `finalPricePaise` | `Int?` | Final settlement in **Paise** (server-owned) | Added to Lot on server |
| `transactionStatus` | `Text` | `transactionStatus` | `TransactionStatus` | Status of negotiation/deal | Added to Lot on server |
| `paymentStatus` | `Text` | `paymentStatus` | `PaymentStatus` | `UNPAID`, `PARTIAL`, `PAID` | Added to Lot on server |
| `syncState` | `IntEnum` | — | — | Client local sync state | Client-only (not stored on server) |
| — | — | `collectorId` | `String` | FK to Collector profile | Server assigns from authenticated User |

---

### 6. LotImages (`local_db.dart: LotImages` -> Prisma: `LotImage`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` (PK) | `id` | `String` (`@id @map("_id")`) | Client-generated UUID | Match |
| `lotId` | `Text` | `lotId` | `String` | FK to Lot | Match |
| `kind` | `Text` | `kind` | `ImageKind` enum | `COLLECTION`, `HANDOVER`, `TRAINING` | Match |
| `localPath` | `Text` | `localPath` | `String?` | Local mobile file path | Optional on server |
| `remoteKey` | `Text?` | `storageKey` | `String` | S3 / MinIO storage key | Match (`remoteKey` mapped to `storageKey`) |
| `takenAt` | `DateTime` | `takenAt` | `DateTime` | Camera capture timestamp | Match |
| `uploaded` | `Bool` | — | — | Client-only upload tracking | Client-only |
| — | — | `sha256` | `String?` | Hash for duplicate photo detection | Added to server schema |

---

### 7. Handovers (`local_db.dart: Handovers` -> Prisma: `Handover`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` (PK) | `id` | `String` (`@id @map("_id")`) | Client-generated UUID | Match |
| `lotId` | `Text` | `lotId` | `String` | Direct FK to Lot | Supported directly on Handover |
| `handoverRef` | `Text` (`@unique`) | `handoverRef` | `String` (`@unique`) | Human-readable verification reference | Match |
| `qrPayload` | `Text` | `qrPayload` | `String` | Barcode/QR content | Match |
| `declaredWeightGrams` | `Int` | `declaredWeightGrams` | `Int` | Weight declared by collector in **Grams** | Aligned from Decimal kg |
| `confirmedWeightGrams` | `Int?` | `confirmedWeightGrams` | `Int?` | Actual scale weight in **Grams** (server/recycler owned) | Aligned from Decimal kg |
| `capturedAt` | `DateTime` | `capturedAt` | `DateTime` | UTC capture time | Match |
| `latitude` | `Real?` | `latitude` | `Float?` | Handover GPS lat | Match |
| `longitude` | `Real?` | `longitude` | `Float?` | Handover GPS lng | Match |
| `status` | `Text` | `status` | `HandoverStatus` | `PENDING`, `CONFIRMED`, `DISPUTED` | Match |
| `recyclerConfirmedAt` | `DateTime?` | `recyclerConfirmedAt` | `DateTime?` | Confirmation timestamp | Match |
| `syncState` | `IntEnum` | — | — | Client-only sync status | Client-only |
| — | — | `verificationCode` | `String` | 4-digit offline verification PIN | Added to Prisma |
| — | — | `accuracy` | `Float?` | GPS accuracy in meters | Added to Prisma (location proof) |
| — | — | `locationSource` | `String?` | `GPS`, `NETWORK`, `MANUAL` | Added to Prisma |
| — | — | `distanceToRecyclerMeters` | `Float?` | Proximity check | Added to Prisma |
| — | — | `locationClass` | `String?` | `MATCH`, `NEAR`, `FAR`, `UNKNOWN` | Added to Prisma |
| — | — | `mockLocationFlag` | `Boolean` (`@default(false)`) | Anti-spoofing flag | Added to Prisma |

---

### 8. Payments (`local_db.dart: Payments` -> Prisma: `Payment`)

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes | Reconciliation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` (PK) | `id` | `String` (`@id @map("_id")`) | Client-generated UUID | Match |
| `lotId` | `Text` | `lotId` | `String` | Direct FK to Lot | Supported directly on Payment |
| `amountPaise` | `Int` | `amountPaise` | `Int` | Payment in **Paise** | Aligned from Decimal amount |
| `method` | `Text` | `method` | `PaymentMethod` | `CASH`, `UPI` | Match |
| `upiRef` | `Text?` | `upiRef` | `String?` | UTR / UPI transaction ref | Match |
| `paidAt` | `DateTime` | `paidAt` | `DateTime` | UTC payment time | Match |
| `confirmedByCollector` | `Bool` | `confirmedByCollector` | `Boolean` | Collector confirmation | Match |
| `syncState` | `IntEnum` | — | — | Client sync state | Client-only |
| — | — | `recordedBy` | `String` (`@default("COLLECTOR")`) | `COLLECTOR` or `RECYCLER` | Added to Prisma (for payment deduplication/merging) |
| — | — | `canonicalId` | `String?` | Merged canonical payment ID | Added to Prisma |

---

### 9. PendingPrices (`local_db.dart: PendingPrices` -> Prisma: `PricePoint`)

Field agent submissions (F2) queue in `PendingPrices` and sync to `PricePoint` with `source = FIELD_AGENT`.

| Drift Column | Drift Type | Prisma Field | Prisma Type | Units / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Text` | `id` | `String` | Client UUID |
| `categoryId` | `Int` | `categoryId` | `Int` | Category FK |
| `area` | `Text` | `area` | `String` | Locality |
| `buyingPricePaise` | `Int` | `buyingPricePaise` | `Int` | **Paise per kg** |
| `buyerType` | `Text` | `buyerType` | `String` | `SCRAP_DEALER` / `RECYCLER` |
| `recordedAt` | `DateTime` | `recordedAt` | `DateTime` | Timestamp |
| `latitude` | `Real?` | `latitude` | `Float?` | GPS lat |
| `longitude` | `Real?` | `longitude` | `Float?` | GPS lng |

---

### 10. Server-Only Entities (Extended in Prisma schema to support full product requirements)

1. **`User`**: Enhanced with `failedLoginAttempts`, `lockedUntil`, `pinRecoveryToken`, `pinRecoveryExpiresAt`.
2. **`ConsentRecord`**: `version`, `timestamp`, `language`, `locationConsent`.
3. **`DeviceRestore`**: `deviceId`, `restoreCode`, `expiresAt`, `usedAt`.
4. **`BatchHandover` & `BatchHandoverItem`**: Group multiple lots under a single QR code.
5. **`Dispute`**: Formal dispute tracking for weight or price disagreements.
6. **`IncidentReport`**: Safety and hazard reporting.
7. **`SafetyQuizResult`**: Collector safety quiz completion logs.
8. **`PriceAlert`**: Push alerts when category prices exceed thresholds.
9. **`Notification`**: System and transaction alerts for mobile pull.
10. **`RecyclerRating`**: Collector ratings for recyclers.
11. **`ReceiptShareToken`**: Public non-sensitive web receipt tokens.
12. **`AreaCentroid`**: Precomputed geo centers for district/area search.
13. **`RecyclerServiceArea`**: Granular neighborhood delivery/pickup radius and rates.
14. **`CollectionPoint`**: Fixed or temporary drop-off points (camps, aggregation hubs).
15. **`PickupRequest`**: Scheduled doorstep pickups with 24-hour expiry lifecycle.
16. **`CoverageRequest`**: Demand signal when no recycler serves a collector's area.
17. **`PlatformFeeConfig`**: Unit economics and commission configuration.
18. **`DatasetCard` & `DataValidationResult`**: ML dataset governance and quality monitoring.
