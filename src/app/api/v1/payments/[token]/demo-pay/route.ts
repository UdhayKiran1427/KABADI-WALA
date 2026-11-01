import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { canSeeDeal } from "@/lib/auth/lotAccess";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { completeDemoPayment } from "@/lib/services/lotFlowService";
import { getDealView } from "@/lib/services/dealView";

/**
 * DEMO payment: the app scans the deal QR (it encodes `{origin}/pay/{token}`), takes the token and calls this.
 * Marks the deal PAID (no real money moves) and returns the deal with payment details for the success/invoice screen.
 * Calling it again is safe and returns the same paid deal.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["COLLECTOR", "RECYCLER", "ADMIN"]);
    if (response) return response;

    const { token } = await params;
    const share = await prisma.receiptShareToken.findUnique({
      where: { token },
      include: { lot: { select: { id: true, collectorId: true, chosenRecyclerId: true } } },
    });
    if (!share || !canSeeDeal(user, share.lot)) {
      return apiError("NOT_FOUND", "Payment link not found", 404);
    }

    const result = await completeDemoPayment(token);
    if (result === "NOT_FOUND") return apiError("NOT_FOUND", "Payment link not found or expired", 404);
    if (result === "NOT_PAYABLE") return apiError("NOT_PAYABLE", "This lot cannot be paid in its current state", 409);

    return apiSuccess({ result, deal: await getDealView(share.lot.id, req.nextUrl.origin) });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
