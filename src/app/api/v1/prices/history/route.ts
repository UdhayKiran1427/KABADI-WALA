import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const categoryIdStr = url.searchParams.get("categoryId");
    const daysStr = url.searchParams.get("days") || "30";

    const parsedDays = parseInt(daysStr, 10);
    const days = isNaN(parsedDays) ? 30 : Math.min(90, Math.max(7, parsedDays));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Prisma.PricePointWhereInput = {
      recordedAt: { gte: cutoff },
    };
    if (categoryIdStr) {
      const parsedCatId = parseInt(categoryIdStr, 10);
      if (isNaN(parsedCatId)) {
        return apiError("INVALID_PARAMS", "categoryId must be a valid integer", 400);
      }
      where.categoryId = parsedCatId;
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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

