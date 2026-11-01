import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateHaversineDistanceKm,
  calculateCompassDirection,
  matchRecyclers,
  CandidateRecycler,
} from "../../src/lib/domain/matching";

test("calculateHaversineDistanceKm calculates accurate geographic distance", () => {
  // Mumbai CST to Dadar ~ 8.5 km
  const dist = calculateHaversineDistanceKm(18.9401, 72.8347, 19.0178, 72.8478);
  assert.ok(dist >= 8 && dist <= 10, `Expected ~8.5 km, got ${dist}`);
});

test("calculateCompassDirection returns correct 8-point compass bearing", () => {
  // Moving North
  assert.equal(calculateCompassDirection(18.0, 72.0, 19.0, 72.0), "N");
  // Moving East
  assert.equal(calculateCompassDirection(18.0, 72.0, 18.0, 73.0), "E");
});

test("matchRecyclers excludes unverified or expired recyclers and ranks by score", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const candidates: CandidateRecycler[] = [
    {
      id: "rec-1",
      name: "Top Recycler Near",
      latitude: 19.076,
      longitude: 72.877, // ~2 km
      authorizationStatus: "VERIFIED",
      authorizationValidTill: new Date("2027-12-31"),
      contactPhone: "9876543210",
      pickupAvailable: true,
      serviceRadiusKm: 15,
      minimumWeightGrams: 2000,
      pickupChargePaise: 0,
      ratePerKgPaise: 4500,
      rateEffectiveFrom: new Date("2026-10-30"),
      averageRating: 4.8,
    },
    {
      id: "rec-2",
      name: "Expired Recycler",
      latitude: 19.078,
      longitude: 72.879,
      authorizationStatus: "VERIFIED",
      authorizationValidTill: new Date("2026-10-01"), // Expired
      contactPhone: "9876543211",
      pickupAvailable: false,
      serviceRadiusKm: 10,
      minimumWeightGrams: 0,
      pickupChargePaise: 0,
      ratePerKgPaise: 4800,
      rateEffectiveFrom: new Date("2026-10-30"),
      averageRating: 4.5,
    },
    {
      id: "rec-3",
      name: "Lower Rate Farther",
      latitude: 19.115,
      longitude: 72.895, // ~6 km
      authorizationStatus: "VERIFIED",
      authorizationValidTill: new Date("2027-12-31"),
      contactPhone: "9876543212",
      pickupAvailable: false,
      serviceRadiusKm: 10,
      minimumWeightGrams: 0,
      pickupChargePaise: 0,
      ratePerKgPaise: 4000,
      rateEffectiveFrom: new Date("2026-10-20"),
      averageRating: 4.0,
    },
  ];

  const result = matchRecyclers(candidates, {
    collectorLat: 19.075,
    collectorLng: 72.875,
    categoryId: 1,
    approxWeightGrams: 5000, // 5 kg
    now,
  });

  // rec-2 must be excluded because expired
  assert.equal(result.recyclers.some((r) => r.id === "rec-2"), false);
  // rec-1 must rank #1 due to higher rate, closer distance, and pickup availability
  assert.equal(result.recyclers[0].id, "rec-1");
  assert.equal(result.recyclers[0].rank, 1);
  assert.ok(result.recyclers[0].score > result.recyclers[1].score);
});

