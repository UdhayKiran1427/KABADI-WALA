import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { amountPaise, isWithinTolerance, isRateLockActive, rateLockExpiresAt, lotExpiresAt, netAmountPaise, firstPositiveRate } from "../../src/lib/domain/money";
import { evaluateWeightTolerance } from "../../src/lib/domain/handover";
import { generateLotRef } from "../../src/lib/domain/lotRef";
import { CLIENT_LOT_TRANSITIONS, findServerMachineGaps } from "../../src/lib/domain/lotStatusMapping";
import { validateLotTransition } from "../../src/lib/domain/lotStateMachine";
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
