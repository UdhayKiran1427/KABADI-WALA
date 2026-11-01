import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
import { calculateEstimate } from "@/lib/domain/estimates";
import { z } from "zod";

const EstimateSchema = z.object({
  categoryId: z.number().int().positive(),
  approxWeightGrams: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { body, response: bodyError } = await parseBody(req, EstimateSchema);
    if (bodyError) return bodyError;

    const { categoryId, approxWeightGrams } = body;

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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

