# Mobile & Web API Contract Specification (Next.js 15 & Drift v3)

> **Offline sync (`/sync/push`, `/sync/pull`), `/reference/bootstrap`, mobile auth, the response envelope and the lot-status mapping are specified in [`sync-contract.md`](sync-contract.md), which is canonical.** Where §3 (sync) or §4.1 (auth) below differ, `sync-contract.md` wins. The rest of this file (matching formulas, estimate, geo, lots, bargaining, notifications, field agent) is unchanged.

This document is the authoritative specification for all REST endpoints, synchronization protocols, scoring formulas, and data exchange conventions between the Flutter collector app and the Next.js backend.

---

## 1. Global Conventions & Standards
- **Currency**: Integer **PAISE** ($₹1.00 = 100\text{ paise}$). Never use floats or decimals for money.
- **Weight**: Integer **GRAMS** ($1.00\text{ kg} = 1000\text{ grams}$).
- **IDs**: Client-generated standard RFC-4122 UUID v4 strings for all offline-created entities (`Lot`, `LotImage`, `Handover`, `Payment`, `PricePoint`, `SyncMutation`).
- **Timestamps**: ISO-8601 UTC string (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Standard API Envelope**:
  - Success: `{ "data": { ... } }`
  - Failure: `{ "error": { "code": "STRING_CODE", "message": "Human readable reason", "details": { ... } } }`
- **Authentication**:
  - Mobile endpoints require `Authorization: Bearer <JWT>` (valid for 30 days).
  - Web portal (`/recycler`, `/admin`) uses secure `httpOnly` cookie session.
  - Cron routes require `Authorization: Bearer <CRON_SECRET>`.

---

## 2. Mirrored Recycler Matching & Scoring Formula
The Flutter app should mirror this exact scoring formula when running matching offline:

### Hard Filters:
1. `authorizationStatus == 'VERIFIED'` and `authorizationValidTill > now()`.
2. Recycler accepts `categoryId` with an active current rate (`ratePerKgPaise > 0`).
3. If doorstep pickup requested: `pickupAvailable == true`, distance $\le$ `serviceRadiusKm`, and `approxWeightGrams >= minimumWeightGrams`.

### Expanding Radius:
Search expands through thresholds: $5\text{ km} \rightarrow 10\text{ km} \rightarrow 25\text{ km} \rightarrow 50\text{ km}$ until at least 3 candidates are found.

### Weighted Score (0 to 100 points):
$$\text{Score} = \text{RateScore}(40) + \text{DistanceScore}(30) + \text{PickupScore}(10) + \text{RatingScore}(10) + \text{FreshnessScore}(10)$$

- **Rate Score (40 pts)**:
  $$\text{RateScore} = \frac{\text{Rate} - \text{MinRate}}{\text{MaxRate} - \text{MinRate}} \times 40 \quad (\text{defaults to } 40 \text{ if all rates equal})$$
- **Distance Score (30 pts)**:
  $$\text{DistanceScore} = \max\left(0, 30 \times \left(1 - \frac{\text{DistanceKm}}{\text{SearchRadiusKm}}\right)\right)$$
- **Pickup Score (10 pts)**: $10\text{ pts}$ if `pickupAvailable == true`, else $0$.
- **Rating Score (10 pts)**:
  $$\text{RatingScore} = \frac{\text{AverageRating}}{5.0} \times 10$$
- **Rate Freshness (10 pts)**: $10\text{ pts}$ if updated within 7 days, linearly decaying to $0\text{ pts}$ at 30 days:
  $$\text{FreshnessScore} = \max\left(0, \frac{30 - \text{AgeDays}}{30 - 7} \times 10\right) \quad (\text{if AgeDays} > 7)$$
- **Net Payout Calculation**:
  $$\text{ExpectedTotalPaise} = \max\left(0, \left(\frac{\text{RatePerKgPaise} \times \text{WeightGrams}}{1000}\right) - \text{PickupChargePaise}\right)$$

---

## 3. Offline Sync Protocol (`POST /api/v1/sync/push`)

### Mutation Payload Shape:
```json
{
  "deviceId": "android-device-uuid",
  "mutations": [
    {
      "clientMutationId": "mutation-uuid-1",
      "entity": "lot",
      "entityId": "lot-uuid-1",
      "op": "create",
      "payload": {
        "lotRef": "LOT-KW01-261101-0001",
        "categoryId": 1,
        "approxWeightGrams": 5000,
        "estimatedValuePaise": 170000,
        "status": "DRAFT",
        "collectedAt": "2026-11-01T10:00:00.000Z"
      },
      "clientTimestamp": "2026-11-01T10:00:05.000Z"
    }
  ]
}
```

### Response Status per Mutation:
- `APPLIED`: Mutation applied successfully.
- `DUPLICATE`: Idempotent match on `clientMutationId`; returns previous status.
- `CONFLICT`: State transition violation or stale quoted rate (> 7 days). Includes `serverState`.
- `REJECTED`: Missing parent lot (`retryable: true`) or validation failure (`retryable: false`).

---

## 4. REST API Endpoint Reference

### 4.1 Mobile Authentication

#### `POST /api/v1/auth/register`
Creates a collector profile with minimal PII (phone, PIN, language, area, consent).
```json
// Request
{
  "phone": "9820000001",
  "pin": "1234",
  "preferredLanguage": "HI",
  "operatingArea": "Dharavi Matunga Labour Camp",
  "district": "Mumbai",
  "consent": {
    "version": "1.0",
    "locationConsent": true
  }
}

// Response 201 Created
{
  "data": {
    "token": "eyJhbGciOi...",
    "profile": {
      "collectorId": "collector-uuid",
      "userId": "user-uuid",
      "shortCode": "KW01",
      "preferredLanguage": "HI",
      "operatingArea": "Dharavi Matunga Labour Camp",
      "phone": "9820000001"
    }
  }
}
```

#### `POST /api/v1/auth/login`
Authenticates phone + 4-digit PIN. Locks for 15 minutes after 5 failed attempts.
```json
// Request
{
  "phone": "9820000001",
  "pin": "1234"
}

// Response 200 OK
{
  "data": {
    "token": "eyJhbGciOi...",
    "profile": {
      "collectorId": "collector-uuid",
      "shortCode": "KW01",
      "preferredLanguage": "HI",
      "operatingArea": "Dharavi Matunga Labour Camp",
      "phone": "9820000001"
    }
  }
}
```

#### `POST /api/v1/auth/pin-recovery`
OTP-free recovery scheme verifying collector's shortCode and registered operating area.
```json
// Request
{
  "phone": "9820000001",
  "shortCode": "KW01",
  "operatingArea": "Dharavi",
  "newPin": "5678"
}
```

#### `POST /api/v1/auth/restore-on-new-phone`
Restores session on a new phone and recalculates `lotCounter` for offline lot numbering.
```json
// Request
{
  "phone": "9820000001",
  "pin": "1234",
  "deviceId": "new-device-id"
}
// Response returns profile + lotCounter
```

---

### 4.2 Reference & Valuation

#### `GET /api/v1/reference/bootstrap?since=<ISO>`
Returns full snapshot of verified recyclers, active rates, categories, and safety topics.

#### `GET /api/v1/prices/board`
Provides daily rate per kg and 3% trend arrows (`UP`, `DOWN`, `FLAT`) for Screen C6.
```json
{
  "data": {
    "board": [
      {
        "categoryId": 1,
        "code": "PCB",
        "nameEn": "Printed Circuit Board (PCB)",
        "nameHi": "सर्किट बोर्ड (PCB)",
        "currentMedianPaise": 34000,
        "currentMedianRupees": "340.00",
        "trend": "UP",
        "marketLowPaise": 31000,
        "marketHighPaise": 36000,
        "recyclerMinRatePaise": 33000,
        "recyclerMaxRatePaise": 35000
      }
    ]
  }
}
```

#### `POST /api/v1/estimate`
Calculates instant estimated value and $\pm 10\%$ IQR band.
```json
// Request
{
  "categoryId": 1,
  "approxWeightGrams": 5000
}

// Response 200 OK
{
  "data": {
    "categoryId": 1,
    "approxWeightGrams": 5000,
    "medianRatePaisePerKg": 34000,
    "estimatedValuePaise": 170000,
    "estimatedMinPaise": 153000,
    "estimatedMaxPaise": 187000,
    "source": "PRICE_HISTORY",
    "formatted": {
      "ratePerKg": "₹340.00/kg",
      "estimate": "₹1700",
      "range": "₹1530 – ₹1870"
    }
  }
}
```

---

### 4.3 Geolocation & Matching

#### `GET /api/v1/recyclers/match?categoryId=1&approxWeightGrams=5000&latitude=19.043&longitude=72.856&pickupRequired=false`
Returns ranked authorized recyclers using expanding radius and multi-factor scoring.

#### `POST /api/v1/coverage-requests`
Records unserviced demand signals when no recycler covers an area.

#### `POST /api/v1/pickup-requests`
Schedules a 24-hour expiring doorstep pickup.

---

### 4.4 Media Uploads

#### `POST /api/v1/uploads/presign`
```json
// Request
{
  "filename": "pcb_lot_1.jpg",
  "contentType": "image/jpeg"
}

// Response 200 OK
{
  "data": {
    "uploadUrl": "/api/v1/uploads/local?key=images%2Fuser-123%2F1698822000_pcb_lot_1.jpg",
    "storageKey": "images/user-123/1698822000_pcb_lot_1.jpg",
    "expiresInSeconds": 3600
  }
}
```

---

## 5. Dart Push/Pull Integration Code Snippet
Drop this helper into your Flutter project's `sync_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class SyncApiClient {
  final String baseUrl;
  final String authToken;

  SyncApiClient({required this.baseUrl, required this.authToken});

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $authToken',
  };

  /// Push local mutations from Drift SyncOutbox
  Future<Map<String, dynamic>> pushMutations({
    required String deviceId,
    required List<Map<String, dynamic>> outboxRows,
  }) async {
    final payload = {
      'deviceId': deviceId,
      'mutations': outboxRows.map((row) => {
        'clientMutationId': row['clientMutationId'],
        'entity': row['entity'],
        'entityId': row['entityId'],
        'op': row['op'],
        'payload': jsonDecode(row['payloadJson']),
        'clientTimestamp': row['createdAt'],
      }).toList(),
    };

    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/sync/push'),
      headers: _headers,
      body: jsonEncode(payload),
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body)['data'];
    }
    throw Exception('Sync push failed: ${res.statusCode} ${res.body}');
  }

  /// Pull server changes incrementally
  Future<Map<String, dynamic>> pullChanges({String? since}) async {
    final uri = Uri.parse('$baseUrl/api/v1/sync/pull${since != null ? '?since=$since' : ''}');
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode == 200) {
      return jsonDecode(res.body)['data'];
    }
    throw Exception('Sync pull failed: ${res.statusCode} ${res.body}');
  }
}
```

---

## 6. Flutter Developer Integration Checklist
- [x] **Store integer PAISE and GRAMS**: Never divide by 100 or 1000 before sending to the server.
- [x] **Client UUIDs**: Ensure `Lot.id`, `LotImage.id`, `Handover.id`, `Payment.id` are valid UUID v4 strings generated on device.
- [x] **Lot Reference Format**: Generate references as `LOT-{shortCode}-{yyMMdd}-{seq}` where `shortCode` matches `LocalProfile.shortCode`.
- [x] **Storage Key Prefix**: Ensure `storageKey` in `lot_image` mutations starts with `images/{userId}/` as returned by `/uploads/presign`.
- [x] **4-digit Verification Code**: On handover capture (C8), generate and store the 4-digit code in `Handovers.verificationCode`.

---

## 7. Decisions & Assumptions Log
1. **Database**: Transitioned to MongoDB 7+ replica set (`rs0`) for interactive transactional guarantees.
2. **Category IDs**: Preserved explicit `Int` IDs (`1` to `7`) so Drift category integers match exactly without mapping tables.
3. **OTP-Free PIN Recovery**: Implemented shortCode + operatingArea verification to eliminate costly SMS OTP dependencies for low-income collectors.
4. **Coordinate Precision**: All coordinates stored with full precision on transactions, but truncated to 3 decimals (~100m) for analytics and coverage gap queries.



---

## 8. Collector, Field Agent, Notification & Bargaining REST APIs

### 8.1 Collector & Lot Management Endpoints

#### `POST /api/v1/lots`
Creates a new e-waste lot for collection.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "id": "c7a84091-6453-48b4-934d-17688dbba142", // Optional client UUID
  "categoryId": 1,                               // Material category (e.g. 1 = Copper)
  "approxWeightGrams": 5000,                     // Integer grams (5.00 kg)
  "conditionNotes": "Clean sorted wire strips",  // Optional notes
  "deviceLat": 19.0434,                          // Optional device latitude
  "deviceLng": 72.8567,                          // Optional device longitude
  "photos": ["images/usr_1/lot1.jpg"]            // Optional storage keys
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "message": "Lot created successfully",
    "lot": {
      "id": "c7a84091-6453-48b4-934d-17688dbba142",
      "lotRef": "LOT-261101-4921",
      "categoryId": 1,
      "categoryName": "Pure Copper / Wire",
      "approxWeightGrams": 5000,
      "weightKg": "5.00",
      "quotedRatePaise": 4000,
      "quotedRateRupees": 40,
      "status": "DRAFT",
      "collectedAt": "2026-11-01T15:00:00.000Z"
    }
  }
}
```

