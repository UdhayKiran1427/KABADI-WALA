/**
 * Pure domain logic: Handover verification, weight tolerances, and location proof.
 */

import { calculateHaversineDistanceKm } from "./matching";

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
 * <= 5%: auto-accepted
 * > 5%: requires review
 * >= 25%: anomaly severity 1
 * >= 40%: anomaly severity 2
 */
export function evaluateWeightTolerance(
  declaredWeightGrams: number,
  confirmedWeightGrams: number
): WeightToleranceResult {
  const diffGrams = Math.abs(confirmedWeightGrams - declaredWeightGrams);
  const percentageDiff = declaredWeightGrams > 0 ? (diffGrams / declaredWeightGrams) * 100 : 0;

  const autoAccepted = percentageDiff <= 5;
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
 * Generates a 4-digit handover verification code (0000 - 9999).
 */
export function generateVerificationCode(): string {
  const code = Math.floor(1000 + Math.random() * 9000);
  return String(code);
}

/**
 * Validates a 4-digit verification code.
 */
export function validateVerificationCode(provided: string, actual: string): boolean {
  if (!provided || !actual) return false;
  return provided.trim() === actual.trim();
}

