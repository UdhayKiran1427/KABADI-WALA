import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { LOT_ITEMS_INCLUDE, lotItemsOf, lotPhotoUrls } from "@/lib/services/lotItemsView";
import { LIST_MAX_ROWS } from "@/lib/limits";

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
            categoryId: true,
            category: { select: { id: true, nameEn: true, nameHi: true, nameMr: true } },
            images: { select: { id: true, storageKey: true } },
            ...LOT_ITEMS_INCLUDE,
            collector: { select: { operatingArea: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: LIST_MAX_ROWS,
    });

    const requests = await Promise.all(
      offers.map(async (o) => ({
        offerId: o.id,
        status: o.status, // NOTIFIED = not answered yet, INTERESTED = waiting for the collector to choose
        myItemRates: o.itemRates,
        myTotalPaise: o.totalPaise,
        myRatePerKgPaise: o.ratePerKgPaise,
        distanceKm: o.distanceKm,
        notifiedAt: o.createdAt,
        lot: {
          lotId: o.lot.id,
          lotRef: o.lot.lotRef,
          // Every material with its weight and today's price; send your rate per categoryId when answering
          items: lotItemsOf(o.lot).map((i) => ({
            categoryId: i.categoryId,
            nameEn: i.category.nameEn,
            nameHi: i.category.nameHi,
            nameMr: i.category.nameMr,
            weightGrams: i.weightGrams,
            listedRatePerKgPaise: i.listedRatePerKgPaise,
          })),
          photos: await lotPhotoUrls(o.lot.images),
          material: o.lot.category,
          approxWeightGrams: o.lot.approxWeightGrams,
          listedRatePerKgPaise: o.lot.listedRatePerKgPaise,
          listedValuePaise: o.lot.estimatedValuePaise,
          area: o.lot.collector.operatingArea,
          collectedAt: o.lot.collectedAt,
        },
      }))
    );

    return apiSuccess({ requests });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
