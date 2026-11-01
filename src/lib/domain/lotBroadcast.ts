import { calculateHaversineDistanceKm } from "./matching";
import { amountPaise } from "./money";

export const BROADCAST_RADIUS_KM = 5;

export interface BroadcastCandidate {
  id: string;
  latitude: number;
  longitude: number;
  authorizationStatus: string;
  authorizationValidTill: Date | null;
}

export interface BroadcastTarget {
  recyclerId: string;
  distanceKm: number;
}

/**
 * Picks verified recyclers within the broadcast radius of a lot, nearest first.
 * Pure function - no DB imports.
 */
export function selectBroadcastTargets(
  candidates: BroadcastCandidate[],
  lotLat: number,
  lotLng: number,
  now: Date = new Date(),
  radiusKm: number = BROADCAST_RADIUS_KM
): BroadcastTarget[] {
  return candidates
    .filter((r) => r.authorizationStatus === "VERIFIED")
    .filter((r) => !r.authorizationValidTill || r.authorizationValidTill >= now)
    .map((r) => ({
      recyclerId: r.id,
      distanceKm: calculateHaversineDistanceKm(lotLat, lotLng, r.latitude, r.longitude),
    }))
    .filter((t) => t.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Lot value in paise for a rate per kg and a weight in grams.
 */
export function calculateLotValuePaise(ratePerKgPaise: number, weightGrams: number): number {
  return amountPaise(weightGrams, ratePerKgPaise);
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}