#### `POST /api/v1/lots/{id}/match-recycler`
Assigns the selected authorized recycler facility to the lot and initializes the transaction.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "recyclerId": "rec-mumbai-01",
  "quotedRatePaise": 4500 // Optional custom agreed benchmark rate (₹45.00/kg)
}
```
- **Response `200 OK`**:
```json
{
  "data": {
    "message": "Recycler matched and transaction initialized",
    "lotId": "c7a84091-6453-48b4-934d-17688dbba142",
    "transactionId": "TX-c7a84091-8841",
    "recycler": {
      "id": "rec-mumbai-01",
      "name": "EcoRecycle Mumbai Hub",
      "contactPhone": "9876543210",
      "address": "Plot 12, Dharavi Link Road, Mumbai"
    },
    "quotedRatePaise": 4500,
    "quotedRateRupees": 45,
    "quotedPricePaise": 22500,
    "quotedPriceRupees": 225
  }
}
```

#### `GET /api/v1/lots/{id}/handover`
Retrieves handover verification code, QR payload string, and facility verification details for screen C13-C15.
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
```json
{
  "data": {
    "lotId": "c7a84091-6453-48b4-934d-17688dbba142",
    "lotRef": "LOT-261101-4921",
    "category": "Pure Copper / Wire",
    "declaredWeightGrams": 5000,
    "declaredWeightKg": "5.00",
    "verificationCode": "4921",
    "qrPayload": "EWASTE:c7a84091-6453-48b4-934d-17688dbba142:4921:5000",
    "status": "MATCHED",
    "transaction": {
      "id": "TX-c7a84091-8841",
      "status": "QUOTED",
      "quotedRatePaise": 4500,
      "quotedRateRupees": 45,
      "bargainStatus": "AGREED"
    }
  }
}
```

#### `POST /api/v1/lots/{id}/handover`
Executes digital scale weighing, runs weight tolerance ($5\%/25\%/40\%$) and location proof (`MATCH`/`NEAR`/`FAR`), updates the transaction to `PAID`, marks lot `COMPLETED`, logs the payment, and triggers immediate notification.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "verificationCode": "4921",
  "scaleWeightGrams": 5100,
  "paymentMode": "CASH", // "CASH" | "UPI"
  "latitude": 19.0435,
  "longitude": 72.8568,
  "gpsAccuracyMeters": 15,
  "mockLocationFlag": false
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "message": "Handover completed and payment recorded successfully",
    "lotId": "c7a84091-6453-48b4-934d-17688dbba142",
    "lotRef": "LOT-261101-4921",
    "confirmedWeightGrams": 5100,
    "confirmedWeightKg": "5.10",
    "tolerance": {
      "declaredWeightGrams": 5000,
      "confirmedWeightGrams": 5100,
      "differenceGrams": 100,
      "percentageDiff": 2.0,
      "autoAccepted": true,
      "requiresReview": false,
      "anomalySeverity": 0
    },
    "locationProof": {
      "locationClass": "MATCH",
      "distanceToRecyclerMeters": 42,
      "spoofFlags": [],
      "isFlagged": false
    },
    "payment": {
      "id": "PAY-c7a84091-9123",
      "amountPaise": 22950,
      "amountRupees": 229.5,
      "method": "CASH",
      "status": "PAID"
    },
    "handoverId": "HO-c7a84091-9123"
  }
}
```

