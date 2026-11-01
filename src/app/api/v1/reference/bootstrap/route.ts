import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(0);

    // Categories (all active)
    const categories = await prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        code: true,
        parentId: true,
        nameEn: true,
        nameHi: true,
        nameMr: true,
        iconKey: true,
        isHazardous: true,
      },
    });

    // Safety topics
    const safetyTopics = await prisma.safetyTopic.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Recent prices (Drift PriceCache)
    const prices = await prisma.pricePoint.findMany({
      where: { recordedAt: { gte: sinceDate } },
      orderBy: { recordedAt: "desc" },
      take: 200,
      select: {
        id: true,
        categoryId: true,
        area: true,
        district: true,
        recordedAt: true,
        buyingPricePaise: true,
        marketLowPaise: true,
        marketHighPaise: true,
      },
    });

    // Recyclers (FULL SNAPSHOT as required - the mobile app replaces its cache)
    const recyclers = await prisma.recycler.findMany({
      where: { authorizationStatus: "VERIFIED" },
      include: {
        rates: { where: { isCurrent: true } },
        serviceAreas: true,
      },
    });

    const recyclerCache = recyclers.map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      authorizationStatus: r.authorizationStatus,
      authorizationValidTill: r.authorizationValidTill,
      pickupAvailable: r.pickupAvailable,
      serviceRadiusKm: r.serviceRadiusKm,
      contactPhone: r.contactPhone,
      minimumWeightGrams: r.minimumWeightGrams,
      pickupChargePaise: r.pickupChargePaise,
    }));

    // RecyclerRateCache (flattened)
    const recyclerRateCache: Array<{ recyclerId: string; categoryId: number; ratePerKgPaise: number }> = [];
    for (const r of recyclers) {
      for (const rate of r.rates) {
        recyclerRateCache.push({
          recyclerId: r.id,
          categoryId: rate.categoryId,
          ratePerKgPaise: rate.ratePerKgPaise,
        });
      }
    }

    // Collection Points (FULL SNAPSHOT)
    const collectionPoints = await prisma.collectionPoint.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Area Centroids
    const areaCentroids = await prisma.areaCentroid.findMany();

    return apiSuccess({
      timestamp: new Date().toISOString(),
      categories,
      safetyTopics,
      prices,
      recyclers: recyclerCache,
      recyclerRates: recyclerRateCache,
      collectionPoints,
      areaCentroids,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

