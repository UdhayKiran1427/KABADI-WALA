import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";

const PAGE_SIZE = 500;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(0);

    // Pull changed lots for this collector
    const lots = await prisma.lot.findMany({
      where: {
        collectorId: auth.collector.id,
        updatedAt: { gt: sinceDate },
      },
      orderBy: { updatedAt: "asc" },
      take: PAGE_SIZE + 1,
      include: {
        images: true,
        transaction: true,
        handovers: true,
        payments: true,
      },
    });

    const hasMore = lots.length > PAGE_SIZE;
    const paginatedLots = hasMore ? lots.slice(0, PAGE_SIZE) : lots;

    // Pull notifications
    const notifications = await prisma.notification.findMany({
      where: {
        userId: auth.user.userId,
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    // Pull pickup requests
    const pickupRequests = await prisma.pickupRequest.findMany({
      where: {
        collectorId: auth.user.userId,
        updatedAt: { gt: sinceDate },
      },
      orderBy: { updatedAt: "asc" },
      take: 100,
    });

    // Determine latest timestamp for nextSince cursor
    let maxTimestamp = sinceDate.getTime();
    for (const lot of paginatedLots) {
      if (lot.updatedAt.getTime() > maxTimestamp) {
        maxTimestamp = lot.updatedAt.getTime();
      }
    }
    for (const n of notifications) {
      if (n.createdAt.getTime() > maxTimestamp) {
        maxTimestamp = n.createdAt.getTime();
      }
    }
    for (const pr of pickupRequests) {
      if (pr.updatedAt.getTime() > maxTimestamp) {
        maxTimestamp = pr.updatedAt.getTime();
      }
    }

    const nextSince = new Date(maxTimestamp).toISOString();

    return apiSuccess({
      hasMore,
      nextSince,
      lots: paginatedLots,
      notifications,
      pickupRequests,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

