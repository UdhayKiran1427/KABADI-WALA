import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { sendNotification } from "@/lib/services/notificationService";
import { amountPaise } from "@/lib/domain/money";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        collector: { include: { user: true } },
        transaction: true,
      },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    if (!lot.transaction) {
      return apiError("NO_TRANSACTION", "This lot has no active transaction", 400);
    }

    const tx = lot.transaction;
    if (!tx.bargainRatePaise || tx.bargainStatus === "NONE" || tx.bargainStatus === "AGREED") {
      return apiError("NO_OFFER", "There is no pending bargain offer to accept", 400);
    }

    const isCollector = auth.collectorId && auth.collectorId === lot.collectorId;
    const isRecycler = auth.recyclerId && auth.recyclerId === tx.recyclerId;
    const isAdmin = auth.role === "ADMIN";

    if (!isCollector && !isRecycler && !isAdmin) {
      return apiError("FORBIDDEN", "You are not a participant in this transaction", 403);
    }

    // A party cannot accept their own offer
    if (!isAdmin) {
      if (isCollector && tx.bargainBy === "COLLECTOR") {
        return apiError("INVALID_ACTION", "You cannot accept your own offer; wait for the recycler to respond", 400);
      }
      if (isRecycler && tx.bargainBy === "RECYCLER") {
        return apiError("INVALID_ACTION", "You cannot accept your own offer; wait for the collector to respond", 400);
      }
    }

    const agreedRatePaise = tx.bargainRatePaise;
    const agreedPricePaise = amountPaise(lot.approxWeightGrams, agreedRatePaise);

    await prisma.$transaction(async (db) => {
      await db.transaction.update({
        where: { id: tx.id },
        data: {
          quotedRatePerKgPaise: agreedRatePaise,
          quotedPricePaise: agreedPricePaise,
          agreedRatePaise,
          bargainStatus: "AGREED",
        },
      });

      await db.lot.update({
        where: { id: lot.id },
        data: {
          quotedRatePaise: agreedRatePaise,
        },
      });
    });

    // Notify opposing party
    if (isCollector) {
      const staff = await prisma.recyclerStaff.findFirst({
        where: { recyclerId: tx.recyclerId },
      });
      if (staff) {
        await sendNotification({
          userId: staff.userId,
          title: "✓ Price Confirmed by Collector",
          body: `Collector confirmed ₹${(agreedRatePaise / 100).toFixed(0)}/kg for Lot ${lot.lotRef}. Ready for scale weighing!`,
          dataJson: { lotId: lot.id, agreedRatePaise, agreedPricePaise },
        });
      }
    } else {
      await sendNotification({
        userId: lot.collector.userId,
        title: "🎉 Price Agreed by Recycler!",
        body: `Recycler accepted your price of ₹${(agreedRatePaise / 100).toFixed(0)}/kg for Lot ${lot.lotRef}!`,
        dataJson: { lotId: lot.id, agreedRatePaise, agreedPricePaise },
      });
    }

    return apiSuccess({
      message: `Price successfully agreed and locked at ₹${(agreedRatePaise / 100).toFixed(2)}/kg`,
      agreedDeal: {
        lotId: lot.id,
        transactionId: tx.id,
        agreedRatePaise,
        agreedRateRupees: agreedRatePaise / 100,
        agreedPricePaise,
        agreedPriceRupees: agreedPricePaise / 100,
        bargainStatus: "AGREED",
      },
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
