/**
 * Pure domain logic: Recycler matching & nearest finder.
 *
 * Requirements:
 * - Hard filters:
 *   - Recycler authorizationStatus == 'VERIFIED' and authorizationValidTill > now.
 *   - Recycler accepts material category (has active rate).
 *   - Minimum weight check if pickup is requested.
 * - Expanding radius: 5 -> 10 -> 25 -> 50 km until >= 3 candidates found.
 * - Score:
 *   - Rate 40% (min-max scaled)
 *   - Distance 30% (linear 0 to max radius)
 *   - Pickup 10% (10 if available, else 0)
 *   - Rating 10% (rating / 5 * 10)
 *   - Rate Freshness 10% (10 if <= 7 days old, linear decay to 0 at 30 days)
 * - Returns compass direction, net expected total in paise, "why this is best" text, and debug exclusions.
 */

export interface CandidateRecycler {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  authorizationStatus: string;
  authorizationValidTill: Date | null;
  contactPhone: string;
  pickupAvailable: boolean;
  serviceRadiusKm: number;
  minimumWeightGrams: number;
  pickupChargePaise: number;
  ratePerKgPaise: number;
  rateEffectiveFrom: Date;
  averageRating: number; // 0 to 5
}

export interface MatchQuery {
  collectorLat: number;
  collectorLng: number;
  categoryId: number;
  approxWeightGrams: number;
  pickupRequired?: boolean;
  now?: Date;
}

export interface RankedRecycler {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  distanceKm: number;
  compassDirection: string;
  ratePerKgPaise: number;
  pickupAvailable: boolean;
  pickupChargePaise: number;
  expectedTotalPaise: number;
  rating: number;
  score: number;
  whyThisIsBest: string;
  rank: number;
}

export interface MatchResult {
  recyclers: RankedRecycler[];
  searchRadiusKm: number;
  totalFound: number;
  exclusions?: Array<{ recyclerId: string; name: string; reason: string }>;
}

export const SEARCH_RADII_KM = [5, 10, 25, 50];

/**
 * Calculates Haversine distance in kilometers between two geo coordinates.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // 2 decimal precision
}

/**
 * Computes 8-point compass bearing from origin to destination.
 */
export function calculateCompassDirection(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(brng / 45) % 8;
  return points[index];
}

/**
 * Pure function: Match and rank recyclers using expanding radius and weighted scoring.
 */
