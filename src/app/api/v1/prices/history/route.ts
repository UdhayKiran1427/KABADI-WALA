import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const categoryIdStr = url.searchParams.get("categoryId");
    const daysStr = url.searchParams.get("days") || "30";

    const days = Math.min(90, Math.max(7, parseInt(daysStr, 10)));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      recordedAt: { gte: cutoff },
    };
    if (categoryIdStr) {
      where.categoryId = parseInt(categoryIdStr, 10);
    }

    const prices = await prisma.pricePoint.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      select: {
        id: true,
        categoryId: true,
        area: true,
        district: true,
        recordedAt: true,
        buyingPricePaise: true,
        marketLowPaise: true,
        marketHighPaise: true,
        buyerType: true,
      },
    });

    return apiSuccess({
      days,
      count: prices.length,
      history: prices,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

