# Mobile & Web API Contract Specification (Next.js 15 & Drift v3)

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

