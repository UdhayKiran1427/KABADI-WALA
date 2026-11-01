/**
 * Pure domain logic: Privacy, data anonymization and coordinate rounding (~100m).
 *
 * Privacy rules:
 * - Never store collector name, address, or ID documents.
 * - Analytics locations are rounded to ~100m (3 decimal places).
 * - Only transaction keeps exact points.
 * - Respects "don't save my exact location" consent flag.
 * - Public receipts expose no phone numbers.
 */

/**
 * Rounds a coordinate to ~100 meters (3 decimal places ~ 111m at the equator).
 */
export function roundCoordinateTo100m(coord: number | null | undefined): number | null {
  if (coord === null || coord === undefined || isNaN(coord)) return null;
  return Math.round(coord * 1000) / 1000;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 5) return "****";
  return phone.slice(0, 2) + "******" + phone.slice(-2);
}

export interface PublicReceiptLot {
  lotRef: string;
  categoryName: string;
  weightKg: string;
  finalPriceRupees: string;
  confirmedAt: string;
  recyclerName: string;
  authorizationNo: string;
}

export function buildPublicReceipt(
  lotRef: string,
  categoryName: string,
  weightGrams: number,
  finalPricePaise: number,
  confirmedAt: Date,
  recyclerName: string,
  authorizationNo: string
): PublicReceiptLot {
  return {
    lotRef,
    categoryName,
    weightKg: (weightGrams / 1000).toFixed(2),
    finalPriceRupees: `₹${(finalPricePaise / 100).toFixed(2)}`,
    confirmedAt: confirmedAt.toISOString(),
    recyclerName,
    authorizationNo,
  };
}

