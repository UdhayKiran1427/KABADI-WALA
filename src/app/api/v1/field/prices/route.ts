import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const LogPriceSchema = z.object({
  categoryId: z.number().int().positive(),
  subCategory: z.string().optional(),
  buyingPricePaise: z.number().int().positive(),
  buyerType: z.enum(["SCRAP_DEALER", "RECYCLER"]).default("SCRAP_DEALER"),
  area: z.string().min(2),
  district: z.string().default("Mumbai"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let recordedById: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const payload = await verifyMobileToken(authHeader.substring(7));
      if (payload) recordedById = payload.userId;
    }

    const body = await req.json();
    const parsed = LogPriceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const {
      categoryId,
      subCategory,
      buyingPricePaise,
      buyerType,
      area,
      district,
      latitude,
      longitude,
      recordedAt,
    } = parsed.data;

    const pricePoint = await prisma.pricePoint.create({
      data: {
        id: `PRICE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        categoryId,
        subCategory: subCategory || null,
        buyingPricePaise,
        buyerType,
        area,
        district,
        latitude: latitude || null,
        longitude: longitude || null,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        source: "FIELD_AGENT",
        recordedById,
      },
    });

    return apiSuccess({
      message: "Market price logged successfully",
      pricePoint,
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

