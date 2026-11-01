/** Latitude/longitude bounding box around a point; a cheap database prefilter before exact Haversine (spec s6). */
export interface GeoBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const KM_PER_DEGREE_LAT = 111.32;

/**
 * Box that contains every point within `radiusKm` of (lat, lng). Slightly generous, never too small.
 * Near the poles or the antimeridian it widens to the full longitude range instead of wrapping.
 */
export function boundingBox(lat: number, lng: number, radiusKm: number): GeoBox {
  const dLat = radiusKm / KM_PER_DEGREE_LAT;
  const cos = Math.cos((Math.min(Math.abs(lat), 89) * Math.PI) / 180);
  const dLng = radiusKm / (KM_PER_DEGREE_LAT * Math.max(cos, 0.01));
  const minLng = lng - dLng;
  const maxLng = lng + dLng;
  const wraps = minLng < -180 || maxLng > 180;
  return {
    minLat: Math.max(-90, lat - dLat),
    maxLat: Math.min(90, lat + dLat),
    minLng: wraps ? -180 : minLng,
    maxLng: wraps ? 180 : maxLng,
  };
}
