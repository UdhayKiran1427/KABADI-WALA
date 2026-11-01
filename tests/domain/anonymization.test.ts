import test from "node:test";
import assert from "node:assert/strict";
import {
  roundCoordinateTo100m,
  maskPhoneNumber,
  buildPublicReceipt,
} from "../../src/lib/domain/anonymization";

test("roundCoordinateTo100m rounds coordinates to 3 decimals (~111m)", () => {
  assert.equal(roundCoordinateTo100m(19.0761234), 19.076);
  assert.equal(roundCoordinateTo100m(72.8778901), 72.878);
  assert.equal(roundCoordinateTo100m(null), null);
});

test("maskPhoneNumber hides middle digits of phone number", () => {
  assert.equal(maskPhoneNumber("9876543210"), "98******10");
});

test("buildPublicReceipt creates public shareable receipt with zero PII", () => {
  const receipt = buildPublicReceipt(
    "LOT-AB12-261101-0001",
    "Printed Circuit Board (PCB)",
    5000,
    160000,
    new Date("2026-11-01T10:00:00Z"),
    "EcoRecycle Hub",
    "EW-2026-001"
  );

  assert.equal(receipt.lotRef, "LOT-AB12-261101-0001");
  assert.equal(receipt.weightKg, "5.00");
  assert.equal(receipt.finalPriceRupees, "₹1600.00");
  assert.equal(receipt.recyclerName, "EcoRecycle Hub");
});

