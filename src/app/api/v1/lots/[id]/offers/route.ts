import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnedLot } from "@/lib/auth/lotAccess";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";

/**
 * Recyclers who are ready to buy this lot (with their price and address), plus broadcast counts.
 * Poll this while the lot is READY.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { lot, response } = await requireOwnedLot(req, id);
    if (response) return response;

    const offers = await prisma.lotOffer.findMany({
      where: { lotId: lot.id },
      include: { recycler: true },
      orderBy: { distanceKm: "asc" },
    });

    const count = (status: string) => offers.filter((o) => o.status === status).length;

    return apiSuccess({
      lotId: lot.id,
      lotStatus: lot.status,
      summary: {
        notified: offers.length,
        interested: count("INTERESTED"),
        waiting: count("NOTIFIED"),
        declined: count("DECLINED"),
      },
      offers: offers
        .filter((o) => o.status === "INTERESTED" || o.status === "SELECTED")
        .map((o) => ({
          offerId: o.id,
          status: o.status,
          distanceKm: o.distanceKm,
          ratePerKgPaise: o.ratePerKgPaise,
          totalPaise: calculateLotValuePaise(o.ratePerKgPaise ?? 0, lot.approxWeightGrams),
          respondedAt: o.respondedAt,
          recycler: {
            id: o.recycler.id,
            name: o.recycler.name,
            address: o.recycler.address,
            area: o.recycler.area,
            latitude: o.recycler.latitude,
            longitude: o.recycler.longitude,
          },
        })),
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
