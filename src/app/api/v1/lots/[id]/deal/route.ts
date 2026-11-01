import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { canSeeDeal } from "@/lib/auth/lotAccess";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { getDealView } from "@/lib/services/dealView";

/**
 * Full deal after the collector selected a recycler: both parties' details, amount,
 * payment status and the demo payment link. For the lot's collector, the selected recycler, or admin.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["COLLECTOR", "RECYCLER", "ADMIN"]);
    if (response) return response;

    const { id } = await params;
    const lot = await prisma.lot.findUnique({ where: { id }, select: { id: true, collectorId: true, chosenRecyclerId: true } });
    if (!lot || !canSeeDeal(user, lot)) {
      return apiError("NOT_FOUND", "Deal not found", 404);
    }

    const deal = await getDealView(lot.id, req.nextUrl.origin);
    if (!deal) {
      return apiError("NO_DEAL", "No recycler has been selected for this lot yet", 404);
    }
    return apiSuccess({ deal });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
