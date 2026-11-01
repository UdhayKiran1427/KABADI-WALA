import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const collectorId = url.searchParams.get("collectorId");

    if (!collectorId) {
      return apiError("MISSING_PARAM", "collectorId query parameter is required", 400);
    }

    const collector = await prisma.collector.findFirst({
      where: {
        OR: [
          { id: collectorId },
          { userId: collectorId },
          { shortCode: collectorId },
        ],
      },
    });

    if (!collector) {
      return apiError("NOT_FOUND", "Collector not found", 404);
    }

    const lots = await prisma.lot.findMany({
      where: { collectorId: collector.id },
      orderBy: { collectedAt: "desc" },
      include: {
        category: { select: { isHazardous: true } },
        handovers: true,
        transaction: true,
      },
    });

    const lotIds = lots.map((l) => l.id);
    const payments = await prisma.payment.findMany({
      where: { lotId: { in: lotIds } },
      orderBy: { paidAt: "desc" },
    });

    const serializedLots = lots.map((lot) => ({
      id: lot.id,
      lotRef: lot.lotRef,
      categoryId: lot.categoryId,
      approxWeightGrams: lot.approxWeightGrams,
      estimatedValuePaise: lot.estimatedValuePaise,
      finalPricePaise: lot.finalPricePaise,
      status: lot.status,
      transactionStatus: lot.status,
      collectedAt: lot.collectedAt.toISOString(),
      collectLat: lot.collectLat,
      collectLng: lot.collectLng,
      isHazardous: lot.category.isHazardous,
      paymentStatus: lot.transaction?.paymentStatus || "PENDING",
    }));

    const serializedPayments = payments.map((p) => ({
      id: p.id,
      lotId: p.lotId,
      amountPaise: p.amountPaise,
      paymentMode: p.method,
      paidAt: p.paidAt.toISOString(),
      upiRef: p.upiRef,
    }));

    return apiSuccess({
      collectorId: collector.id,
      shortCode: collector.shortCode,
      lots: serializedLots,
      payments: serializedPayments,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
