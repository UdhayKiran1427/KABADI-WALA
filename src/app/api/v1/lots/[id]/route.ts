import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        category: true,
        items: { include: { category: true } },
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

    if (auth.role !== "ADMIN" && lot.collectorId !== auth.collectorId) {
      return apiError("FORBIDDEN", "You do not have access to this lot", 403);
    }

    return apiSuccess({ lot });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { collector: true },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    if (auth.role !== "ADMIN" && lot.collectorId !== auth.collectorId) {
      return apiError("FORBIDDEN", "You do not have permission to delete this lot", 403);
    }

    if (lot.status === "COMPLETED" || lot.status === "HANDED_OVER") {
      return apiError("INVALID_STATE", "Cannot delete a lot that has already been handed over or paid", 400);
    }

    await prisma.$transaction(async (db) => {
      await db.lotImage.deleteMany({ where: { lotId: id } });
      await db.pickupRequest.deleteMany({ where: { lotId: id } });
      await db.dispute.deleteMany({ where: { lotId: id } });
      await db.matchSuggestion.deleteMany({ where: { lotId: id } });
      await db.lotOffer.deleteMany({ where: { lotId: id } });
      await db.lotItem.deleteMany({ where: { lotId: id } });
      await db.vehicleDispatch.deleteMany({ where: { lotId: id } });
      await db.receiptShareToken.deleteMany({ where: { lotId: id } });
      await db.payment.deleteMany({ where: { lotId: id } });
      await db.handover.deleteMany({ where: { lotId: id } });
      await db.transaction.deleteMany({ where: { lotId: id } });
      await db.lot.delete({ where: { id } });
    });

    return apiSuccess({
      message: "Lot deleted successfully",
      deletedLotId: id,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