---

### 8.2 Bargaining & Price Negotiation Endpoints

#### `GET /api/v1/lots/{id}/bargain`
Inspects current negotiation state, active offer, who made the offer, and whether the caller can accept or counter.
- **Headers**: `Authorization: Bearer <JWT>` (or cookie session)
- **Response `200 OK`**:
```json
{
  "data": {
    "lotId": "c7a84091-6453-48b4-934d-17688dbba142",
    "lotRef": "LOT-261101-4921",
    "category": "Pure Copper / Wire",
    "approxWeightGrams": 5000,
    "weightKg": "5.00",
    "transactionId": "TX-c7a84091-8841",
    "transactionStatus": "QUOTED",
    "quotedRatePerKgPaise": 4000,
    "quotedRatePerKgRupees": 40,
    "quotedPricePaise": 20000,
    "quotedPriceRupees": 200,
    "bargainStatus": "OFFER_BY_COLLECTOR",
    "bargainRatePaise": 4500,
    "bargainRateRupees": 45,
    "bargainBy": "COLLECTOR",
    "bargainNote": "Strip wire grade 1 high purity",
    "agreedRatePaise": null,
    "agreedRateRupees": null,
    "callerRole": "RECYCLER",
    "canAccept": true,
    "canCounter": true
  }
}
```

