import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { sendNotification } from "@/lib/services/notificationService";
import { z } from "zod";

const SelectRecyclerSchema = z.object({
  recyclerId: z.string().min(1),
  quotedRatePaise: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !auth.collectorId) {
      return apiError("UNAUTHORIZED", "Missing or invalid collector authorization", 401);
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = SelectRecyclerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { recyclerId, quotedRatePaise: customRate } = parsed.data;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { category: true, collector: true },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    if (lot.collectorId !== auth.collectorId && auth.role !== "ADMIN") {
      return apiError("FORBIDDEN", "You do not own this lot", 403);
    }

    const recycler = await prisma.recycler.findUnique({
      where: { id: recyclerId },
      include: {
        rates: {
          where: { categoryId: lot.categoryId, isCurrent: true },
        },
      },
    });

    if (!recycler) {
      return apiError("NOT_FOUND", "Recycler facility not found", 404);
    }

    // Determine rate: customRate, or recycler's active rate for this category, or lot's quoted rate
    const finalRatePaise = customRate || (recycler.rates[0] ? recycler.rates[0].ratePerKgPaise : (lot.quotedRatePaise || 4000));
    const finalPricePaise = Math.round((finalRatePaise * lot.approxWeightGrams) / 1000);

    const transactionId = `TX-${lot.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Update lot
      const updatedLot = await tx.lot.update({
        where: { id: lot.id },
        data: {
          chosenRecyclerId: recycler.id,
          quotedRatePaise: finalRatePaise,
          status: "MATCHED",
        },
      });

      // Upsert transaction
      const transaction = await tx.transaction.upsert({
        where: { lotId: lot.id },
        create: {
          id: transactionId,
          lotId: lot.id,
          collectorId: lot.collectorId,
          recyclerId: recycler.id,
          quotedRatePerKgPaise: finalRatePaise,
          quotedPricePaise: finalPricePaise,
          status: "QUOTED",
          bargainStatus: "NONE",
        },
        update: {
          recyclerId: recycler.id,
          quotedRatePerKgPaise: finalRatePaise,
          quotedPricePaise: finalPricePaise,
          bargainStatus: "NONE",
          bargainRatePaise: null,
          bargainBy: null,
          bargainNote: null,
          agreedRatePaise: null,
        },
      });

      return { lot: updatedLot, transaction };
    });

    // Notify recycler staff
    const staff = await prisma.recyclerStaff.findFirst({
      where: { recyclerId: recycler.id },
    });

    if (staff) {
      await sendNotification({
        userId: staff.userId,
        title: "📦 Incoming Lot Matched!",
        body: `Collector #${lot.collector.shortCode} matched Lot ${lot.lotRef} (${lot.category.nameEn}, ${(lot.approxWeightGrams / 1000).toFixed(1)}kg) to your facility.`,
        dataJson: { lotId: lot.id, transactionId: result.transaction.id },
      });
    }

    return apiSuccess({
      message: "Recycler matched and transaction initialized",
      lotId: lot.id,
      transactionId: result.transaction.id,
      recycler: {
        id: recycler.id,
        name: recycler.name,
        contactPhone: recycler.contactPhone,
        address: recycler.address,
      },
      quotedRatePaise: finalRatePaise,
      quotedRateRupees: finalRatePaise / 100,
      quotedPricePaise: finalPricePaise,
      quotedPriceRupees: finalPricePaise / 100,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}
