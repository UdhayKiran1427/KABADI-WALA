import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { amountPaise, isWithinTolerance, isRateLockActive, rateLockExpiresAt, lotExpiresAt, netAmountPaise, firstPositiveRate } from "../../src/lib/domain/money";
import { evaluateWeightTolerance } from "../../src/lib/domain/handover";
import { generateLotRef } from "../../src/lib/domain/lotRef";
import { CLIENT_LOT_TRANSITIONS, findServerMachineGaps } from "../../src/lib/domain/lotStatusMapping";
import { validateLotTransition } from "../../src/lib/domain/lotStateMachine";
import { monthlyKg, impactWindowStart } from "../../src/lib/domain/impact";
import { boundingBox } from "../../src/lib/domain/geoBox";
import { calculateHaversineDistanceKm } from "../../src/lib/domain/matching";
import * as cfg from "../../src/lib/domain/config";

const vectors = JSON.parse(readFileSync(join(__dirname, "../fixtures/contract/flow1_rules.json"), "utf8"));

test("config matches the shared vectors", () => {
  assert.equal(cfg.WEIGHT_TOLERANCE_PERCENT, vectors.config.WEIGHT_TOLERANCE_PERCENT);
  assert.equal(cfg.LOT_EXPIRY_DAYS, vectors.config.LOT_EXPIRY_DAYS);
  assert.equal(cfg.RATE_LOCK_HOURS, vectors.config.RATE_LOCK_HOURS);
  assert.deepEqual([...cfg.SEARCH_RADII_KM], vectors.config.SEARCH_RADII_KM);
  const sum = Object.values(cfg.RANK_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, "rank weights sum to 1");
});

test("amountPaise: integer half-up vectors", () => {
  for (const v of vectors.amount) assert.equal(amountPaise(v.grams, v.ratePerKgPaise), v.paise, JSON.stringify(v));
});

test("amountPaise rejects non-integer input", () => {
  assert.throws(() => amountPaise(1.5, 100), RangeError);
});

test("tolerance vectors: isWithinTolerance and evaluateWeightTolerance agree", () => {
  for (const v of vectors.tolerance) {
    assert.equal(isWithinTolerance(v.declared, v.actual), v.within, JSON.stringify(v));
    assert.equal(evaluateWeightTolerance(v.declared, v.actual).autoAccepted, v.within, JSON.stringify(v));
  }
});

test("lotRef vectors", () => {
  for (const v of vectors.lotRef) {
    const ref = generateLotRef(v.shortCode, new Date(`${v.utcDate}T00:00:00Z`), v.seq);
    assert.equal(ref, v.lotRef);
    assert.equal(`HO-${ref}`, v.handoverRef);
  }
});

test("client lot transitions equal the shared table and the server machine accepts all of them", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(CLIENT_LOT_TRANSITIONS).map(([k, v]) => [k, [...v]])),
    vectors.lotTransitions
  );
  assert.deepEqual(findServerMachineGaps(), []);
});

test("rate lock and expiry windows", () => {
  const t0 = new Date("2026-01-01T10:00:00Z");
  assert.equal(rateLockExpiresAt(t0).toISOString(), "2026-01-02T10:00:00.000Z");
  assert.equal(isRateLockActive(t0, new Date("2026-01-02T09:59:59Z")), true);
  assert.equal(isRateLockActive(t0, new Date("2026-01-02T10:00:00Z")), false);
  assert.equal(lotExpiresAt(t0).toISOString(), "2026-01-08T10:00:00.000Z");
});

test("net amount subtracts pickup charge, never adds", () => {
  assert.equal(netAmountPaise(170000, 0), 170000);
  assert.equal(netAmountPaise(170000, 5000), 165000);
  assert.equal(netAmountPaise(170000, -5), 170000);
});

test("admin dispute resolution: DISPUTED can only go to HANDED_OVER (confirm) or CANCELLED, never PAID", () => {
  assert.equal(validateLotTransition("DISPUTED", "HANDED_OVER").valid, true);
  assert.equal(validateLotTransition("DISPUTED", "CANCELLED").valid, true);
  assert.equal(validateLotTransition("READY", "HANDED_OVER").valid, false);
});

test("firstPositiveRate never invents a rate", () => {
  assert.equal(firstPositiveRate(null, undefined, 0, 34000, 99), 34000);
  assert.equal(firstPositiveRate(null, undefined, 0), null);
  assert.equal(firstPositiveRate(), null);
  assert.equal(firstPositiveRate(-5, 12.5), null);
});

test("impact: monthly kg buckets the last 6 months with real data, oldest first", () => {
  const now = new Date("2026-11-15T10:00:00Z");
  const out = monthlyKg(
    [
      { capturedAt: new Date("2026-11-01T00:00:00Z"), grams: 2000 },
      { capturedAt: new Date("2026-11-14T00:00:00Z"), grams: 1400 },
      { capturedAt: new Date("2026-06-30T23:59:59Z"), grams: 5000 }, // before the window
      { capturedAt: new Date("2026-07-01T00:00:00Z"), grams: 7000 },
      { capturedAt: new Date("2026-10-31T23:59:59Z"), grams: null },
    ],
    now
  );
  assert.deepEqual(out.map((m) => m.label), ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]);
  assert.deepEqual(out.map((m) => m.kg), [5, 7, 0, 0, 0, 3]);
  assert.equal(impactWindowStart(now).toISOString(), "2026-06-01T00:00:00.000Z");
});

test("boundingBox always contains every point within the radius", () => {
  for (const [lat, lng] of [[18.52, 73.85], [0, 0], [60, 10], [-33.9, 151.2], [19.07, 72.88]]) {
    const box = boundingBox(lat, lng, 25);
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const rad = (bearing * Math.PI) / 180;
      const pLat = lat + (24.9 / 111.32) * Math.cos(rad);
      const pLng = lng + (24.9 / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);
      if (calculateHaversineDistanceKm(lat, lng, pLat, pLng) <= 25) {
        assert.ok(pLat >= box.minLat && pLat <= box.maxLat && pLng >= box.minLng && pLng <= box.maxLng, `${lat},${lng} @ ${bearing}`);
      }
    }
  }
});
