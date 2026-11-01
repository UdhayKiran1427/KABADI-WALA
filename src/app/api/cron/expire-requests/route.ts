import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

const CRON_SECRET = process.env.CRON_SECRET || "platform-cron-secret-token-for-maintenance-tasks";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return apiError("UNAUTHORIZED", "Invalid cron authorization header", 401);
    }

    const now = new Date();

    // 1. Expire unaccepted pickup requests older than 24 hours
    const expiredPickups = await prisma.pickupRequest.updateMany({
      where: {
        status: "REQUESTED",
        expiresAt: { lt: now },
      },
      data: {
        status: "EXPIRED",
        updatedAt: now,
      },
    });

    // 2. Expire stale lots that have been in READY or MATCHED state for over 30 days without activity
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expiredLots = await prisma.lot.updateMany({
      where: {
        status: { in: ["READY", "MATCHED"] },
        updatedAt: { lt: thirtyDaysAgo },
      },
      data: {
        status: "EXPIRED",
        updatedAt: now,
      },
    });

    return apiSuccess({
      executedAt: now.toISOString(),
      expiredPickupsCount: expiredPickups.count,
      expiredLotsCount: expiredLots.count,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

