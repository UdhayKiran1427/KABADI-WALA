# E-Waste Collector Platform — Complete System Architecture & Project Specification

## 1. Executive Summary & Vision
The **E-Waste Collector Platform** is a unified digital bridge connecting informal electronic waste collectors (waste-pickers, local scrap dealers/kabadiwalas, small aggregators) with government-authorized formal e-waste recyclers across India.

- **Collector App (Flutter / Android)**: Low-literacy, voice-enabled (Hindi & Marathi), cash-first, offline-first SQLite database via Drift (v3 contract).
- **Backend & Web Portal (Next.js 15 App Router, TypeScript strict, Prisma 6 + MongoDB)**:
  - **Mobile REST API & Offline Sync Engine**: Multi-entity push/pull synchronization, idempotency, parent-child ordering, optimistic locking, and conflict resolution.
  - **Recycler Web Portal (R1–R4)**: Dashboard, incoming lot management, doorstep pickup dispatch, QR/4-digit code handover verification, live scale weighing, dispute management, rate manager, facility profile, and payment recording.
  - **Platform Admin Dashboard (M1–M5)**: Recycler authorization compliance queue, market price dataset & SVG trend analytics, rule-based anomaly detection (M3), dataset governance & model metrics (M4), and circular impact reporting (M5).
  - **Field Agent Endpoints (F1–F3)**: Rapid minimal collector onboarding, spot market price logging, and labelled photo capture for AI training.

---

## 2. Core Architectural Principles & Conventions

### 2.1 Database & Units
- **Database**: MongoDB 7+ running with replica set `rs0` (`mongodb://localhost:27017/ewaste?replicaSet=rs0&directConnection=true` or Atlas `mongodb+srv://`). Interactive `$transaction` and offline sync depend on replica set transactions.
- **Strict Integer Units**:
  - **Money**: Integer **PAISE** everywhere on client and server ($₹1.00 = 100 \text{ paise}$). Prevents all floating-point and decimal truncation errors.
  - **Weight**: Integer **GRAMS** everywhere on client and server ($1 \text{ kg} = 1000 \text{ grams}$).
  - Display and user input in Web UI convert paise $\rightarrow$ rupees and grams $\rightarrow$ kg solely at the presentation layer.
- **Primary Keys**:
  - Client-generated UUIDs (`id String @id @map("_id")` without `@default(uuid())`) for all offline-created entities (`Lot`, `LotImage`, `Transaction`, `Handover`, `Payment`, `PricePoint`, `SyncMutation`).
  - Server-created rows use `@default(uuid())`.
  - `MaterialCategory` preserves explicit `Int` IDs matching the Drift database schema.

### 2.2 Security & Authentication
- **Collector Mobile Auth**: Phone number + 4-digit numeric PIN $\rightarrow$ Bearer JWT valid for 30 days (`jose` HS256).
- **Web Portal Auth (Recycler, Admin)**: Phone/Email + password $\rightarrow$ `httpOnly`, `SameSite=Lax` secure session cookie.
- **Defense in Depth**: Every web page and server action re-verifies the user's role directly against MongoDB. Never relies solely on client cookies or edge middleware.
- **Brute-Force Protection**: In-memory rate limiting and account lockout after 5 consecutive failed sign-in attempts (15-minute lock).

### 2.3 Privacy by Design (Section 9)
- **Zero Collector PII**: No collector names, street addresses, Aadhaar, or government identity documents are ever collected or stored.
- **Location Obfuscation**: Analytics and public data round coordinates to 3 decimal places (~100 meters). Exact coordinates are kept strictly on transaction records for legal compliance and anti-spoofing verification.
- **Consent Flags**: Explicit storage of consent version, timestamp, language, and `locationConsent`.
- **Public Receipts**: Shared via cryptographic token exposing only lot reference, verified recycler details, timestamp, weight, and final amount. Collector phone number is never exposed.

---

## 3. Drift (v3) vs Prisma MongoDB Model Mapping

