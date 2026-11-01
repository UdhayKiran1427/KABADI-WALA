import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { createLot } from "@/lib/services/lotFlowService";
import { lotItemsOf, lotPhotoUrls } from "@/lib/services/lotItemsView";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";
import { COLLECTOR_HISTORY_STATUSES, collectorHistoryWhere } from "@/lib/services/historyQuery";
import { parseHistoryQuery } from "@/lib/historyFilters";
import { LotStatus } from "@prisma/client";
import { validateStorageKey } from "@/lib/storage";
import { z } from "zod";

const CreateLotSchema = z.object({
  id: z.string().uuid().optional(),
  // One row per material, e.g. [{ categoryId: 1, weightGrams: 5000 }, { categoryId: 2, weightGrams: 2000 }]
  items: z.array(z.object({ categoryId: z.number().int().positive(), weightGrams: z.number().int().positive() })).min(1).max(10).optional(),
  // Older app builds send a single material
  categoryId: z.number().int().positive().optional(),
  approxWeightGrams: z.number().int().positive().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Older app builds send deviceLat/deviceLng
  deviceLat: z.number().optional(),
  deviceLng: z.number().optional(),
  photos: z.array(z.string()).max(5).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !auth.collectorId) {
      return apiError("UNAUTHORIZED", "Missing or invalid collector authorization", 401);
    }

    // Filters: q (lot ref, material or buyer name), status (finding | topay | paid, or an exact lot status),
    // material (category id), period (7d | 30d | 90d)
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const where = collectorHistoryWhere(auth.collectorId, parseHistoryQuery(params, Object.keys(COLLECTOR_HISTORY_STATUSES)));
    if (params.status && (Object.values(LotStatus) as string[]).includes(params.status)) {
      where.status = params.status as LotStatus;
    }

    const lots = await prisma.lot.findMany({
      where,
      orderBy: { collectedAt: "desc" },
      take: 200,
      include: {
        category: { select: { id: true, code: true, nameEn: true, nameHi: true, nameMr: true, iconKey: true } },
        images: true,
        transaction: {
          include: {
            recycler: { select: { id: true, name: true, contactPhone: true, address: true } },
          },
        },
        handovers: true,
        payments: true,
      },
    });

    return apiSuccess({
      count: lots.length,
      lots,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

/**
 * Creates a DRAFT lot valued at today's price. Next step: POST /lots/{id}/confirm.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !auth.collectorId) {
      return apiError("UNAUTHORIZED", "Missing or invalid collector authorization", 401);
    }

    const { body, response: bodyError } = await parseBody(req, CreateLotSchema);
    if (bodyError) return bodyError;

    const { id, items, categoryId, approxWeightGrams, latitude, longitude, deviceLat, deviceLng, photos } = body;
    const lotItems = items ?? (categoryId && approxWeightGrams ? [{ categoryId, weightGrams: approxWeightGrams }] : []);
    if (lotItems.length === 0) {
      return apiError("VALIDATION_ERROR", "Send items: [{ categoryId, weightGrams }]", 400);
    }

    if (photos.some((key) => !validateStorageKey(key, auth.userId))) {
      return apiError("INVALID_PHOTO", "Photos must be uploaded through /uploads/presign first", 400);
    }

    if (id && (await prisma.lot.findUnique({ where: { id }, select: { id: true } }))) {
      return apiError("DUPLICATE", "A lot with this id already exists", 409);
    }

    const lot = await createLot({
      collectorId: auth.collectorId,
      items: lotItems,
      latitude: latitude ?? deviceLat,
      longitude: longitude ?? deviceLng,
      lotId: id,
      photoKeys: photos,
    });

    return apiSuccess(
      {
        lot: {
          id: lot.id,
          lotRef: lot.lotRef,
          status: lot.status,
          items: lotItemsOf(lot).map((i) => ({
            categoryId: i.categoryId,
            categoryName: i.category.nameEn,
            weightGrams: i.weightGrams,
            listedRatePerKgPaise: i.listedRatePerKgPaise,
            valuePaise: calculateLotValuePaise(i.listedRatePerKgPaise, i.weightGrams),
          })),
          approxWeightGrams: lot.approxWeightGrams,
          estimatedValuePaise: lot.estimatedValuePaise,
          photos: await lotPhotoUrls(lot.images),
          latitude: lot.collectLat,
          longitude: lot.collectLng,
          collectedAt: lot.collectedAt,
        },
      },
      201
    );
  } catch (err) {
    return apiErrorFrom(err);
  }
}
