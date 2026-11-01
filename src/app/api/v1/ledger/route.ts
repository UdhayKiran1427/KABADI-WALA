import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { LEDGER_MAX_LOTS } from "@/lib/limits";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    // 1. All lots for this collector
    const lots = await prisma.lot.findMany({
      where: { collectorId: auth.collector.id },
      include: {
        payments: true,
        transaction: { include: { recycler: { select: { name: true } } } },
        category: { select: { nameEn: true, nameHi: true, iconKey: true } },
      },
      orderBy: { collectedAt: "desc" },
      take: LEDGER_MAX_LOTS, // safety ceiling; `truncated` tells the app when it was hit
    });

    let totalReceivedPaise = 0;
    let totalPendingPaise = 0;

    const items = lots.map((lot) => {
      // Sum received payments
      const lotPaidPaise = lot.payments.reduce((acc, p) => acc + p.amountPaise, 0);
      totalReceivedPaise += lotPaidPaise;

      // Determine due amount
      const targetPrice = lot.finalPricePaise || lot.estimatedValuePaise || 0;
      let lotPendingPaise = 0;

      if (lot.status === "COMPLETED" || lot.status === "HANDED_OVER" || lot.status === "MATCHED") {
        lotPendingPaise = Math.max(0, targetPrice - lotPaidPaise);
        totalPendingPaise += lotPendingPaise;
      }

      return {
        lotId: lot.id,
        lotRef: lot.lotRef,
        categoryName: lot.category.nameEn,
        categoryNameHi: lot.category.nameHi,
        status: lot.status,
        approxWeightGrams: lot.approxWeightGrams,
        finalPricePaise: lot.finalPricePaise,
        paidPaise: lotPaidPaise,
        pendingPaise: lotPendingPaise,
        paymentStatus: lot.paymentStatus,
        recyclerName: lot.transaction?.recycler?.name || null,
        payments: lot.payments.map((p) => ({
          id: p.id,
          amountPaise: p.amountPaise,
          method: p.method,
          paidAt: p.paidAt,
          confirmedByCollector: p.confirmedByCollector,
        })),
      };
    });

    return apiSuccess({
      receivedPaise: totalReceivedPaise,
      receivedRupees: (totalReceivedPaise / 100).toFixed(2),
      pendingPaise: totalPendingPaise,
      pendingRupees: (totalPendingPaise / 100).toFixed(2),
      totalLots: lots.length,
      truncated: lots.length === LEDGER_MAX_LOTS,
      items,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

