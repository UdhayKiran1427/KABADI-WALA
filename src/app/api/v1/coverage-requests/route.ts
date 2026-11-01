import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const CoverageSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  categoryId: z.number().int(),
  approxWeightGrams: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Sign-in required", 401);
    }

    const body = await req.json();
    const parsed = CoverageSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { latitude, longitude, categoryId, approxWeightGrams } = parsed.data;

    const record = await prisma.coverageRequest.create({
      data: {
        collectorId: auth.user.userId,
        latitude,
        longitude,
        categoryId,
        approxWeightGrams,
      },
    });

    return apiSuccess({
      message: "Coverage request recorded. We will alert you when a verified recycler covers your area.",
      id: record.id,
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

