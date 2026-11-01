import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { sendNotification } from "@/lib/services/notificationService";
import { z } from "zod";

const OfferSchema = z.object({
  offerRatePaise: z.number().int().positive().optional(),
  offerRateRupees: z.number().positive().optional(),
  note: z.string().max(200).optional(),
}).refine(data => data.offerRatePaise !== undefined || data.offerRateRupees !== undefined, {
  message: "Either offerRatePaise or offerRateRupees must be provided",
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = OfferSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const offerRatePaise = parsed.data.offerRatePaise ?? Math.round((parsed.data.offerRateRupees || 0) * 100);
    const note = parsed.data.note?.trim() || "";

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
      return apiError("NO_TRANSACTION", "This lot has no active transaction with a recycler", 400);
    }

    const tx = lot.transaction;
    if (tx.status === "PAID" || tx.status === "CANCELLED") {
      return apiError("INVALID_STATE", `Cannot bargain on a transaction in state ${tx.status}`, 400);
    }

    const isCollector = auth.collectorId && auth.collectorId === lot.collectorId;
    const isRecycler = auth.recyclerId && auth.recyclerId === tx.recyclerId;
    const isAdmin = auth.role === "ADMIN";

    if (!isCollector && !isRecycler && !isAdmin) {
      return apiError("FORBIDDEN", "You are not a participant in this transaction", 403);
    }

    const bargainBy = isCollector ? "COLLECTOR" : "RECYCLER";
    const bargainStatus = isCollector ? "OFFER_BY_COLLECTOR" : "OFFER_BY_RECYCLER";

    const updatedTx = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        bargainRatePaise: offerRatePaise,
        bargainBy,
        bargainNote: note,
        bargainStatus,
      },
    });

    // Notify opposing party
    if (isCollector) {
      // Find recycler staff
      const staff = await prisma.recyclerStaff.findFirst({
        where: { recyclerId: tx.recyclerId },
      });
      if (staff) {
        await sendNotification({
          userId: staff.userId,
          title: "💬 New Price Offer from Collector",
          body: `Collector #${lot.collector.shortCode} offered ₹${(offerRatePaise / 100).toFixed(0)}/kg for Lot ${lot.lotRef}.`,
          dataJson: { lotId: lot.id, transactionId: tx.id, offerRatePaise, note },
        });
      }
    } else {
      // Recycler or Admin made counter-offer -> notify collector
      await sendNotification({
        userId: lot.collector.userId,
        title: "💬 Counter-Offer from Recycler",
        body: `Recycler offered ₹${(offerRatePaise / 100).toFixed(0)}/kg for Lot ${lot.lotRef}. Review and confirm!`,
        dataJson: { lotId: lot.id, transactionId: tx.id, offerRatePaise, note },
      });
    }

    return apiSuccess({
      message: `Price offer of ₹${(offerRatePaise / 100).toFixed(2)}/kg submitted successfully`,
      bargain: {
        lotId: lot.id,
        transactionId: updatedTx.id,
        bargainRatePaise: offerRatePaise,
        bargainRateRupees: offerRatePaise / 100,
        bargainBy,
        bargainStatus,
        bargainNote: note,
      },
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
