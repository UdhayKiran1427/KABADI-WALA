import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        transaction: {
          include: {
            recycler: {
              select: {
                id: true,
                name: true,
                authorizationNo: true,
                authorizationStatus: true,
                contactPhone: true,
                address: true,
              },
            },
          },
        },
        handovers: true,
        payments: true,
        disputes: true,
        pickupRequests: true,
      },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    if (lot.collectorId !== auth.collector.id) {
      return apiError("FORBIDDEN", "You do not have access to this lot", 403);
    }

    return apiSuccess({ lot });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

