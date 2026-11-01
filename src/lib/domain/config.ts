/**
 * Flow 1 constants (spec section 12). Same names and values as
 * E_waste/lib/core/config/app_config.dart; change both together.
 */

/** Allowed |declared - actual| as a percentage of declared weight for auto-accept. */
export const WEIGHT_TOLERANCE_PERCENT = 5;
/** SAVED / QUOTED lots with no progress expire after this many days. */
export const LOT_EXPIRY_DAYS = 7;
/** A recycler's rate is locked for the collector for this many hours after selection. */
export const RATE_LOCK_HOURS = 24;
/** Expanding match radii (km). */
export const SEARCH_RADII_KM = [5, 10, 25, 50] as const;
/** Handover GPS within this distance of the recycler counts as a MATCH / NEAR. */
export const GEO_MATCH_M = 300;
export const GEO_NEAR_M = 1000;
/** Price points outside [median * LOW, median * HIGH] are flagged. */
export const PRICE_OUTLIER_LOW = 0.3;
export const PRICE_OUTLIER_HIGH = 3;
export const MIN_WEIGHT_G = 50;
export const MAX_WEIGHT_G = 500_000;
/** Recycler ranking weights; they sum to 1. */
export const RANK_WEIGHTS = { rate: 0.4, distance: 0.3, pickup: 0.1, rating: 0.1, freshness: 0.1 } as const;
