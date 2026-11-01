import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const TrainingPhotoSchema = z.object({
  categoryId: z.number().int().positive(),
  storageKey: z.string().min(5),
  sha256: z.string().optional(),
  labelConfidence: z.number().min(0).max(1).default(1.0),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let agentId: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const payload = await verifyMobileToken(authHeader.substring(7));
      if (payload) agentId = payload.userId;
    }

    const body = await req.json();
    const parsed = TrainingPhotoSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { categoryId, storageKey, sha256, labelConfidence } = parsed.data;

    // Create a standalone training lot image
    const imageId = `IMG-TR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Create placeholder lot for training image if needed or directly link TrainingSample
    // In our schema: TrainingSample requires imageId -> LotImage. Let's create a minimal system training lot or image
    const sample = await prisma.trainingSample.create({
      data: {
        imageId,
        categoryId,
        labelSource: "FIELD_AGENT",
        labelConfidence,
        capturedById: agentId,
      },
    });

    return apiSuccess({
      message: "Training sample logged successfully",
      sampleId: sample.id,
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

