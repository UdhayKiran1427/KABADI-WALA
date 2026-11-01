import { prisma } from "@/lib/prisma";

/** Rating shown for a recycler that has no ratings yet. */
export const DEFAULT_RECYCLER_RATING = 4.5;

/**
 * Average rating per recycler, computed by the database (one groupBy) instead of loading every rating row.
 * Recyclers without ratings are absent from the map; use `ratingOf` to read with the default.
 */
export async function getAverageRatings(recyclerIds?: string[]): Promise<Map<string, number>> {
  const rows = await prisma.recyclerRating.groupBy({
    by: ["recyclerId"],
    where: recyclerIds ? { recyclerId: { in: recyclerIds } } : undefined,
    _avg: { rating: true },
  });
  return new Map(rows.filter((r) => r._avg.rating !== null).map((r) => [r.recyclerId, r._avg.rating as number]));
}

export function ratingOf(averages: Map<string, number>, recyclerId: string): number {
  return Math.round((averages.get(recyclerId) ?? DEFAULT_RECYCLER_RATING) * 10) / 10;
}
