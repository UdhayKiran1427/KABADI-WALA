/**
 * Pure domain logic: Nearby price comparison with travel cost reminder (GEO G7.3).
 *
 * Formula:
 * netGain = (priceDiff * weight) - travelCostEstimate
 * Only recommended when netGain > 0.
 */
import { amountPaise } from "./money";


export const DEFAULT_TRAVEL_COST_PER_KM_PAISE = 1500; // ₹15.00/km (round-trip scrap cart/auto estimate)

export interface AreaPriceComparison {
  areaName: string;
  distanceKm: number;
  nearbyRatePaise: number;
  localRatePaise: number;
  rateDiffPerKgPaise: number; // positive = higher price in nearby area
  rateDiffRupees: number;
  travelCostEstimatePaise: number;
  netGainPaise: number;
  isRecommended: boolean;
  gainRupees: string;
}

export function compareAreaPrice(
  areaName: string,
  distanceKm: number,
  localRatePaise: number,
  nearbyRatePaise: number,
  weightGrams: number,
  costPerKmPaise: number = DEFAULT_TRAVEL_COST_PER_KM_PAISE
): AreaPriceComparison {
  const rateDiffPerKgPaise = nearbyRatePaise - localRatePaise;
  const rateDiffRupees = Math.round((rateDiffPerKgPaise / 100) * 10) / 10;

  // Travel cost based on distance
  const travelCostEstimatePaise = Math.round(distanceKm * costPerKmPaise);

  // Gross difference for this weight
  const grossDiffPaise = amountPaise(weightGrams, rateDiffPerKgPaise);

  // Net gain after travel expenses
  const netGainPaise = grossDiffPaise - travelCostEstimatePaise;
  const isRecommended = netGainPaise > 0 && rateDiffPerKgPaise > 0;

  const gainSign = netGainPaise >= 0 ? "+" : "";
  const gainRupees = `${gainSign}₹${(netGainPaise / 100).toFixed(0)}`;

  return {
    areaName,
    distanceKm: Math.round(distanceKm * 10) / 10,
    nearbyRatePaise,
    localRatePaise,
    rateDiffPerKgPaise,
    rateDiffRupees,
    travelCostEstimatePaise,
    netGainPaise,
    isRecommended,
    gainRupees,
  };
}
