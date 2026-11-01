/**
 * Pure domain logic: Handover verification, weight tolerances, and location proof.
 */

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { calculateHaversineDistanceKm } from "./matching";
import { isWithinTolerance } from "./money";

export type LocationClass = "MATCH" | "NEAR" | "FAR" | "UNKNOWN";

export interface LocationProofResult {
  locationClass: LocationClass;
  distanceToRecyclerMeters: number | null;
  spoofFlags: string[];
  isFlagged: boolean;
}

export interface WeightToleranceResult {
  declaredWeightGrams: number;
  confirmedWeightGrams: number;
  differenceGrams: number;
  percentageDiff: number;
  autoAccepted: boolean;
  requiresReview: boolean;
  anomalySeverity: 0 | 1 | 2; // 0 = normal, 1 = 25% mismatch, 2 = 40% mismatch
}

/**
 * Classifies handover location against the recycler facility coordinates.
 * MATCH: <= 300 meters
 * NEAR:  <= 1000 meters
 * FAR:   > 1000 meters (flags anomaly, never blocks sale)
 * UNKNOWN: coordinates missing
 */
export function classifyLocationProof(
  handoverLat: number | null | undefined,
  handoverLng: number | null | undefined,
  facilityLat: number | null | undefined,
  facilityLng: number | null | undefined,
  accuracyMeters?: number | null,
  mockLocationFlag?: boolean | null
): LocationProofResult {
  const spoofFlags: string[] = [];

  if (mockLocationFlag === true) {
    spoofFlags.push("MOCK_LOCATION_REPORTED");
  }

  if (accuracyMeters !== null && accuracyMeters !== undefined && accuracyMeters > 500) {
    spoofFlags.push(`GPS_ACCURACY_LOW_${Math.round(accuracyMeters)}M`);
  }

  if (
    handoverLat === null ||
    handoverLat === undefined ||
    handoverLng === null ||
    handoverLng === undefined ||
    facilityLat === null ||
    facilityLat === undefined ||
    facilityLng === null ||
    facilityLng === undefined
  ) {
    return {
      locationClass: "UNKNOWN",
      distanceToRecyclerMeters: null,
      spoofFlags,
      isFlagged: spoofFlags.length > 0,
    };
  }

  const distanceKm = calculateHaversineDistanceKm(handoverLat, handoverLng, facilityLat, facilityLng);
  const distanceMeters = Math.round(distanceKm * 1000);

  let locationClass: LocationClass = "MATCH";
  if (distanceMeters <= 300) {
    locationClass = "MATCH";
  } else if (distanceMeters <= 1000) {
    locationClass = "NEAR";
  } else {
    locationClass = "FAR";
    spoofFlags.push(`FAR_DISTANCE_${distanceMeters}M`);
  }

  return {
    locationClass,
    distanceToRecyclerMeters: distanceMeters,
    spoofFlags,
    isFlagged: spoofFlags.length > 0 || locationClass === "FAR",
  };
}

/**
 * Checks for implausible physical travel velocity between consecutive handovers.
 * Spoof flag if distance > 50 km within 10 minutes.
 */
export function checkTravelVelocitySpoof(
  prevLat: number,
  prevLng: number,
  prevTime: Date,
  currentLat: number,
  currentLng: number,
  currentTime: Date
): boolean {
  const timeDiffMinutes = Math.abs(currentTime.getTime() - prevTime.getTime()) / (60 * 1000);
  if (timeDiffMinutes > 10) return false;

  const distanceKm = calculateHaversineDistanceKm(prevLat, prevLng, currentLat, currentLng);
  return distanceKm > 50;
}

/**
 * Evaluates weight tolerance between declared and confirmed weights in grams.
 * <= WEIGHT_TOLERANCE_PERCENT: auto-accepted (integer math)
 * > WEIGHT_TOLERANCE_PERCENT: requires review
 * >= 25%: anomaly severity 1
 * >= 40%: anomaly severity 2
 */
export function evaluateWeightTolerance(
  declaredWeightGrams: number,
  confirmedWeightGrams: number
): WeightToleranceResult {
  const diffGrams = Math.abs(confirmedWeightGrams - declaredWeightGrams);
  const percentageDiff = declaredWeightGrams > 0 ? (diffGrams / declaredWeightGrams) * 100 : 0;

  // Decision uses integer math (spec section 4); percentageDiff is for display and severity only.
  const autoAccepted = isWithinTolerance(declaredWeightGrams, confirmedWeightGrams);
  const requiresReview = !autoAccepted;

  let anomalySeverity: 0 | 1 | 2 = 0;
  if (percentageDiff >= 40) {
    anomalySeverity = 2;
  } else if (percentageDiff >= 25) {
    anomalySeverity = 1;
  }

  return {
    declaredWeightGrams,
    confirmedWeightGrams,
    differenceGrams: diffGrams,
    percentageDiff: Math.round(percentageDiff * 10) / 10,
    autoAccepted,
    requiresReview,
    anomalySeverity,
  };
}

/**
 * Generates a 4-digit handover verification code (0000 - 9999). LEGACY: only the web/REST flow
 * still lets the server issue a code; phone handovers carry a `codeHash` instead.
 */
export function generateVerificationCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

/**
 * Validates a 4-digit verification code (legacy plain-text comparison, constant time).
 */
export function validateVerificationCode(provided: string, actual: string): boolean {
  if (!provided || !actual) return false;
  return safeEqualStrings(provided.trim(), actual.trim());
}

/**
 * SHA-256 hex of `"<ref>:<code>"` (UTF-8). Exact port of `hashHandoverCode` in
 * E_waste/lib/core/utils/handover_code.dart; cross-language vectors live in
 * tests/fixtures/contract/handover_code_vectors.json and are asserted on both sides.
 * `ref` is the handoverRef (single handover) or the batchRef (batch handover).
 */
export function hashHandoverCode(ref: string, code: string): string {
  return createHash("sha256").update(`${ref}:${code}`, "utf8").digest("hex");
}

/** Constant-time string equality (length is not secret here: hashes and 4-digit codes). */
export function safeEqualStrings(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface HandoverCodeRecord {
  handoverRef: string;
  codeHash?: string | null;
  /** LEGACY plain code; read only when there is no codeHash. */
  verificationCode?: string | null;
}

/**
 * Checks the code a recycler typed against a handover. Uses `codeHash` when present
 * (hash the entered code with the handoverRef, compare in constant time); falls back to the
 * legacy plain `verificationCode` only for handovers that have no hash.
 */
export function verifyEnteredHandoverCode(record: HandoverCodeRecord, entered: string): boolean {
  const code = (entered ?? "").trim();
  if (!/^\d{4}$/.test(code)) return false;
  if (record.codeHash) {
    return safeEqualStrings(hashHandoverCode(record.handoverRef, code), record.codeHash.toLowerCase());
  }
  if (record.verificationCode) return safeEqualStrings(code, record.verificationCode.trim());
  return false;
}

/** Incident severity (1 low .. 3 high) derived from the phone's incident type. */
export function incidentSeverity(type: string): 1 | 2 | 3 {
  switch (type) {
    case "burn":
    case "battery_leak":
    case "fumes":
      return 3;
    case "cut":
      return 2;
    default:
      return 1;
  }
}