export function matchRecyclers(
  candidates: CandidateRecycler[],
  query: MatchQuery
): MatchResult {
  const now = query.now || new Date();
  const exclusions: Array<{ recyclerId: string; name: string; reason: string }> = [];

  // 1. Hard filters
  const eligible = candidates.filter((c) => {
    if (c.authorizationStatus !== "VERIFIED") {
      exclusions.push({ recyclerId: c.id, name: c.name, reason: `Status is ${c.authorizationStatus}, not VERIFIED` });
      return false;
    }
    if (c.authorizationValidTill && new Date(c.authorizationValidTill) <= now) {
      exclusions.push({ recyclerId: c.id, name: c.name, reason: "Authorization expired" });
      return false;
    }
    if (c.ratePerKgPaise <= 0) {
      exclusions.push({ recyclerId: c.id, name: c.name, reason: "No active rate for this material" });
      return false;
    }
    if (query.pickupRequired) {
      if (!c.pickupAvailable) {
        exclusions.push({ recyclerId: c.id, name: c.name, reason: "Does not provide doorstep pickup" });
        return false;
      }
      if (query.approxWeightGrams < c.minimumWeightGrams) {
        exclusions.push({
          recyclerId: c.id,
          name: c.name,
          reason: `Weight ${query.approxWeightGrams}g is below minimum pickup weight ${c.minimumWeightGrams}g`,
        });
        return false;
      }
    }
    return true;
  });

  // Calculate distance for all eligible recyclers
  const withDistance = eligible.map((c) => {
    const distanceKm = calculateHaversineDistanceKm(
      query.collectorLat,
      query.collectorLng,
      c.latitude,
      c.longitude
    );
    const compassDirection = calculateCompassDirection(
      query.collectorLat,
      query.collectorLng,
      c.latitude,
      c.longitude
    );
    return { ...c, distanceKm, compassDirection };
  });

  // 2. Expanding radius search: 5 -> 10 -> 25 -> 50 km until >= 3 results
  let searchRadiusKm = SEARCH_RADII_KM[SEARCH_RADII_KM.length - 1];
  let inRadius = withDistance;

  for (const radius of SEARCH_RADII_KM) {
    const filtered = withDistance.filter((c) => c.distanceKm <= radius);
    if (query.pickupRequired) {
      // Must also be within recycler's own service radius
      const withinService = filtered.filter((c) => c.distanceKm <= c.serviceRadiusKm);
      if (withinService.length >= 3 || radius === SEARCH_RADII_KM[SEARCH_RADII_KM.length - 1]) {
        inRadius = withinService;
        searchRadiusKm = radius;
        break;
      }
    } else {
      if (filtered.length >= 3 || radius === SEARCH_RADII_KM[SEARCH_RADII_KM.length - 1]) {
        inRadius = filtered;
        searchRadiusKm = radius;
        break;
      }
    }
  }

  if (inRadius.length === 0) {
    return { recyclers: [], searchRadiusKm, totalFound: 0, exclusions };
  }

  // 3. Score calculation
  // Find min and max rates among candidates
  const rates = inRadius.map((c) => c.ratePerKgPaise);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);

  const scored = inRadius.map((c) => {
    // Rate Score (40%): 0 to 40
    let rateScore = 40;
    if (maxRate > minRate) {
      rateScore = ((c.ratePerKgPaise - minRate) / (maxRate - minRate)) * 40;
    }

    // Distance Score (30%): 0 to 30 (closer = higher)
    const effectiveRadius = Math.max(searchRadiusKm, 5);
    const distanceScore = Math.max(0, 30 * (1 - c.distanceKm / effectiveRadius));

    // Pickup Score (10%): 10 if available, else 0
    const pickupScore = c.pickupAvailable ? 10 : 0;

    // Rating Score (10%): 0 to 10
    const ratingScore = Math.min(10, Math.max(0, (c.averageRating / 5) * 10));

    // Rate Freshness Score (10%): 10 if <= 7 days, decay to 0 at 30 days
    const daysSinceRate = (now.getTime() - new Date(c.rateEffectiveFrom).getTime()) / (24 * 60 * 60 * 1000);
    let freshnessScore = 10;
    if (daysSinceRate > 7) {
      const decayFraction = Math.max(0, (30 - daysSinceRate) / (30 - 7));
      freshnessScore = decayFraction * 10;
    }

    const totalScore = Math.round((rateScore + distanceScore + pickupScore + ratingScore + freshnessScore) * 10) / 10;

    // Expected total net of pickup charge
    const grossPaise = Math.round((c.ratePerKgPaise * query.approxWeightGrams) / 1000);
    const expectedTotalPaise = Math.max(0, grossPaise - (query.pickupRequired ? c.pickupChargePaise : 0));

    // Text reason for ranking
    const reasons: string[] = [];
    if (c.ratePerKgPaise === maxRate) reasons.push("Top buying rate");
    if (c.distanceKm <= 5) reasons.push(`Close by (${c.distanceKm} km)`);
    if (c.pickupAvailable) reasons.push("Doorstep pickup available");
    if (c.averageRating >= 4.5) reasons.push(`Highly rated (${c.averageRating}★)`);
    const whyThisIsBest = reasons.length > 0 ? reasons.join(" • ") : "Authorized verified recycler";

    return {
      id: c.id,
      name: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
      contactPhone: c.contactPhone,
      distanceKm: c.distanceKm,
      compassDirection: c.compassDirection,
      ratePerKgPaise: c.ratePerKgPaise,
      pickupAvailable: c.pickupAvailable,
      pickupChargePaise: c.pickupChargePaise,
      expectedTotalPaise,
      rating: c.averageRating,
      score: totalScore,
      whyThisIsBest,
    };
  });

  // Sort descending by score, tiebreak by distance ascending
  scored.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

  const ranked: RankedRecycler[] = scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  return {
    recyclers: ranked,
    searchRadiusKm,
    totalFound: ranked.length,
    exclusions,
  };
}
