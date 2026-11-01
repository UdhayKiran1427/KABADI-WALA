import test from "node:test";
import assert from "node:assert/strict";
import { calculateTrend, generateCategoryPriceBoard } from "../../src/lib/domain/priceBoard";

test("calculateTrend identifies UP, DOWN, and FLAT with 3% threshold", () => {
  assert.equal(calculateTrend(104, 100), "UP"); // +4%
  assert.equal(calculateTrend(96, 100), "DOWN"); // -4%
  assert.equal(calculateTrend(101, 100), "FLAT"); // +1% (within +/-3%)
});

test("generateCategoryPriceBoard summarizes market vs recycler range", () => {
  const recent = [3000, 3200, 3400]; // median 3200
  const prior = [3000, 3000, 3100];  // median 3000
  const recycler = [3100, 3500];

  const board = generateCategoryPriceBoard(1, recent, prior, recycler);
  assert.equal(board.categoryId, 1);
  assert.equal(board.currentMedianPaise, 3200);
  assert.equal(board.trend, "UP"); // 3200 vs 3000 = +6.6%
  assert.equal(board.marketLowPaise, 3000);
  assert.equal(board.marketHighPaise, 3400);
  assert.equal(board.recyclerMinRatePaise, 3100);
  assert.equal(board.recyclerMaxRatePaise, 3500);
});
