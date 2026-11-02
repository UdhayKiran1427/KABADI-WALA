import { lotItemsOf } from "@/lib/services/lotItemsView";
import { lotPickupOf } from "@/lib/services/vehicleService";
import type { LotPickup } from "./ui";

type LotRow = Parameters<typeof lotItemsOf>[0] & Parameters<typeof lotPickupOf>[0];

/** Pickup line data for a collector's lot row; lists the materials once the vehicle has taken them. */
export function collectorLotPickup(lot: LotRow): LotPickup | null {
  const pickup = lotPickupOf(lot);
  if (!pickup) return null;
  const { status, vehicleNumber } = pickup;
  if (status !== "PICKED_UP") return { status, vehicleNumber };
  const materials = lotItemsOf(lot).map((i) => ({
    hi: i.category.nameHi,
    en: i.category.nameEn,
    mr: i.category.nameMr,
    grams: i.weightGrams,
  }));
  return { status, vehicleNumber, materials };
}
