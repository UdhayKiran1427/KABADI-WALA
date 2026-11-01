/**
 * Pure domain logic: Price estimate calculations.
 * Units:
 *   - buyingPricePaise: Integer paise per kg
 *   - approxWeightGrams: Integer grams
 *   - estimate values: Integer paise
 */

export interface PriceRecordInput {
  buyingPricePaise: number;
  recordedAt: Date | string;
}

export interface RecyclerRateInput {
  ratePerKgPaise: number;
  isCurrent: boolean;
}

export interface EstimateResult {
  medianRatePaisePerKg: number;
  minRatePaisePerKg: number;
  maxRatePaisePerKg: number;
  estimatedValuePaise: number;
  estimatedMinPaise: number;
  estimatedMaxPaise: number;
  source: "PRICE_HISTORY" | "RECYCLER_RATES" | "FALLBACK_DEFAULT";
}

/**
 * Calculates price estimate and range for a lot.
 * - Filters price history to last 30 days.
 * - Computes median and interquartile range (IQR).
 * - Widens the band to at least +/- 10% of median.
 * - Falls back to active recycler rates if history is empty.
 */
export function calculateEstimate(
  priceHistory: PriceRecordInput[],
  recyclerRates: RecyclerRateInput[],
  approxWeightGrams: number,
  now: Date = new Date()
): EstimateResult {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter 30-day prices
  const validPrices = priceHistory
    .filter((p) => new Date(p.recordedAt) >= cutoff && p.buyingPricePaise > 0)
    .map((p) => p.buyingPricePaise)
    .sort((a, b) => a - b);

  let medianRate = 0;
  let minRate = 0;
  let maxRate = 0;
  let source: EstimateResult["source"] = "PRICE_HISTORY";

  if (validPrices.length > 0) {
    medianRate = computeMedian(validPrices);

    // Compute Q1 and Q3
    const q1 = computePercentile(validPrices, 0.25);
    const q3 = computePercentile(validPrices, 0.75);

    // Minimum +/-10% bounds
    const lowerTenPercent = Math.round(medianRate * 0.9);
    const upperTenPercent = Math.round(medianRate * 1.1);

    minRate = Math.min(q1, lowerTenPercent);
    maxRate = Math.max(q3, upperTenPercent);
  } else {
    // Fall back to recycler rates
    const currentRates = recyclerRates
      .filter((r) => r.isCurrent && r.ratePerKgPaise > 0)
      .map((r) => r.ratePerKgPaise)
      .sort((a, b) => a - b);

    if (currentRates.length > 0) {
      source = "RECYCLER_RATES";
      medianRate = computeMedian(currentRates);
      minRate = Math.min(currentRates[0], Math.round(medianRate * 0.9));
      maxRate = Math.max(currentRates[currentRates.length - 1], Math.round(medianRate * 1.1));
    } else {
      source = "FALLBACK_DEFAULT";
      medianRate = 1000; // default ₹10/kg fallback if completely empty
      minRate = 900;
      maxRate = 1100;
    }
  }

  // Ensure min <= median <= max
  minRate = Math.min(minRate, medianRate);
  maxRate = Math.max(maxRate, medianRate);

  // Weight is in grams (1000 grams = 1 kg).
  // estimatedValuePaise = (medianRate * approxWeightGrams) / 1000
  const weightKg = approxWeightGrams / 1000;
  const estimatedValuePaise = Math.round(medianRate * weightKg);
  const estimatedMinPaise = Math.round(minRate * weightKg);
  const estimatedMaxPaise = Math.round(maxRate * weightKg);

  return {
    medianRatePaisePerKg: medianRate,
    minRatePaisePerKg: minRate,
    maxRatePaisePerKg: maxRate,
    estimatedValuePaise,
    estimatedMinPaise,
    estimatedMaxPaise,
    source,
  };
}

export function computeMedian(sortedNumbers: number[]): number {
  if (sortedNumbers.length === 0) return 0;
  const mid = Math.floor(sortedNumbers.length / 2);
  if (sortedNumbers.length % 2 === 0) {
    return Math.round((sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2);
  }
  return sortedNumbers[mid];
}

export function computePercentile(sortedNumbers: number[], percentile: number): number {
  if (sortedNumbers.length === 0) return 0;
  if (sortedNumbers.length === 1) return sortedNumbers[0];
  const index = (sortedNumbers.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedNumbers[lower];
  const weight = index - lower;
  return Math.round(sortedNumbers[lower] * (1 - weight) + sortedNumbers[upper] * weight);
}

