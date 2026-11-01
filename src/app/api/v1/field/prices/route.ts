import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || (auth.role !== "FIELD_AGENT" && auth.role !== "ADMIN")) {
      return apiError("UNAUTHORIZED", "Field agent or admin authorization required", 401);
    }

    const where: any = {};
    if (auth.role === "FIELD_AGENT") {
      where.recordedById = auth.userId;
    }

    const prices = await prisma.pricePoint.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: 50,
      include: {
        category: { select: { id: true, nameEn: true, nameHi: true, nameMr: true } },
      },
    });

    return apiSuccess({
      count: prices.length,
      prices: prices.map((p) => ({
        id: p.id,
        category: p.category.nameEn,
        categoryId: p.categoryId,
        subCategory: p.subCategory,
        buyingPricePaise: p.buyingPricePaise,
        buyingPriceRupees: p.buyingPricePaise / 100,
        buyerType: p.buyerType,
        area: p.area,
        district: p.district,
        recordedAt: p.recordedAt,
      })),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    let recordedById: string | null = auth?.userId || null;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
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

