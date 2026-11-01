import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
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

    const { body, response: bodyError } = await parseBody(req, CoverageSchema);
    if (bodyError) return bodyError;

    const { latitude, longitude, categoryId, approxWeightGrams } = body;

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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

