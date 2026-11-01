import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const PickupRequestSchema = z.object({
  lotId: z.string().min(1),
  recyclerId: z.string().min(1),
  slot: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Sign-in required", 401);
    }

    const body = await req.json();
    const parsed = PickupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { lotId, recyclerId, slot } = parsed.data;

    // Verify lot exists and is owned by collector
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
    });

    if (!lot || lot.collectorId !== auth.collector.id) {
      return apiError("FORBIDDEN", "Lot not found or not owned by you", 403);
    }

    // 24 hour expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const request = await prisma.pickupRequest.create({
      data: {
        collectorId: auth.user.userId,
        recyclerId,
        lotId,
        slot: new Date(slot),
        status: "REQUESTED",
        expiresAt,
      },
    });

    // Touch lot
    await prisma.lot.update({
      where: { id: lotId },
      data: { updatedAt: new Date() },
    });

    return apiSuccess({
      message: "Doorstep pickup requested successfully. Awaiting recycler confirmation.",
      pickupRequest: request,
    }, 201);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Sign-in required", 401);
    }

    const requests = await prisma.pickupRequest.findMany({
      where: { collectorId: auth.user.userId },
      include: {
        recycler: { select: { id: true, name: true, contactPhone: true } },
        lot: { select: { id: true, lotRef: true, approxWeightGrams: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ requests });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