#### `POST /api/v1/lots/{id}/bargain/offer`
Submits a price offer or counter-offer (callable by either Collector or Recycler). Sends an instant notification to the opposing party.
- **Headers**: `Authorization: Bearer <JWT>` (or cookie session)
- **Request Body**:
```json
{
  "offerRateRupees": 48.0, // Or "offerRatePaise": 4800
  "note": "Can meet at ₹48/kg if delivered before 4 PM"
}
```
- **Response `200 OK`**:
```json
{
  "data": {
    "message": "Price offer of ₹48.00/kg submitted successfully",
    "bargain": {
      "lotId": "c7a84091-6453-48b4-934d-17688dbba142",
      "transactionId": "TX-c7a84091-8841",
      "bargainRatePaise": 4800,
      "bargainRateRupees": 48,
      "bargainBy": "RECYCLER",
      "bargainStatus": "OFFER_BY_RECYCLER",
      "bargainNote": "Can meet at ₹48/kg if delivered before 4 PM"
    }
  }
}
```

#### `POST /api/v1/lots/{id}/bargain/accept`
Accepts the active counter-offer from the opposing party. Locks `agreedRatePaise`, recalculates `agreedPricePaise`, updates `quotedRatePaise`, and notifies both participants.
- **Headers**: `Authorization: Bearer <JWT>` (or cookie session)
- **Response `200 OK`**:
```json
{
  "data": {
    "message": "Price successfully agreed and locked at ₹48.00/kg",
    "agreedDeal": {
      "lotId": "c7a84091-6453-48b4-934d-17688dbba142",
      "transactionId": "TX-c7a84091-8841",
      "agreedRatePaise": 4800,
      "agreedRateRupees": 48,
      "agreedPricePaise": 24000,
      "agreedPriceRupees": 240,
      "bargainStatus": "AGREED"
    }
  }
}
```

