import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const TrainingPhotoSchema = z.object({
  categoryId: z.number().int().positive(),
  storageKey: z.string().min(5),
  sha256: z.string().optional(),
  labelConfidence: z.number().min(0).max(1).default(1.0),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || (auth.role !== "FIELD_AGENT" && auth.role !== "ADMIN")) {
      return apiError("UNAUTHORIZED", "Field agent or admin authorization required", 401);
    }

    const where: any = {};
    if (auth.role === "FIELD_AGENT") {
      where.capturedById = auth.userId;
    }

    const samples = await prisma.trainingSample.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        category: { select: { id: true, nameEn: true, code: true } },
      },
    });

    return apiSuccess({
      count: samples.length,
      samples: samples.map((s) => ({
        id: s.id,
        category: s.category.nameEn,
        categoryId: s.categoryId,
        labelSource: s.labelSource,
        labelConfidence: s.labelConfidence,
        quality: s.quality,
        createdAt: s.createdAt,
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
    let agentId: string | null = auth?.userId || null;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }

    const parsed = TrainingPhotoSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { categoryId, storageKey, sha256, labelConfidence } = parsed.data;

    // Verify category exists
    const category = await prisma.materialCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return apiError("CATEGORY_NOT_FOUND", `Material category #${categoryId} does not exist`, 404);
    }

    const imageId = `IMG-TR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const sample = await prisma.$transaction(async (tx) => {
      // Find or create field agent lot for training samples
      let trainingLot = await tx.lot.findFirst({
        where: { subCategory: "FIELD_AGENT_TRAINING_CONTAINER" },
      });

      if (!trainingLot) {
        const collector = await tx.collector.findFirst();
        if (!collector) {
          throw new Error("No collector profile found to associate training lot container");
        }
        trainingLot = await tx.lot.create({
          data: {
            id: `LOT-TRN-${Date.now()}`,
            lotRef: `TRN-AGENT-${Date.now().toString().slice(-6)}`,
            collectorId: collector.id,
            categoryId,
            approxWeightGrams: 1000,
            subCategory: "FIELD_AGENT_TRAINING_CONTAINER",
            status: "DRAFT",
            collectedAt: now,
          },
        });
      }

      await tx.lotImage.create({
        data: {
          id: imageId,
          lotId: trainingLot.id,
          kind: "TRAINING",
          storageKey,
          sha256: sha256 || null,
          takenAt: now,
        },
      });

      return await tx.trainingSample.create({
        data: {
          imageId,
          categoryId,
          labelSource: "FIELD_AGENT",
          labelConfidence,
          capturedById: agentId,
          quality: "GOOD",
        },
      });
    });

    return apiSuccess({
      message: "Training sample logged successfully",
      sampleId: sample.id,
      imageId,
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

