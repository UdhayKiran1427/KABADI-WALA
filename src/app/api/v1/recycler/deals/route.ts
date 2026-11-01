import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";

/**
 * Lots where the collector chose the signed-in recycler (latest 50). Full details: GET /lots/{lotId}/deal.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const lots = await prisma.lot.findMany({
      where: {
        chosenRecyclerId: user.recyclerId,
        status: { in: ["MATCHED", "COMPLETED"] },
        offers: { some: { recyclerId: user.recyclerId, status: "SELECTED" } },
      },
      include: {
        category: { select: { id: true, nameEn: true, nameHi: true, nameMr: true } },
        collector: { include: { user: { select: { phone: true } } } },
        transaction: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return apiSuccess({
      deals: lots.map((lot) => {
        const tx = lot.transaction;
        const rate = tx ? tx.agreedRatePaise ?? tx.quotedRatePerKgPaise : 0;
        return {
          lotId: lot.id,
          lotRef: lot.lotRef,
          material: lot.category,
          approxWeightGrams: lot.approxWeightGrams,
          ratePerKgPaise: rate,
          amountPaise: tx?.finalPricePaise ?? calculateLotValuePaise(rate, lot.approxWeightGrams),
          paymentStatus: tx?.paymentStatus ?? "UNPAID",
          collector: {
            name: lot.collector.name || `Collector ${lot.collector.shortCode}`,
            phone: lot.collector.user.phone,
            area: lot.collector.operatingArea,
          },
          updatedAt: lot.updatedAt,
        };
      }),
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
