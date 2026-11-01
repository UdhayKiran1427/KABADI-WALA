import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";

/**
 * Open lot requests for the signed-in recycler: lots within 5 km that are still looking for a buyer.
 * The collector's identity is never included here.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const offers = await prisma.lotOffer.findMany({
      where: { recyclerId: user.recyclerId, status: { in: ["NOTIFIED", "INTERESTED"] }, lot: { is: { status: "READY" } } },
      include: {
        lot: {
          select: {
            id: true,
            lotRef: true,
            approxWeightGrams: true,
            listedRatePerKgPaise: true,
            estimatedValuePaise: true,
            collectedAt: true,
            category: { select: { id: true, nameEn: true, nameHi: true, nameMr: true } },
            collector: { select: { operatingArea: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({
      requests: offers.map((o) => ({
        offerId: o.id,
        status: o.status, // NOTIFIED = not answered yet, INTERESTED = waiting for the collector to choose
        myRatePerKgPaise: o.ratePerKgPaise,
        distanceKm: o.distanceKm,
        notifiedAt: o.createdAt,
        lot: {
          lotId: o.lot.id,
          lotRef: o.lot.lotRef,
          material: o.lot.category,
          approxWeightGrams: o.lot.approxWeightGrams,
          listedRatePerKgPaise: o.lot.listedRatePerKgPaise,
          listedValuePaise: o.lot.estimatedValuePaise,
          area: o.lot.collector.operatingArea,
          collectedAt: o.lot.collectedAt,
        },
      })),
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
