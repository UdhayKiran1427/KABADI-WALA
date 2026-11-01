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

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const where: any = { collectorId: auth.collector.id };
    if (status) {
      where.status = status;
    }

    const lots = await prisma.lot.findMany({
      where,
      orderBy: { collectedAt: "desc" },
      include: {
        category: { select: { id: true, code: true, nameEn: true, nameHi: true, nameMr: true, iconKey: true } },
        images: true,
        handovers: true,
        payments: true,
      },
    });

    return apiSuccess({
      count: lots.length,
      lots,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

