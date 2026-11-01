import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      include: {
        collector: true,
      },
    });

    if (!user || !user.collector) {
      return apiError("NOT_FOUND", "Collector profile not found", 404);
    }

    return apiSuccess({
      collectorId: user.collector.id,
      userId: user.id,
      phone: user.phone,
      shortCode: user.collector.shortCode,
      preferredLanguage: user.collector.preferredLanguage,
      operatingArea: user.collector.operatingArea,
      district: user.collector.district,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

