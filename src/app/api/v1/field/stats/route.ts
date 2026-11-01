import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || (auth.role !== "FIELD_AGENT" && auth.role !== "ADMIN")) {
      return apiError("UNAUTHORIZED", "Field agent or admin authorization required", 401);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const isAgent = auth.role === "FIELD_AGENT";
    const agentFilter = isAgent ? { recordedById: auth.userId } : {};
    const agentCollectorFilter = isAgent ? { onboardedById: auth.userId } : {};
    const agentSampleFilter = isAgent ? { capturedById: auth.userId } : {};

    const [
      totalCollectors,
      todayCollectors,
      totalPrices,
      todayPrices,
      totalSamples,
      todaySamples,
    ] = await Promise.all([
      prisma.collector.count({ where: agentCollectorFilter }),
      prisma.collector.count({
        where: {
          ...agentCollectorFilter,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.pricePoint.count({ where: agentFilter }),
      prisma.pricePoint.count({
        where: {
          ...agentFilter,
          recordedAt: { gte: startOfToday },
        },
      }),
      prisma.trainingSample.count({ where: agentSampleFilter }),
      prisma.trainingSample.count({
        where: {
          ...agentSampleFilter,
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    return apiSuccess({
      agent: {
        userId: auth.userId,
        phone: auth.phone,
        role: auth.role,
      },
      stats: {
        totalCollectorsOnboarded: totalCollectors,
        collectorsOnboardedToday: todayCollectors,
        totalPricesLogged: totalPrices,
        pricesLoggedToday: todayPrices,
        totalTrainingPhotos: totalSamples,
        trainingPhotosToday: todaySamples,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}
