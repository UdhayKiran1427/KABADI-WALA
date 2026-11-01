import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { buildPublicReceipt } from "@/lib/domain/anonymization";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const shareToken = await prisma.receiptShareToken.findUnique({
      where: { token },
      include: {
        lot: {
          include: {
            category: true,
            transaction: {
              include: {
                recycler: true,
              },
            },
            handovers: {
              where: { status: "CONFIRMED" },
              take: 1,
            },
          },
        },
      },
    });

    if (!shareToken || !shareToken.lot) {
      return apiError("NOT_FOUND", "Public receipt not found or expired", 404);
    }

    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      return apiError("EXPIRED", "This receipt link has expired", 410);
    }

    const lot = shareToken.lot;
    const recycler = lot.transaction?.recycler;
    const confirmedHandover = lot.handovers[0];

    const receipt = buildPublicReceipt(
      lot.lotRef,
      lot.category.nameEn,
      confirmedHandover?.confirmedWeightGrams || lot.approxWeightGrams,
      lot.finalPricePaise || 0,
      confirmedHandover?.recyclerConfirmedAt || lot.updatedAt,
      recycler?.name || "Authorized Recycler",
      recycler?.authorizationNo || "VERIFIED"
    );

    return apiSuccess({ receipt });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

