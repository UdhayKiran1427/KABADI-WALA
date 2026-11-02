import { calculateHaversineDistanceKm } from "./matching";

/**
 * Travel speeds by mode (in km/h).
 * Straight-line estimate table per GEO G4.
 */
export const TRAVEL_SPEEDS_KMH = {
  walk: 4.5,
  bike: 12.0,
  vehicle: 20.0,
} as const;

export type TravelMode = keyof typeof TRAVEL_SPEEDS_KMH;

/**
 * Calculates estimated travel time in minutes based on straight-line distance.
 */
export function calculateTravelMinutes(distanceKm: number, mode: TravelMode): number {
  if (distanceKm <= 0) return 1;
  const speed = TRAVEL_SPEEDS_KMH[mode];
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

export interface TravelEstimates {
  distanceKm: number;
  walkMinutes: number;
  bikeMinutes: number;
  vehicleMinutes: number;
  summaryEn: string;
  summaryHi: string;
  summaryMr: string;
}

export function getTravelEstimates(distanceKm: number): TravelEstimates {
  const walk = calculateTravelMinutes(distanceKm, "walk");
  const bike = calculateTravelMinutes(distanceKm, "bike");
  const vehicle = calculateTravelMinutes(distanceKm, "vehicle");

  return {
    distanceKm,
    walkMinutes: walk,
    bikeMinutes: bike,
    vehicleMinutes: vehicle,
    summaryEn: `~${walk} min walk · ~${bike} min bike · ~${vehicle} min drive (approx)`,
    summaryHi: `लगभग ~${walk} मिनट पैदल · ~${bike} मिनट बाइक · ~${vehicle} मिनट गाड़ी`,
    summaryMr: `अंदाजे ~${walk} मि. पायी · ~${bike} मि. बाईक · ~${vehicle} मि. गाडी`,
  };
}

/**
 * Generates Google Maps directions URL with optional mode and origin coordinates.
 */
export function getDirectionsUrl(
  destLat: number,
  destLng: number,
  mode: TravelMode = "vehicle",
  originLat?: number | null,
  originLng?: number | null
): string {
  const travelmode = mode === "walk" ? "walking" : mode === "bike" ? "bicycling" : "driving";
  const params = new URLSearchParams({
    api: "1",
    destination: `${destLat},${destLng}`,
    travelmode,
  });
  if (originLat != null && originLng != null) {
    params.set("origin", `${originLat},${originLng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Generates WhatsApp and SMS shareable message text for recycler location and lot reference.
 */
export function buildLocationShareMessage(options: {
  recyclerName: string;
  lotRef: string;
  destLat: number;
  destLng: number;
  landmark?: string | null;
  language?: "HI" | "MR" | "EN";
}): string {
  const { recyclerName, lotRef, destLat, destLng, landmark, language = "HI" } = options;
  const mapsUrl = `https://maps.google.com/?q=${destLat},${destLng}`;
  const landmarkText = landmark ? ` (${landmark})` : "";

  if (language === "EN") {
    return `E-Waste Saathi Handover Details:\nLot: ${lotRef}\nRecycler: ${recyclerName}${landmarkText}\nLocation: ${mapsUrl}`;
  }
  if (language === "MR") {
    return `कबाडी-वाला डिलिव्हरी माहिती:\nलॉट: ${lotRef}\nखरेदीदार: ${recyclerName}${landmarkText}\nठिकाण: ${mapsUrl}`;
  }
  return `कबाड़ी-वाला डिलीवरी विवरण:\nलॉट: ${lotRef}\nखरीदार: ${recyclerName}${landmarkText}\nलोकेशन: ${mapsUrl}`;
}

/**
 * Check if collector has arrived at recycler facility (GEO G4.5).
 * Threshold is <= 300 meters.
 */
export function checkArrivalProximity(
  userLat: number,
  userLng: number,
  facilityLat: number,
  facilityLng: number
): { arrived: boolean; distanceMeters: number } {
  const distKm = calculateHaversineDistanceKm(userLat, userLng, facilityLat, facilityLng);
  const distanceMeters = Math.round(distKm * 1000);
  return {
    arrived: distanceMeters <= 300,
    distanceMeters,
  };
}
