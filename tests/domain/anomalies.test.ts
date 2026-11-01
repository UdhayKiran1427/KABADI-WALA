import test from "node:test";
import assert from "node:assert/strict";
import {
  checkPriceAnomalies,
  checkWeightAnomalies,
  checkLocationAnomalies,
  checkOverpaymentAnomaly,
  checkDuplicatePhotoAnomaly,
} from "../../src/lib/domain/anomalies";

test("checkPriceAnomalies flags 2x and 3x price disparities", () => {
  // 1000 estimate vs 1500 final -> no flag
  assert.equal(checkPriceAnomalies(1500, 1000), null);

  // 1000 estimate vs 2200 final -> 2x flag
  const flag2x = checkPriceAnomalies(2200, 1000);
  assert.ok(flag2x);
  assert.equal(flag2x?.ruleCode, "PRICE_2X_ESTIMATE");
  assert.equal(flag2x?.severity, 1);

  // 1000 estimate vs 3500 final -> 3x flag
  const flag3x = checkPriceAnomalies(3500, 1000);
  assert.ok(flag3x);
  assert.equal(flag3x?.ruleCode, "PRICE_3X_ESTIMATE");
  assert.equal(flag3x?.severity, 2);
});

test("checkWeightAnomalies flags 25% and 40% weight discrepancies", () => {
  // 10kg declared vs 9.8kg confirmed -> null
  assert.equal(checkWeightAnomalies(10000, 9800), null);

  // 10kg declared vs 7kg confirmed (30% diff) -> severity 1
  const flag25 = checkWeightAnomalies(10000, 7000);
  assert.ok(flag25);
  assert.equal(flag25?.ruleCode, "WEIGHT_DIFF_25");
  assert.equal(flag25?.severity, 1);

  // 10kg declared vs 5kg confirmed (50% diff) -> severity 2
  const flag40 = checkWeightAnomalies(10000, 5000);
  assert.ok(flag40);
  assert.equal(flag40?.ruleCode, "WEIGHT_DIFF_40");
  assert.equal(flag40?.severity, 2);
});

test("checkLocationAnomalies flags mock locations and far distance", () => {
  const flags = checkLocationAnomalies("FAR", 2500, ["MOCK_LOCATION_REPORTED"]);
  assert.equal(flags.length, 2);
  assert.ok(flags.some((f) => f.ruleCode === "MOCK_LOCATION_DETECTED"));
  assert.ok(flags.some((f) => f.ruleCode === "GPS_FAR_COLLECTION"));
});

test("checkOverpaymentAnomaly flags payments exceeding agreed price", () => {
  const overpay = checkOverpaymentAnomaly(5500, 5000);
  assert.ok(overpay);
  assert.equal(overpay?.ruleCode, "OVERPAYMENT_DETECTED");
});

test("checkDuplicatePhotoAnomaly generates flag descriptor with SHA256", () => {
  const dup = checkDuplicatePhotoAnomaly("lot-123", "abcdef0123456789");
  assert.equal(dup.ruleCode, "DUPLICATE_PHOTO_SHA256");
  assert.ok(dup.reason.includes("lot-123"));
});
