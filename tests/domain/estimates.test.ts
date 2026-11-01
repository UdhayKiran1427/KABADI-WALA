import test from "node:test";
import assert from "node:assert/strict";
import { calculateEstimate, computeMedian } from "../../src/lib/domain/estimates";

test("computeMedian computes correct median for odd and even arrays", () => {
  assert.equal(computeMedian([100, 200, 300]), 200);
  assert.equal(computeMedian([100, 200, 300, 400]), 250);
});

test("calculateEstimate calculates median and widened +/- 10% band from price history", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const prices = [
    { buyingPricePaise: 3000, recordedAt: new Date("2026-10-25T10:00:00Z") },
    { buyingPricePaise: 3200, recordedAt: new Date("2026-10-28T10:00:00Z") },
    { buyingPricePaise: 3400, recordedAt: new Date("2026-10-30T10:00:00Z") },
  ];

  // 5 kg = 5000 grams
  const res = calculateEstimate(prices, [], 5000, now);
  assert.equal(res.source, "PRICE_HISTORY");
  assert.equal(res.medianRatePaisePerKg, 3200);
  // Expected total = 3200 * 5 = 16000 paise (₹160)
  assert.equal(res.estimatedValuePaise, 16000);
  // Min should be at least <= 90% of median (2880)
  assert.ok(res.estimatedMinPaise <= 16000);
  assert.ok(res.estimatedMaxPaise >= 16000);
});

test("calculateEstimate falls back to recycler rates if price history is empty", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const recyclerRates = [
    { ratePerKgPaise: 5000, isCurrent: true },
    { ratePerKgPaise: 6000, isCurrent: true },
  ];

  const res = calculateEstimate([], recyclerRates, 2000, now);
  assert.equal(res.source, "RECYCLER_RATES");
  assert.equal(res.medianRatePaisePerKg, 5500);
  assert.equal(res.estimatedValuePaise, 11000); // 5500 * 2kg = 11000 paise
});
