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

    // Expire recyclers whose validity date has passed
    const expiredRecyclers = await prisma.recycler.updateMany({
      where: {
        authorizationStatus: "VERIFIED",
        authorizationValidTill: { lt: now },
      },
      data: {
        authorizationStatus: "EXPIRED",
        updatedAt: now,
      },
    });

    return apiSuccess({
      executedAt: now.toISOString(),
      expiredRecyclersCount: expiredRecyclers.count,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

