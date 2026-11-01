/**
 * Pure domain logic: Anomaly detection rules for M3 platform monitoring.
 * Every rule produces an AnomalyFlagDescriptor with deduplication key (ruleCode).
 */

export interface AnomalyFlagDescriptor {
  ruleCode: string;
  type: "PRICE_OUTLIER" | "WEIGHT_MISMATCH" | "LOCATION_MISMATCH" | "DUPLICATE_LOT" | "SPOOFING_SIGNAL" | "OTHER";
  severity: 1 | 2 | 3; // 1 = low, 2 = medium, 3 = high
  reason: string;
  details?: Record<string, unknown>;
}

/**
 * Checks price anomaly against estimate.
 * - finalPrice >= 3x estimate => severity 2
 * - finalPrice >= 2x estimate => severity 1
 */
export function checkPriceAnomalies(
  finalPricePaise: number,
  estimatedValuePaise: number | null | undefined
): AnomalyFlagDescriptor | null {
  if (!estimatedValuePaise || estimatedValuePaise <= 0 || finalPricePaise <= 0) {
    return null;
  }

  const ratio = finalPricePaise / estimatedValuePaise;
  if (ratio >= 3.0) {
    return {
      ruleCode: "PRICE_3X_ESTIMATE",
      type: "PRICE_OUTLIER",
      severity: 2,
      reason: `Final settlement ₹${(finalPricePaise / 100).toFixed(2)} is ${ratio.toFixed(1)}x greater than estimated ₹${(estimatedValuePaise / 100).toFixed(2)}`,
      details: { ratio, finalPricePaise, estimatedValuePaise },
    };
  }

  if (ratio >= 2.0) {
    return {
      ruleCode: "PRICE_2X_ESTIMATE",
      type: "PRICE_OUTLIER",
      severity: 1,
      reason: `Final settlement ₹${(finalPricePaise / 100).toFixed(2)} is ${ratio.toFixed(1)}x greater than estimated ₹${(estimatedValuePaise / 100).toFixed(2)}`,
      details: { ratio, finalPricePaise, estimatedValuePaise },
    };
  }

  return null;
}

/**
 * Checks weight anomaly between declared and confirmed weight in grams.
 */
export function checkWeightAnomalies(
  declaredWeightGrams: number,
  confirmedWeightGrams: number
): AnomalyFlagDescriptor | null {
  if (declaredWeightGrams <= 0 || confirmedWeightGrams <= 0) {
    return null;
  }

  const diff = Math.abs(confirmedWeightGrams - declaredWeightGrams);
  const percent = (diff / declaredWeightGrams) * 100;

  if (percent >= 40) {
    return {
      ruleCode: "WEIGHT_DIFF_40",
      type: "WEIGHT_MISMATCH",
      severity: 2,
      reason: `Confirmed weight ${(confirmedWeightGrams / 1000).toFixed(2)}kg deviates by ${percent.toFixed(1)}% from declared ${(declaredWeightGrams / 1000).toFixed(2)}kg`,
      details: { declaredWeightGrams, confirmedWeightGrams, percentageDiff: percent },
    };
  }

  if (percent >= 25) {
    return {
      ruleCode: "WEIGHT_DIFF_25",
      type: "WEIGHT_MISMATCH",
      severity: 1,
      reason: `Confirmed weight ${(confirmedWeightGrams / 1000).toFixed(2)}kg deviates by ${percent.toFixed(1)}% from declared ${(declaredWeightGrams / 1000).toFixed(2)}kg`,
      details: { declaredWeightGrams, confirmedWeightGrams, percentageDiff: percent },
    };
  }

  return null;
}

/**
 * Checks location mismatch and spoofing signals.
 */
export function checkLocationAnomalies(
  locationClass: string,
  distanceToRecyclerMeters: number | null,
  spoofFlags: string[]
): AnomalyFlagDescriptor[] {
  const flags: AnomalyFlagDescriptor[] = [];

  if (spoofFlags.includes("MOCK_LOCATION_REPORTED")) {
    flags.push({
      ruleCode: "MOCK_LOCATION_DETECTED",
      type: "SPOOFING_SIGNAL",
      severity: 3,
      reason: "Handover reported with active mock location provider.",
      details: { spoofFlags },
    });
  }

  if (spoofFlags.some((f) => f.startsWith("GPS_ACCURACY_LOW"))) {
    flags.push({
      ruleCode: "LOW_GPS_ACCURACY",
      type: "SPOOFING_SIGNAL",
      severity: 1,
      reason: "Handover GPS accuracy > 500 meters.",
      details: { spoofFlags },
    });
  }

  if (locationClass === "FAR" && distanceToRecyclerMeters && distanceToRecyclerMeters > 1000) {
    flags.push({
      ruleCode: "GPS_FAR_COLLECTION",
      type: "LOCATION_MISMATCH",
      severity: 2,
      reason: `Handover coordinates are ${(distanceToRecyclerMeters / 1000).toFixed(2)}km away from the recycler facility.`,
      details: { distanceToRecyclerMeters },
    });
  }

  return flags;
}

/**
 * Checks overpayment anomaly.
 */
export function checkOverpaymentAnomaly(
  totalPaidPaise: number,
  finalPricePaise: number
): AnomalyFlagDescriptor | null {
  if (finalPricePaise > 0 && totalPaidPaise > finalPricePaise) {
    const overage = totalPaidPaise - finalPricePaise;
    return {
      ruleCode: "OVERPAYMENT_DETECTED",
      type: "PRICE_OUTLIER",
      severity: 2,
      reason: `Total paid amount ₹${(totalPaidPaise / 100).toFixed(2)} exceeds agreed final price ₹${(finalPricePaise / 100).toFixed(2)} by ₹${(overage / 100).toFixed(2)}`,
      details: { totalPaidPaise, finalPricePaise, overagePaise: overage },
    };
  }
  return null;
}

/**
 * Checks duplicate photo hash.
 */
export function checkDuplicatePhotoAnomaly(existingLotId: string, sha256: string): AnomalyFlagDescriptor {
  return {
    ruleCode: "DUPLICATE_PHOTO_SHA256",
    type: "DUPLICATE_LOT",
    severity: 2,
    reason: `Identical photo checksum (${sha256.slice(0, 10)}...) already used on lot ${existingLotId}`,
    details: { existingLotId, sha256 },
  };
}
