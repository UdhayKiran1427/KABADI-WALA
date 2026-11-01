import type { Prisma } from "@prisma/client";
import { HistoryQuery, periodStart } from "../historyFilters";

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Lots that contain the material: as their main category or as any of their items. */
function materialFilter(material: string): Prisma.LotWhereInput | undefined {
  if (!material) return undefined;
  const categoryId = Number(material);
  return { OR: [{ categoryId }, { items: { some: { categoryId } } }] };
}

/** Collector history status filters: finding = DRAFT/READY, topay = MATCHED, paid = COMPLETED. */
export const COLLECTOR_HISTORY_STATUSES: Record<string, Prisma.LotWhereInput["status"]> = {
  finding: { in: ["DRAFT", "READY"] },
  topay: "MATCHED",
  paid: "COMPLETED",
};

/** Recycler history status filters: topay = MATCHED, paid = COMPLETED. */
export const RECYCLER_HISTORY_STATUSES: Record<string, Prisma.LotWhereInput["status"]> = {
  topay: "MATCHED",
  paid: "COMPLETED",
};

/**
 * A collector's lots, filtered. Search matches lot ref, material name or buyer (recycler) name.
 */
export function collectorHistoryWhere(collectorId: string, filters: HistoryQuery): Prisma.LotWhereInput {
  const where: Prisma.LotWhereInput = { collectorId };
  if (filters.status) where.status = COLLECTOR_HISTORY_STATUSES[filters.status];
  const material = materialFilter(filters.material);
  const since = periodStart(filters.period);
  if (since) where.collectedAt = { gte: since };
  const and: Prisma.LotWhereInput[] = material ? [material] : [];
  if (filters.q) {
    const c = contains(filters.q);
    const names = { OR: [{ nameEn: c }, { nameHi: c }, { nameMr: c }] };
    and.push({
      OR: [
        { lotRef: c },
        { category: { is: names } },
        { items: { some: { category: { is: names } } } },
        { transaction: { is: { recycler: { is: { name: c } } } } },
      ],
    });
  }
  if (and.length) where.AND = and;
  return where;
}

/**
 * Lots a recycler bought (collector selected them), filtered.
 * Search matches lot ref, collector name, collector phone or material name.
 */
export function recyclerHistoryWhere(recyclerId: string, filters: HistoryQuery): Prisma.LotWhereInput {
  const where: Prisma.LotWhereInput = {
    chosenRecyclerId: recyclerId,
    status: filters.status ? RECYCLER_HISTORY_STATUSES[filters.status] : { in: ["MATCHED", "COMPLETED"] },
    offers: { some: { recyclerId, status: "SELECTED" } },
  };
  const material = materialFilter(filters.material);
  const since = periodStart(filters.period);
  if (since) where.transaction = { is: { createdAt: { gte: since } } };
  const and: Prisma.LotWhereInput[] = material ? [material] : [];
  if (filters.q) {
    const c = contains(filters.q);
    and.push({
      OR: [
        { lotRef: c },
        { collector: { is: { name: c } } },
        { collector: { is: { user: { is: { phone: c } } } } },
        { category: { is: { nameEn: c } } },
        { items: { some: { category: { is: { nameEn: c } } } } },
      ],
    });
  }
  if (and.length) where.AND = and;
  return where;
}