| Entity / Table | Drift (v3 Mobile Contract) | Prisma MongoDB Model | Primary Key | Key Fields & Server Extensions |
| :--- | :--- | :--- | :--- | :--- |
| **Local Profile** | `LocalProfile` | `User` + `Collector` | UUID | Minimal profile, shortCode, operating area, language |
| **Categories** | `Categories` | `MaterialCategory` | `Int` (explicit) | `code`, `parentId`, `nameEn`, `nameHi`, `nameMr`, `iconKey`, `isHazardous` |
| **Price Points** | `PriceCache`, `PendingPrices` | `PricePoint` | UUID | `categoryId`, `buyingPricePaise`, `marketLowPaise`, `marketHighPaise`, `buyerType`, `area` |
| **Recyclers** | `RecyclerCache` | `Recycler` | UUID | `authorizationNo`, `authorizationStatus`, `validTill`, `pickupAvailable`, `serviceRadiusKm`, `pickupChargePaise` |
| **Recycler Rates** | `RecyclerRateCache` | `RecyclerRate` | UUID | `recyclerId`, `categoryId`, `ratePerKgPaise`, `isCurrent`, `effectiveFrom` |
| **Lots** | `Lots` | `Lot` | UUID (client) | `lotRef`, `approxWeightGrams`, `estimatedValuePaise`, `status`, `chosenRecyclerId`, `quotedRatePaise`, `finalPricePaise` |
| **Images** | `LotImages` | `LotImage` | UUID (client) | `lotId`, `kind` (`COLLECTION`/`HANDOVER`/`TRAINING`), `storageKey`, `sha256` |
| **Handovers** | `Handovers` | `Handover` | UUID (client) | `handoverRef`, `verificationCode` (4-digit), `declaredWeightGrams`, `confirmedWeightGrams`, `locationClass`, `mockLocationFlag` |
| **Payments** | `Payments` | `Payment` | UUID (client) | `amountPaise`, `method` (`CASH`/`UPI`), `upiRef`, `confirmedByCollector`, `recordedBy`, `canonicalId` |
| **Sync Log** | `SyncOutbox` | `SyncMutation` | UUID (`clientMutationId`) | `deviceId`, `entity`, `entityId`, `op`, `payload`, `status`, `resultCode` |

---

## 4. System Screens & Module Breakdown

### 4.1 Collector App Screens (C1–C12, Android)
- **C1 Language Select**: Hindi / Marathi selection with audio prompt.
- **C2 Sign In**: Phone number + 4-digit PIN (no personal documentation).
- **C3 Home**: 4 primary quick-action icons: Create Lot, Today's Prices, My Earnings, Safety Guide; offline sync pill.
- **C4 Create Lot**: Camera photo capture, material category chips, stepper weight (kg), instant estimate.
- **C5 AI Result & Estimate**: Category confirmation, AI confidence badge, price range (₹min – ₹max), save lot.
- **C6 Price Board**: Daily buying rates per kg with trend indicators (UP/DOWN/FLAT at 3% threshold).
- **C7 Recycler Match**: Ranked list of verified recyclers with distance (km), net rate, pickup badge, and selection action.
- **C8 Handover Record**: Offline QR code + 4-digit code, photo proof, declared weight, GPS timestamp.
- **C9 Payment**: Cash or optional UPI confirmation with instant receipt.
- **C10 Earnings Ledger**: Received cash/UPI earnings and pending dues breakdown.
- **C11 Safety Guide**: Pictorial & spoken hazard advisories (burning cables, acid leaching, battery opening, CRT glass).
- **C12 My Lots & Sync**: Status of all lots (Draft, Matched, Handed Over, Completed) and pending outbox mutation count.

### 4.2 Recycler Web Interface (R1–R4, `/recycler`)
- **R1 Dashboard & Incoming Lots**: Weekly intake (kg), pending payout, lot queue with 1-click accept/review.
- **R2 Verify Handover**: Multi-modal lookup (Lot ID, Handover Ref, QR scanner via BarcodeDetector, 4-digit code), photo proof, location badge, scale weight entry, auto-accept $\le 5\%$ tolerance, dispute option, payment recording.
- **R3 Rate Manager**: Editable buying rates per material category, doorstep pickup toggle, minimum lot weight, pickup charge.
- **R4 Facility Profile & Authorization**: CPCB/SPCB authorization number, valid-till date, service radius, accepted materials, document upload.

### 4.3 Platform Admin Dashboard (M1–M5, `/admin`)
- **M1 Recycler Verification Queue**: Review uploaded authorization certificates, approve/suspend recyclers, derived expiry tracking.
- **M2 Price Dataset & Analytics**: 8-week weekly SVG trend line, market spread vs recycler offers, CSV export, scrap dealer price entry.
- **M3 Anomaly Alerts**: Anomaly feed with severity filters (Price $\ge 2\times/3\times$ estimate, Weight mismatch $\ge 25\%/40\%$, GPS far from facility, duplicate lot photos).
- **M4 Dataset & AI Health**: Total image/lot counts, missing-field metrics, classifier agreement, last sync health, dataset card.
- **M5 Circular Impact & Unit Economics**: Total kg routed to formal channel, active collectors, total cash paid out, coverage gap demand heatmap (~100m cells), platform commission calculator.

### 4.4 Field Agent Endpoints (F1–F3)
- **F1 Onboard Collector**: Minimal profile creation on behalf of informal collectors with language and consent flags.
- **F2 Log Market Price**: Spot price collection at local scrap dealers with GPS auto-tagging.
- **F3 Photo Capture for Training**: Labelled photos of materials categorized for AI dataset generation.