---

### 8.3 Unified Notifications REST APIs

#### `GET /api/v1/notifications`
Fetches user notifications with total unread count. Works for all roles (Collector, Field Agent, Recycler, Admin).
- **Headers**: `Authorization: Bearer <JWT>` (or cookie session)
- **Response `200 OK`**:
```json
{
  "data": {
    "unreadCount": 2,
    "notifications": [
      {
        "id": "notif-001",
        "title": "🎉 Price Agreed by Recycler!",
        "body": "Recycler accepted your price of ₹48/kg for Lot LOT-261101-4921!",
        "isRead": false,
        "dataJson": "{\"lotId\":\"c7a84091\",\"agreedRatePaise\":4800}",
        "createdAt": "2026-11-01T15:10:00.000Z"
      }
    ]
  }
}
```

#### `POST /api/v1/notifications/{id}/read`
Marks a specific notification as read.
- **Headers**: `Authorization: Bearer <JWT>` (or cookie session)
- **Response `200 OK`**:
```json
{
  "data": {
    "message": "Notification marked as read"
  }
}
```

#### `POST /api/v1/notifications/read-all`
Marks all unread notifications for the caller as read.
- **Headers**: `Authorization: Bearer <JWT>` (or cookie session)
- **Response `200 OK`**:
```json
{
  "data": {
    "message": "Marked 3 notifications as read",
    "count": 3
  }
}
```

