import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        category: true,
        collector: true,
        transaction: {
          include: {
            recycler: {
              select: {
                id: true,
                name: true,
                contactPhone: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    if (!lot.transaction) {
      return apiError("NO_TRANSACTION", "This lot has no matched recycler transaction yet", 400);
    }

    const tx = lot.transaction;
    const isCollector = auth.collectorId && auth.collectorId === lot.collectorId;
    const isRecycler = auth.recyclerId && auth.recyclerId === tx.recyclerId;
    const isAdmin = auth.role === "ADMIN";

    if (!isCollector && !isRecycler && !isAdmin) {
      return apiError("FORBIDDEN", "You are not a participant in this transaction", 403);
    }

    const callerRole = isCollector ? "COLLECTOR" : isRecycler ? "RECYCLER" : "ADMIN";

    // canAccept if pending offer was made by the other party
    const canAccept =
      (tx.bargainStatus === "OFFER_BY_RECYCLER" && (isCollector || isAdmin)) ||
      (tx.bargainStatus === "OFFER_BY_COLLECTOR" && (isRecycler || isAdmin));

    const canCounter = tx.bargainStatus !== "AGREED" && tx.status !== "PAID" && tx.status !== "CANCELLED";

    return apiSuccess({
      lotId: lot.id,
      lotRef: lot.lotRef,
      category: lot.category.nameEn,
      approxWeightGrams: lot.approxWeightGrams,
      weightKg: (lot.approxWeightGrams / 1000).toFixed(2),
      transactionId: tx.id,
      transactionStatus: tx.status,
      quotedRatePerKgPaise: tx.quotedRatePerKgPaise,
      quotedRatePerKgRupees: tx.quotedRatePerKgPaise / 100,
      quotedPricePaise: tx.quotedPricePaise,
      quotedPriceRupees: tx.quotedPricePaise / 100,
      bargainStatus: tx.bargainStatus || "NONE",
      bargainRatePaise: tx.bargainRatePaise,
      bargainRateRupees: tx.bargainRatePaise ? tx.bargainRatePaise / 100 : null,
      bargainBy: tx.bargainBy,
      bargainNote: tx.bargainNote,
      agreedRatePaise: tx.agreedRatePaise,
      agreedRateRupees: tx.agreedRatePaise ? tx.agreedRatePaise / 100 : null,
      callerRole,
      canAccept,
      canCounter,
      recycler: tx.recycler,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
