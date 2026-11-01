# Geolocation API Contract (Mobile & Server)

## Overview
This document specifies the geolocation endpoints, query parameters, payloads, and location proof algorithms expected by the mobile application.

---

### 1. Match Recyclers: `GET /api/v1/recyclers/match`
Finds the top ranked authorized recyclers for a given material and weight, sorted by score.

**Query Parameters:**
- `categoryId`: (Required, Int) Material category ID.
- `approxWeightGrams`: (Required, Int) Estimated weight in grams.
- `latitude`: (Required, Float) Collector's current latitude.
- `longitude`: (Required, Float) Collector's current longitude.
- `pickupRequired`: (Optional, Boolean) `true` if collector requests doorstep pickup. Default `false`.

**Scoring Formula:**
- Expanding search radius: 5 km -> 10 km -> 25 km -> 50 km until at least 3 authorized recyclers are found.
- Hard filters:
  - Recycler `authorizationStatus == VERIFIED` and `authorizationValidTill > now()`.
  - Recycler accepts `categoryId` with an active rate (`isCurrent == true`).
  - If `pickupRequired == true`: recycler `pickupAvailable == true`, distance <= `serviceRadiusKm`, and `approxWeightGrams >= minimumWeightGrams`.
- Normalized Score (0 - 100):
  - **Rate (40%)**: Min-max scaled across candidates in radius.
  - **Distance (30%)**: Scaled inversely from 0 km to search radius.
  - **Pickup availability (10%)**: 10 points if pickup available, 0 otherwise.
  - **Rating (10%)**: Average rating / 5.0 * 10.
  - **Rate Freshness (10%)**: 10 points if updated within 7 days, linearly decaying to 0 at 30 days.

**Response `200 OK`:**
```json
{
  "data": {
    "recyclers": [
      {
        "id": "uuid",
        "name": "EcoRecycle Mumbai Hub",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "distanceKm": 3.4,
        "compassDirection": "NE",
        "ratePerKgPaise": 4500,
        "pickupAvailable": true,
        "pickupChargePaise": 5000,
        "expectedTotalPaise": 40000,
        "rating": 4.8,
        "whyThisIsBest": "Highest rate within 5 km and offers free doorstep pickup",
        "rank": 1
      }
    ],
    "searchRadiusKm": 5,
    "totalFound": 3
  }
}
```

---

### 2. Nearby Recyclers: `GET /api/v1/recyclers/nearby`
Returns all active collection facilities within radius.

**Query Parameters:**
- `latitude`: (Required, Float)
- `longitude`: (Required, Float)
- `radiusKm`: (Optional, Float, default 15, max 100)

**Response `200 OK`:**
```json
{
  "data": {
    "recyclers": [
      {
        "id": "uuid",
        "name": "Dharavi E-Waste Center",
        "latitude": 19.0434,
        "longitude": 72.8567,
        "distanceKm": 1.2,
        "authorizationStatus": "VERIFIED",
        "contactPhone": "9876543210",
        "pickupAvailable": false
      }
    ]
  }
}
```

---

### 3. Collection Points: `GET /api/v1/collection-points`
Returns drop-off points, aggregator depots, and collection camps.

**Query Parameters:**
- `latitude`: (Optional, Float)
- `longitude`: (Optional, Float)
- `radiusKm`: (Optional, Float, default 25)

**Response `200 OK`:**
```json
{
  "data": {
    "points": [
      {
        "id": "uuid",
        "name": "Sion Community E-Waste Drop Box",
        "type": "CAMP",
        "latitude": 19.039,
        "longitude": 72.862,
        "distanceKm": 0.8,
        "address": "Near Sion Station West",
        "operatingHours": "09:00 - 18:00",
        "operatingDates": "2026-11-01 to 2026-11-05",
        "contactPhone": "9876543211"
      }
    ]
  }
}
```

---

### 4. Coverage Requests: `POST /api/v1/coverage-requests`
Logged when a collector is outside all service areas to record demand gaps.

**Payload:**
```json
{
  "latitude": 18.922,
  "longitude": 72.834,
  "categoryId": 1,
  "approxWeightGrams": 15000
}
```

---

### 5. Pickup Requests: `POST /api/v1/pickup-requests`
Requests a doorstep collection. Expires in 24 hours if unaccepted.

**Payload:**
```json
{
  "lotId": "uuid",
  "recyclerId": "uuid",
  "slot": "2026-11-02T10:00:00Z"
}
```

---

### 6. Handover Location Proof Classification
When a handover is recorded at `(lat, lng)` against a recycler facility:
- Distance <= 300 meters: `MATCH`
- Distance <= 1000 meters: `NEAR`
- Distance > 1000 meters: `FAR` (flagged for review, sale proceeds)
- No GPS coordinates: `UNKNOWN`

**Anti-Spoofing Flags:**
- `mockLocationFlag`: Device reported mocked GPS.
- GPS Accuracy > 500 meters.
- Implausible velocity: >=2 handovers >50 km apart within 10 minutes.