---

## 5. Pure Domain Business Rules (`src/lib/domain`)
All business logic is isolated as pure functions without database dependencies, 100% covered by unit tests:

1. **Price Valuation (`estimates.ts`)**:
   - 30-day median calculation of historical buying prices.
   - Interquartile Range (IQR) widened to at least $\pm 10\%$.
   - Fallback to current recycler offers when historical prices are absent.
2. **Price Trend (`priceBoard.ts`)**:
   - Compares 7-day current median with prior 7-day median.
   - $\ge +3\% \rightarrow$ `UP`, $\le -3\% \rightarrow$ `DOWN`, otherwise `FLAT`.
3. **Nearest Finder & Matching (`matching.ts`)**:
   - Hard filters: `VERIFIED`, valid authorization date, accepted category, minimum weight.
   - Expanding search radius: $5\text{ km} \rightarrow 10\text{ km} \rightarrow 25\text{ km} \rightarrow 50\text{ km}$ until $\ge 3$ recyclers found.
   - Weighted score: Rate 40% + Distance 30% + Pickup 10% + Rating 10% + Freshness 10%.
   - Computes 8-point compass bearing (`N`, `NE`, `E`, etc.) and net expected payout.
4. **Lot State Machine (`lotStateMachine.ts`)**:
   - Transitions: `DRAFT` $\rightarrow$ `READY` $\rightarrow$ `MATCHED` $\rightarrow$ `HANDED_OVER` $\rightarrow$ `COMPLETED`.
   - Never moves backward; `COMPLETED` is strictly server-owned.
   - Client is forbidden from setting `finalPricePaise`, `confirmedWeightGrams`, or `paymentStatus`.
5. **Handover & Verification (`handover.ts`)**:
   - Weight tolerance: $\le 5\%$ auto-accepts at scale weight; $> 5\%$ requires recycler review; $\ge 25\%$ or $\ge 40\%$ raises anomaly alerts.
   - Location Proof: $\le 300\text{ m} \rightarrow$ `MATCH`, $\le 1000\text{ m} \rightarrow$ `NEAR`, $> 1000\text{ m} \rightarrow$ `FAR`.
   - Anti-spoofing flags: mock GPS, accuracy $> 500\text{ m}$, physical velocity $> 50\text{ km}$ in 10 minutes.
   - 4-digit numeric verification code generation and validation.
6. **Payment Merging**:
   - A collector payment automatically merges with an existing matching recycler-recorded payment (same amount and method) so financial ledgers never double count.

---

## 6. Implementation Roadmap & Status

```
[Phase A] Schema & Foundations ───────────────────────► [COMPLETED]
  • package.json, tsconfig, next.config.ts
  • MongoDB replica set docker-compose.yml & .env.example
  • prisma/schema.prisma (MongoDB, integer paise/grams)
  • Contract diff (docs/contract-diff.md) & Schema log (docs/schema-changes.md)
  • Geolocation API contract (docs/geo_api_contract.md)
  • 29 Pure domain unit tests (node:test) — 100% PASS

[Phase B] Core APIs & Sync Engine ────────────────────► [IN PROGRESS]
  • POST /api/v1/sync/push (Idempotent, transactional, parent-sorted)
  • GET /api/v1/sync/pull (Incremental cursor-based sync)
  • GET /api/v1/reference/bootstrap (Full snapshot cache)
  • Mobile Auth endpoints (register, login, change-pin, restore, me)
  • Geolocation endpoints (recyclers/match, recyclers/nearby, coverage, pickup)
  • Photo presigned uploads & local storage dev driver

[Phase C] Recycler Web Portal (R1–R4) ────────────────► [PENDING]
  • R1 Dashboard, lot queue & pickup acceptance
  • R2 Handover verification (camera QR / 4-digit code / live weighing)
  • R3 Rate Manager & pickup parameters
  • R4 Profile & authorization management

[Phase D] Platform Admin Portal (M1–M5) ──────────────► [PENDING]
  • M1 Recycler verification & license review
  • M2 Price dataset, SVG trends, CSV export
  • M3 Anomaly alert feed & reviews
  • M4 Dataset & AI model health card
  • M5 Circular impact & unit economics calculator

[Phase E] Field Agent & Cron Automation ──────────────► [PENDING]
  • F1-F3 endpoints
  • /api/cron/expire-authorizations & /api/cron/expire-requests
  • Public receipt viewer (/receipts/[token])
  • prisma/seed.ts (Categories in Hindi/Marathi, 4 safety topics, demo dataset)
  • Final docs/API.md & README.md
```

