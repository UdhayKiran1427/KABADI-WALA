import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { calculateEstimate } from "@/lib/domain/estimates";
import { z } from "zod";

const EstimateSchema = z.object({
  categoryId: z.number().int().positive(),
  approxWeightGrams: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EstimateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { categoryId, approxWeightGrams } = parsed.data;

    // Fetch last 30 days prices for this category
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const priceRecords = await prisma.pricePoint.findMany({
      where: { categoryId, recordedAt: { gte: thirtyDaysAgo } },
      select: { buyingPricePaise: true, recordedAt: true },
    });

    // Fetch active recycler rates for this category
    const recyclerRates = await prisma.recyclerRate.findMany({
      where: {
        categoryId,
        isCurrent: true,
        recycler: { authorizationStatus: "VERIFIED" },
      },
      select: { ratePerKgPaise: true, isCurrent: true },
    });

    const result = calculateEstimate(
      priceRecords,
      recyclerRates,
      approxWeightGrams,
      new Date()
    );

    return apiSuccess({
      categoryId,
      approxWeightGrams,
      medianRatePaisePerKg: result.medianRatePaisePerKg,
      minRatePaisePerKg: result.minRatePaisePerKg,
      maxRatePaisePerKg: result.maxRatePaisePerKg,
      estimatedValuePaise: result.estimatedValuePaise,
      estimatedMinPaise: result.estimatedMinPaise,
      estimatedMaxPaise: result.estimatedMaxPaise,
      source: result.source,
      formatted: {
        ratePerKg: `₹${(result.medianRatePaisePerKg / 100).toFixed(2)}/kg`,
        estimate: `₹${(result.estimatedValuePaise / 100).toFixed(0)}`,
        range: `₹${(result.estimatedMinPaise / 100).toFixed(0)} – ₹${(result.estimatedMaxPaise / 100).toFixed(0)}`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

