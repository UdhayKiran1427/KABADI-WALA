import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { matchRecyclers, CandidateRecycler } from "@/lib/domain/matching";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const categoryIdStr = url.searchParams.get("categoryId");
    const approxWeightGramsStr = url.searchParams.get("approxWeightGrams");
    const latStr = url.searchParams.get("latitude");
    const lngStr = url.searchParams.get("longitude");
    const pickupRequired = url.searchParams.get("pickupRequired") === "true";

    if (!categoryIdStr || !approxWeightGramsStr || !latStr || !lngStr) {
      return apiError(
        "MISSING_PARAMS",
        "categoryId, approxWeightGrams, latitude, and longitude are required query parameters",
        400
      );
    }

    const categoryId = parseInt(categoryIdStr, 10);
    const approxWeightGrams = parseInt(approxWeightGramsStr, 10);
    const collectorLat = parseFloat(latStr);
    const collectorLng = parseFloat(lngStr);

    if (isNaN(categoryId) || isNaN(approxWeightGrams) || isNaN(collectorLat) || isNaN(collectorLng)) {
      return apiError("INVALID_PARAMS", "Invalid numeric parameters", 400);
    }

    // Fetch all recyclers accepting this category with their active rate & ratings
    const recyclers = await prisma.recycler.findMany({
      include: {
        rates: {
          where: { categoryId, isCurrent: true },
        },
        ratings: {
          select: { rating: true },
        },
      },
    });

    const candidates: CandidateRecycler[] = recyclers.map((r) => {
      const activeRate = r.rates[0];
      const avgRating =
        r.ratings.length > 0
          ? r.ratings.reduce((acc, curr) => acc + curr.rating, 0) / r.ratings.length
          : 4.5; // default 4.5 if no ratings yet

      return {
        id: r.id,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        authorizationStatus: r.authorizationStatus,
        authorizationValidTill: r.authorizationValidTill,
        contactPhone: r.contactPhone,
        pickupAvailable: r.pickupAvailable,
        serviceRadiusKm: r.serviceRadiusKm,
        minimumWeightGrams: r.minimumWeightGrams,
        pickupChargePaise: r.pickupChargePaise,
        ratePerKgPaise: activeRate ? activeRate.ratePerKgPaise : 0,
        rateEffectiveFrom: activeRate ? activeRate.effectiveFrom : new Date(0),
        averageRating: Math.round(avgRating * 10) / 10,
      };
    });

    const result = matchRecyclers(candidates, {
      collectorLat,
      collectorLng,
      categoryId,
      approxWeightGrams,
      pickupRequired,
      now: new Date(),
    });

    return apiSuccess({
      searchRadiusKm: result.searchRadiusKm,
      totalFound: result.totalFound,
      recyclers: result.recyclers,
      exclusions: result.exclusions,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