---

### 8.4 Field Agent Endpoints (F1 - F3)

#### `POST /api/v1/field/collectors` (F1)
Onboards a new informal collector with digital consent.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "phone": "9819999001",
  "pin": "1234",
  "preferredLanguage": "MR",
  "operatingArea": "Kurla West Scrap Yard",
  "district": "Mumbai",
  "hasConsent": true
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "message": "Collector onboarded successfully by field agent",
    "collector": {
      "id": "col-uuid",
      "userId": "usr-uuid",
      "shortCode": "KW42",
      "phone": "9819999001",
      "preferredLanguage": "MR",
      "operatingArea": "Kurla West Scrap Yard"
    }
  }
}
```

#### `GET /api/v1/field/collectors`
Lists collectors onboarded by this field agent.
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
```json
{
  "data": {
    "count": 12,
    "collectors": [ ... ]
  }
}
```

#### `POST /api/v1/field/prices` (F2)
Logs physical ground spot prices from local scrap shops.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "categoryId": 1,
  "subCategory": "Armature wire",
  "buyingPricePaise": 4400, // ₹44.00/kg
  "buyerType": "SCRAP_DEALER",
  "area": "Dharavi 60 Feet Road",
  "district": "Mumbai",
  "latitude": 19.041,
  "longitude": 72.859
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "message": "Market price logged successfully",
    "pricePoint": { ... }
  }
}
```

#### `GET /api/v1/field/prices`
Lists market prices logged by the field agent.
- **Headers**: `Authorization: Bearer <JWT>`

#### `POST /api/v1/field/training-photos` (F3)
Logs photo metadata and category label for ML classification training.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "categoryId": 2,
  "storageKey": "training/agent_1/motherboard_close_up.jpg",
  "labelConfidence": 1.0
}
```

#### `GET /api/v1/field/stats`
Returns personal productivity metrics for the field agent.
- **Headers**: `Authorization: Bearer <JWT>`
- **Response `200 OK`**:
```json
{
  "data": {
    "agent": {
      "userId": "fa-user-1",
      "phone": "9830000001",
      "role": "FIELD_AGENT"
    },
    "stats": {
      "totalCollectorsOnboarded": 15,
      "collectorsOnboardedToday": 3,
      "totalPricesLogged": 42,
      "pricesLoggedToday": 8,
      "totalTrainingPhotos": 30,
      "trainingPhotosToday": 10
    }
  }
}
```
