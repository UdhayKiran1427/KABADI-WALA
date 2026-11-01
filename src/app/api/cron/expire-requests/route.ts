import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { rejectUnlessCron } from "@/lib/auth/cron";

export async function POST(req: NextRequest) {
  try {
    const rejected = rejectUnlessCron(req);
    if (rejected) return rejected;

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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

