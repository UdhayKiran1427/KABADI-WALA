import { LOT_EXPIRY_DAYS, RATE_LOCK_HOURS, WEIGHT_TOLERANCE_PERCENT } from "./config";

/**
 * The one amount formula (spec section 2): round(grams * ratePerKgPaise / 1000), half up, integer math.
 * Mirror of `finalPrice` in E_waste/lib/core/utils/weight_rules.dart.
 */
export function amountPaise(grams: number, ratePerKgPaise: number): number {
  const product = grams * ratePerKgPaise;
  if (!Number.isInteger(grams) || !Number.isInteger(ratePerKgPaise) || !Number.isSafeInteger(product)) {
    throw new RangeError(`amountPaise needs integer inputs (grams=${grams}, ratePerKgPaise=${ratePerKgPaise})`);
  }
  return Math.floor((product + 500) / 1000);
}

/** Net amount shown to the collector: amount minus the recycler's pickup charge (0 for SELF_DROP). */
export function netAmountPaise(amount: number, pickupChargePaise: number): number {
  return amount - Math.max(0, pickupChargePaise);
}

/**
 * Weight tolerance, integer math only (spec section 4):
 * WITHIN when |declared - actual| * 100 <= declared * tolerancePercent.
 */
export function isWithinTolerance(
  declaredGrams: number,
  actualGrams: number,
  tolerancePercent: number = WEIGHT_TOLERANCE_PERCENT
): boolean {
  if (declaredGrams <= 0) return actualGrams === declaredGrams;
  return Math.abs(declaredGrams - actualGrams) * 100 <= declaredGrams * tolerancePercent;
}

/** When a rate chosen at `lockedAt` stops being locked for the collector. */
export function rateLockExpiresAt(lockedAt: Date, lockHours: number = RATE_LOCK_HOURS): Date {
  return new Date(lockedAt.getTime() + lockHours * 3_600_000);
}

export function isRateLockActive(lockedAt: Date, now: Date = new Date(), lockHours: number = RATE_LOCK_HOURS): boolean {
  return now.getTime() < rateLockExpiresAt(lockedAt, lockHours).getTime();
}

/** When a SAVED / QUOTED lot that saw no progress since `lastActivityAt` expires. */
export function lotExpiresAt(lastActivityAt: Date, expiryDays: number = LOT_EXPIRY_DAYS): Date {
  return new Date(lastActivityAt.getTime() + expiryDays * 86_400_000);
}

/**
 * The first usable rate (> 0) from an ordered list of locked-rate sources, or null.
 * Never substitute a made-up rate: with null the UI says "price not available" (spec s2).
 */
export function firstPositiveRate(...rates: Array<number | null | undefined>): number | null {
  for (const r of rates) if (typeof r === "number" && Number.isInteger(r) && r > 0) return r;
  return null;
}
