/**
 * Pure domain logic: Price board and trend indicators.
 * Trend arrows: UP, DOWN, or FLAT at +/- 3% threshold against previous 7-day median.
 */

import { computeMedian } from "./estimates";

export type TrendDirection = "UP" | "DOWN" | "FLAT";

export interface CategoryPriceStats {
  categoryId: number;
  currentMedianPaise: number;
  previousMedianPaise: number;
  trend: TrendDirection;
  marketLowPaise: number;
  marketHighPaise: number;
  recyclerMinRatePaise: number;
  recyclerMaxRatePaise: number;
}

export function calculateTrend(currentMedian: number, previousMedian: number, thresholdPercent: number = 0.03): TrendDirection {
  if (previousMedian <= 0 || currentMedian <= 0) return "FLAT";
  const diffRatio = (currentMedian - previousMedian) / previousMedian;
  if (diffRatio >= thresholdPercent) return "UP";
  if (diffRatio <= -thresholdPercent) return "DOWN";
  return "FLAT";
}

export function generateCategoryPriceBoard(
  categoryId: number,
  recentPrices: number[], // last 7 days
  priorPrices: number[],  // 7 to 14 days ago
  recyclerRates: number[] // currently active recycler rates
): CategoryPriceStats {
  const currentSorted = [...recentPrices].sort((a, b) => a - b);
  const priorSorted = [...priorPrices].sort((a, b) => a - b);
  const recyclerSorted = [...recyclerRates].sort((a, b) => a - b);

  const currentMedian = computeMedian(currentSorted);
  const previousMedian = computeMedian(priorSorted);
  const trend = calculateTrend(currentMedian, previousMedian);

  const marketLow = currentSorted.length > 0 ? currentSorted[0] : 0;
  const marketHigh = currentSorted.length > 0 ? currentSorted[currentSorted.length - 1] : 0;

  const recyclerMin = recyclerSorted.length > 0 ? recyclerSorted[0] : 0;
  const recyclerMax = recyclerSorted.length > 0 ? recyclerSorted[recyclerSorted.length - 1] : 0;

  return {
    categoryId,
    currentMedianPaise: currentMedian,
    previousMedianPaise: previousMedian,
    trend,
    marketLowPaise: marketLow,
    marketHighPaise: marketHigh,
    recyclerMinRatePaise: recyclerMin,
    recyclerMaxRatePaise: recyclerMax,
  };
}
