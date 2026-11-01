import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { rejectUnlessCron } from "@/lib/auth/cron";

export async function POST(req: NextRequest) {
  try {
    const rejected = rejectUnlessCron(req);
    if (rejected) return rejected;

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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

