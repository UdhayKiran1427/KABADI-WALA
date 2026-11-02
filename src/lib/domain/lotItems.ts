import { calculateLotValuePaise } from "./lotBroadcast";

export interface LotItemInput {
  categoryId: number;
  weightGrams: number;
}

export interface PricedLotItem extends LotItemInput {
  listedRatePerKgPaise: number;
}

export interface ItemRate {
  categoryId: number;
  ratePerKgPaise: number;
}

export const MAX_LOT_ITEMS = 10;
export const MAX_ITEM_WEIGHT_GRAMS = 10_000_000; // 10 tonnes

/**
 * Merges repeated materials (adds their weights) and drops empty rows.
 * Returns an error message when the list is unusable.
 */
export function normalizeLotItems(items: LotItemInput[]): { items: LotItemInput[] } | { error: string } {
  const merged = new Map<number, number>();
  for (const item of items) {
    if (!Number.isInteger(item.categoryId) || item.categoryId <= 0) return { error: "Unknown material" };
    if (!Number.isFinite(item.weightGrams) || item.weightGrams <= 0) continue;
    merged.set(item.categoryId, (merged.get(item.categoryId) ?? 0) + Math.round(item.weightGrams));
  }

  const result = [...merged.entries()].map(([categoryId, weightGrams]) => ({ categoryId, weightGrams }));
  if (result.length === 0) return { error: "Add at least one material with its weight" };
  if (result.length > MAX_LOT_ITEMS) return { error: `A lot can have at most ${MAX_LOT_ITEMS} materials` };
  if (result.some((i) => i.weightGrams > MAX_ITEM_WEIGHT_GRAMS)) return { error: "Weight is too large" };
  return { items: result };
}

/** Total value of a lot at the given per-material rates (falls back to the listed rate). */
export function lotValuePaise(items: PricedLotItem[], rates?: ItemRate[]): number {
  return items.reduce((sum, item) => {
    const rate = rates?.find((r) => r.categoryId === item.categoryId)?.ratePerKgPaise ?? item.listedRatePerKgPaise;
    return sum + calculateLotValuePaise(rate, item.weightGrams);
  }, 0);
}

export function totalWeightGrams(items: LotItemInput[]): number {
  return items.reduce((sum, i) => sum + i.weightGrams, 0);
}

/** The heaviest material; stored as the lot's main category. */
export function primaryItem<T extends LotItemInput>(items: T[]): T {
  return items.reduce((best, i) => (i.weightGrams > best.weightGrams ? i : best), items[0]);
}

/** Average rate per kg for a total value and weight (used for single-rate fields). */
export function averageRatePerKgPaise(totalPaise: number, weightGrams: number): number {
  return weightGrams > 0 ? Math.round((totalPaise * 1000) / weightGrams) : 0;
}

/**
 * Builds a complete, valid rate list for every item of a lot from what a recycler sent.
 * Missing materials get `fallbackRatePerKgPaise` if given, otherwise their listed rate.
 */
export function completeItemRates(
  items: PricedLotItem[],
  sent: ItemRate[],
  fallbackRatePerKgPaise?: number
): { rates: ItemRate[] } | { error: string } {
  const rates: ItemRate[] = [];
  for (const item of items) {
    const rate =
      sent.find((r) => r.categoryId === item.categoryId)?.ratePerKgPaise ?? fallbackRatePerKgPaise ?? item.listedRatePerKgPaise;
    if (!Number.isInteger(rate) || rate <= 0 || rate > 10_000_000) {
      return { error: "Please enter a valid buying rate in ₹/kg for every material" };
    }
    rates.push({ categoryId: item.categoryId, ratePerKgPaise: rate });
  }
  return { rates };
}

export const MAX_ASKING_PRICE_PAISE = 10_000_000_00; // ₹1 crore

/** Collector's own price for the whole lot: a whole number of paise, or null when not given. */
export function parseAskingPricePaise(rupees: unknown): { paise: number | null } | { error: string } {
  if (rupees === undefined || rupees === null || rupees === "") return { paise: null };
  const value = typeof rupees === "number" ? rupees : parseFloat(String(rupees));
  if (!Number.isFinite(value) || value <= 0) return { error: "Enter your selling price in ₹, or leave it blank" };
  const paise = Math.round(value * 100);
  if (paise > MAX_ASKING_PRICE_PAISE) return { error: "Selling price is too large" };
  return { paise };
}

/**
 * Per-material rates (paise/kg) that add up to the collector's asking price, keeping the listed
 * rates' proportions. Used to pre-fill a recycler's offer; without an asking price, the listed rates.
 */
export function askingItemRates(items: PricedLotItem[], askingPricePaise: number | null): ItemRate[] {
  const listedTotal = lotValuePaise(items);
  if (!askingPricePaise || listedTotal <= 0) {
    return items.map((i) => ({ categoryId: i.categoryId, ratePerKgPaise: i.listedRatePerKgPaise }));
  }
  const factor = askingPricePaise / listedTotal;
  return items.map((i) => ({ categoryId: i.categoryId, ratePerKgPaise: Math.max(1, Math.round(i.listedRatePerKgPaise * factor)) }));
}
