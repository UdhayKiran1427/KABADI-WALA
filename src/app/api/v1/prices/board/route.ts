import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { generateCategoryPriceBoard } from "@/lib/domain/priceBoard";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const categories = await prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    const board = await Promise.all(
      categories.map(async (cat) => {
        // Last 7 days prices
        const recentPrices = await prisma.pricePoint.findMany({
          where: { categoryId: cat.id, recordedAt: { gte: sevenDaysAgo } },
          select: { buyingPricePaise: true },
        });

        // 7 to 14 days ago prices
        const priorPrices = await prisma.pricePoint.findMany({
          where: {
            categoryId: cat.id,
            recordedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
          select: { buyingPricePaise: true },
        });

        // Current active recycler rates
        const recyclerRates = await prisma.recyclerRate.findMany({
          where: {
            categoryId: cat.id,
            isCurrent: true,
            recycler: { authorizationStatus: "VERIFIED" },
          },
          select: { ratePerKgPaise: true },
        });

        const stats = generateCategoryPriceBoard(
          cat.id,
          recentPrices.map((p) => p.buyingPricePaise),
          priorPrices.map((p) => p.buyingPricePaise),
          recyclerRates.map((r) => r.ratePerKgPaise)
        );

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
      })
    );

    return apiSuccess({
      updatedAt: now.toISOString(),
      board,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

