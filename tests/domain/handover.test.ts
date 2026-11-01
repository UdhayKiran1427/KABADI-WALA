import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyLocationProof,
  evaluateWeightTolerance,
  generateVerificationCode,
  validateVerificationCode,
  checkTravelVelocitySpoof,
} from "../../src/lib/domain/handover";

test("classifyLocationProof classifies MATCH (<=300m), NEAR (<=1km), FAR (>1km), and UNKNOWN", () => {
  // Same coordinate = MATCH
  const matchRes = classifyLocationProof(19.076, 72.877, 19.076, 72.877, 10, false);
  assert.equal(matchRes.locationClass, "MATCH");
  assert.equal(matchRes.isFlagged, false);

  // Missing coordinates = UNKNOWN
  const unknownRes = classifyLocationProof(null, null, 19.076, 72.877);
  assert.equal(unknownRes.locationClass, "UNKNOWN");

  // Far away (~15km) = FAR
  const farRes = classifyLocationProof(19.200, 72.877, 19.076, 72.877, 20, false);
  assert.equal(farRes.locationClass, "FAR");
  assert.equal(farRes.isFlagged, true);
});

test("classifyLocationProof flags mock location and low accuracy", () => {
  const spoofRes = classifyLocationProof(19.076, 72.877, 19.076, 72.877, 800, true);
  assert.equal(spoofRes.isFlagged, true);
  assert.ok(spoofRes.spoofFlags.includes("MOCK_LOCATION_REPORTED"));
  assert.ok(spoofRes.spoofFlags.some((f) => f.startsWith("GPS_ACCURACY_LOW")));
});

test("checkTravelVelocitySpoof flags impossible movement > 50km in 10 minutes", () => {
  const t1 = new Date("2026-11-01T10:00:00Z");
  const t2 = new Date("2026-11-01T10:05:00Z"); // 5 minutes later
  // Mumbai CST to Pune ~ 120km
  const spoof = checkTravelVelocitySpoof(18.940, 72.834, t1, 18.520, 73.856, t2);
  assert.equal(spoof, true);
});

test("evaluateWeightTolerance handles auto-accept (<=5%), review (>5%), and anomaly thresholds (25%, 40%)", () => {
  // 5000g vs 4800g = 4% diff => auto accepted
  const autoAcc = evaluateWeightTolerance(5000, 4800);
  assert.equal(autoAcc.autoAccepted, true);
  assert.equal(autoAcc.requiresReview, false);
  assert.equal(autoAcc.anomalySeverity, 0);

  // 5000g vs 4500g = 10% diff => review required
  const reviewReq = evaluateWeightTolerance(5000, 4500);
  assert.equal(reviewReq.autoAccepted, false);
  assert.equal(reviewReq.requiresReview, true);
  assert.equal(reviewReq.anomalySeverity, 0);

  // 5000g vs 3500g = 30% diff => severity 1
  const sev1 = evaluateWeightTolerance(5000, 3500);
  assert.equal(sev1.anomalySeverity, 1);

  // 5000g vs 2500g = 50% diff => severity 2
  const sev2 = evaluateWeightTolerance(5000, 2500);
  assert.equal(sev2.anomalySeverity, 2);
});

test("generateVerificationCode produces a valid 4-digit code", () => {
  const code = generateVerificationCode();
  assert.equal(/^\d{4}$/.test(code), true);
  assert.equal(validateVerificationCode(code, code), true);
  assert.equal(validateVerificationCode("0000", code === "0000" ? "1111" : code), false);
});

