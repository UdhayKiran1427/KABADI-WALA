import type { LotItem, MaterialCategory } from "@prisma/client";
import { getImageUrl } from "../storage";
import type { PricedLotItem } from "../domain/lotItems";
import { calculateLotValuePaise } from "../domain/lotBroadcast";

export type MaterialNames = Pick<MaterialCategory, "id" | "nameEn" | "nameHi" | "nameMr">;
export type LotItemView = PricedLotItem & { category: MaterialNames };

/** Prisma `include` that loads a lot's items with their material names. */
export const LOT_ITEMS_INCLUDE = { items: { include: { category: true } } } as const;

interface LotLike {
  categoryId: number;
  approxWeightGrams: number;
  listedRatePerKgPaise: number | null;
  quotedRatePaise?: number | null;
  category: MaterialNames;
  items?: Array<LotItem & { category: MaterialNames }>;
}

/**
 * The materials of a lot, heaviest first. Lots created before multi-material support
 * have no LotItem rows, so their single category/weight is returned as one item.
 */
export function lotItemsOf(lot: LotLike): LotItemView[] {
  if (lot.items && lot.items.length > 0) {
    return [...lot.items]
      .sort((a, b) => b.weightGrams - a.weightGrams)
      .map((i) => ({ categoryId: i.categoryId, weightGrams: i.weightGrams, listedRatePerKgPaise: i.listedRatePerKgPaise, category: i.category }));
  }
  return [
    {
      categoryId: lot.categoryId,
      weightGrams: lot.approxWeightGrams,
      listedRatePerKgPaise: lot.listedRatePerKgPaise ?? lot.quotedRatePaise ?? 0,
      category: lot.category,
    },
  ];
}

/** Short English label, e.g. "PCB 5 kg + Wires 2 kg". */
export function lotItemsLabel(items: LotItemView[]): string {
  return items.map((i) => `${i.category.nameEn} ${(i.weightGrams / 1000).toFixed(1)} kg`).join(" + ");
}

/** Display URLs for a lot's photos. */
export async function lotPhotoUrls(images: Array<{ id: string; storageKey: string }>): Promise<Array<{ id: string; url: string }>> {
  return Promise.all(images.map(async (img) => ({ id: img.id, url: await getImageUrl(img.storageKey) })));
}

/**
 * Lines of a deal: each material with its agreed rate and amount.
 * Uses the transaction's per-material rates; older deals had one rate for the whole lot.
 */
export function dealLines(
  items: LotItemView[],
  tx: { itemRates: Array<{ categoryId: number; ratePerKgPaise: number }>; agreedRatePaise: number | null; quotedRatePerKgPaise: number }
) {
  return items.map((item) => {
    const ratePerKgPaise =
      tx.itemRates.find((r) => r.categoryId === item.categoryId)?.ratePerKgPaise ??
      (items.length === 1 ? tx.agreedRatePaise ?? tx.quotedRatePerKgPaise : item.listedRatePerKgPaise);
    return { ...item, ratePerKgPaise, amountPaise: calculateLotValuePaise(ratePerKgPaise, item.weightGrams) };
  });
}
