import { type Prisma } from "@prisma/client";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
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

    const where: Prisma.PricePointWhereInput = {};
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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    const recordedById: string | null = auth?.userId || null;

    const { body, response: bodyError } = await parseBody(req, LogPriceSchema);
    if (bodyError) return bodyError;

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
    } = body;

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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

