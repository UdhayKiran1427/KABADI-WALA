import { prisma } from "@/lib/prisma";
import { apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { generateCategoryPriceBoard } from "@/lib/domain/priceBoard";
import { groupValues } from "@/lib/collections";

/** Hard cap per window so a flood of price reports cannot make the board slow. */
const MAX_BOARD_PRICE_ROWS = 5000;

export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const categories = await prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    const categoryIds = categories.map((c) => c.id);

    // Three queries for the whole board (was 3 per category), grouped in memory by category.
    const [recentRows, priorRows, rateRows] = await Promise.all([
      prisma.pricePoint.findMany({
        where: { categoryId: { in: categoryIds }, recordedAt: { gte: sevenDaysAgo } },
        select: { categoryId: true, buyingPricePaise: true },
        take: MAX_BOARD_PRICE_ROWS,
        orderBy: { recordedAt: "desc" },
      }),
      prisma.pricePoint.findMany({
        where: { categoryId: { in: categoryIds }, recordedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        select: { categoryId: true, buyingPricePaise: true },
        take: MAX_BOARD_PRICE_ROWS,
        orderBy: { recordedAt: "desc" },
      }),
      prisma.recyclerRate.findMany({
        where: { categoryId: { in: categoryIds }, isCurrent: true, recycler: { authorizationStatus: "VERIFIED" } },
        select: { categoryId: true, ratePerKgPaise: true },
      }),
    ]);
    const recentBy = groupValues(recentRows, (r) => r.categoryId, (r) => r.buyingPricePaise);
    const priorBy = groupValues(priorRows, (r) => r.categoryId, (r) => r.buyingPricePaise);
    const ratesBy = groupValues(rateRows, (r) => r.categoryId, (r) => r.ratePerKgPaise);

    const board = categories.map((cat) => {
      const stats = generateCategoryPriceBoard(cat.id, recentBy.get(cat.id) ?? [], priorBy.get(cat.id) ?? [], ratesBy.get(cat.id) ?? []);
      return {
        categoryId: cat.id,
        code: cat.code,
        nameEn: cat.nameEn,
        nameHi: cat.nameHi,
        nameMr: cat.nameMr,
        iconKey: cat.iconKey,
        currentMedianPaise: stats.currentMedianPaise,
        currentMedianRupees: (stats.currentMedianPaise / 100).toFixed(2),
        trend: stats.trend,
        marketLowPaise: stats.marketLowPaise,
        marketHighPaise: stats.marketHighPaise,
        recyclerMinRatePaise: stats.recyclerMinRatePaise,
        recyclerMaxRatePaise: stats.recyclerMaxRatePaise,
      };
    });

    const res = apiSuccess({
      updatedAt: now.toISOString(),
      board,
    });
    // Public, read-heavy and changes slowly: let the CDN / browser reuse it briefly.
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (err) {
    return apiErrorFrom(err);
  }
}

