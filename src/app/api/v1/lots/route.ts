import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";
import crypto from "crypto";

const CreateLotSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.number().int().positive(),
  approxWeightGrams: z.number().int().positive(),
  conditionNotes: z.string().max(500).optional(),
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

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !auth.collectorId) {
      return apiError("UNAUTHORIZED", "Missing or invalid collector authorization", 401);
    }

    const body = await req.json();
    const parsed = CreateLotSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { id: clientId, categoryId, approxWeightGrams, conditionNotes, deviceLat, deviceLng, photos } = parsed.data;

    const category = await prisma.materialCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return apiError("NOT_FOUND", "Material category not found", 404);
    }

    const lotId = clientId || crypto.randomUUID();
    const lotRef = `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Default price: 4000 paise (₹40/kg)
    const quotedRatePaise = 4000;

    const lot = await prisma.$transaction(async (tx) => {
      const createdLot = await tx.lot.create({
        data: {
          id: lotId,
          lotRef,
          collectorId: auth.collectorId!,
          categoryId,
          approxWeightGrams,
          description: conditionNotes || null,
          collectLat: deviceLat || null,
          collectLng: deviceLng || null,
          quotedRatePaise,
          status: "DRAFT",
          collectedAt: new Date(),
        },
      });

      if (photos && photos.length > 0) {
        await tx.lotImage.createMany({
          data: photos.map((storageKey, idx) => ({
            id: `IMG-${lotId.slice(0, 8)}-${idx + 1}`,
            lotId,
            storageKey,
            takenAt: new Date(),
          })),
        });
      }

      return createdLot;
    });

    return apiSuccess({
      message: "Lot created successfully",
      lot: {
        id: lot.id,
        lotRef: lot.lotRef,
        categoryId: lot.categoryId,
        categoryName: category.nameEn,
        approxWeightGrams: lot.approxWeightGrams,
        weightKg: (lot.approxWeightGrams / 1000).toFixed(2),
        quotedRatePaise: lot.quotedRatePaise,
        quotedRateRupees: (lot.quotedRatePaise || 0) / 100,
        status: lot.status,
        collectedAt: lot.collectedAt,
      },
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}
