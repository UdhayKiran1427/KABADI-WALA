import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
import { z } from "zod";
import { LIST_MAX_ROWS } from "@/lib/limits";

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

    const { body, response: bodyError } = await parseBody(req, PickupRequestSchema);
    if (bodyError) return bodyError;

    const { lotId, recyclerId, slot } = body;

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
  } catch (err) {
    return apiErrorFrom(err);
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
      take: LIST_MAX_ROWS,
    });

    return apiSuccess({ requests });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

const UpdatePickupStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["REQUESTED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "COMPLETED", "CANCELLED"]),
  etaMinutes: z.number().int().nonnegative().optional(),
  cancellationReason: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { body, response: bodyError } = await parseBody(req, UpdatePickupStatusSchema);
    if (bodyError) return bodyError;

    const { id, status, etaMinutes, cancellationReason } = body;

    const request = await prisma.pickupRequest.update({
      where: { id },
      data: {
        status,
        ...(etaMinutes !== undefined && { etaMinutes }),
        ...(cancellationReason !== undefined && { cancellationReason }),
        updatedAt: new Date(),
      },
    });

    return apiSuccess({
      message: `Pickup request status updated to ${status}`,
      pickupRequest: request,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

