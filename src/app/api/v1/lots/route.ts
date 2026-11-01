import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { createLot } from "@/lib/services/lotFlowService";
import { validateStorageKey } from "@/lib/storage";
import { z } from "zod";

const CreateLotSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.number().int().positive(),
  approxWeightGrams: z.number().int().positive(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Older app builds send deviceLat/deviceLng
  deviceLat: z.number().optional(),
  deviceLng: z.number().optional(),
  photos: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !auth.collectorId) {
      return apiError("UNAUTHORIZED", "Missing or invalid collector authorization", 401);
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") as any;

    const where: any = { collectorId: auth.collectorId };
    if (status) {
      where.status = status;
    }

    const lots = await prisma.lot.findMany({
      where,
      orderBy: { collectedAt: "desc" },
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = CreateLotSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { id, categoryId, approxWeightGrams, latitude, longitude, deviceLat, deviceLng, photos } = parsed.data;

    if (photos.some((key) => !validateStorageKey(key, auth.userId))) {
      return apiError("INVALID_PHOTO", "Photos must be uploaded through /uploads/presign first", 400);
    }

    if (id && (await prisma.lot.findUnique({ where: { id }, select: { id: true } }))) {
      return apiError("DUPLICATE", "A lot with this id already exists", 409);
    }

    const lot = await createLot({
      collectorId: auth.collectorId,
      categoryId,
      approxWeightGrams,
      latitude: latitude ?? deviceLat,
      longitude: longitude ?? deviceLng,
      lotId: id,
    });

    if (photos.length > 0) {
      await prisma.lotImage.createMany({
        data: photos.map((storageKey, idx) => ({
          id: `IMG-${lot.id.slice(0, 8)}-${idx + 1}`,
          lotId: lot.id,
          storageKey,
          takenAt: new Date(),
        })),
      });
    }

    return apiSuccess(
      {
        lot: {
          id: lot.id,
          lotRef: lot.lotRef,
          status: lot.status,
          categoryId: lot.categoryId,
          categoryName: lot.category.nameEn,
          approxWeightGrams: lot.approxWeightGrams,
          listedRatePerKgPaise: lot.listedRatePerKgPaise,
          estimatedValuePaise: lot.estimatedValuePaise,
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
