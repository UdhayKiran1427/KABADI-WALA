import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { matchRecyclers, type CandidateRecycler } from "@/lib/domain/matching";
import { getAverageRatings, ratingOf } from "@/lib/services/ratingService";

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
    const [recyclers, averages] = await Promise.all([
      prisma.recycler.findMany({
        include: { rates: { where: { categoryId, isCurrent: true } } },
      }),
      getAverageRatings(), // one groupBy instead of loading every rating row
    ]);

    const candidates: CandidateRecycler[] = recyclers.map((r) => {
      const activeRate = r.rates[0];

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
        averageRating: ratingOf(averages, r.id),
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

