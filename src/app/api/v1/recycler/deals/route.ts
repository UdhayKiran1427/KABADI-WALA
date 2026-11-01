import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { LOT_ITEMS_INCLUDE, dealLines, lotItemsOf } from "@/lib/services/lotItemsView";
import { parseHistoryQuery } from "@/lib/historyFilters";
import { RECYCLER_HISTORY_STATUSES, recyclerHistoryWhere } from "@/lib/services/historyQuery";

/**
 * Order history: lots where the collector chose the signed-in recycler (latest 100). Full details: GET /lots/{lotId}/deal.
 * Filters: q (collector name/phone, lot ref, material), status (topay | paid), material (category id), period (7d | 30d | 90d).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const lots = await prisma.lot.findMany({
      where: recyclerHistoryWhere(
        user.recyclerId,
        parseHistoryQuery(Object.fromEntries(req.nextUrl.searchParams), Object.keys(RECYCLER_HISTORY_STATUSES))
      ),
      include: {
        category: { select: { id: true, nameEn: true, nameHi: true, nameMr: true } },
        ...LOT_ITEMS_INCLUDE,
        collector: { include: { user: { select: { phone: true } } } },
        transaction: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return apiSuccess({
      deals: lots.map((lot) => {
        const tx = lot.transaction;
        return {
          lotId: lot.id,
          lotRef: lot.lotRef,
          material: lot.category,
          items: tx
            ? dealLines(lotItemsOf(lot), tx).map((i) => ({
                categoryId: i.categoryId,
                nameEn: i.category.nameEn,
                weightGrams: i.weightGrams,
                ratePerKgPaise: i.ratePerKgPaise,
                amountPaise: i.amountPaise,
              }))
            : [],
          approxWeightGrams: lot.approxWeightGrams,
          ratePerKgPaise: tx ? tx.agreedRatePaise ?? tx.quotedRatePerKgPaise : 0,
          amountPaise: tx ? tx.finalPricePaise ?? tx.quotedPricePaise : 0,
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
