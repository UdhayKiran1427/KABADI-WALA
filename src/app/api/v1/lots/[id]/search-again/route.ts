import { type NextRequest } from "next/server";
import { requireOwnedLot } from "@/lib/auth/lotAccess";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { rebroadcastLot } from "@/lib/services/lotFlowService";

/**
 * Re-runs the 5 km broadcast for a READY lot, notifying recyclers that were not notified before.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { lot, response } = await requireOwnedLot(req, id);
    if (response) return response;

    const { newlyNotified, totalNotified } = await rebroadcastLot(lot.id);
    return apiSuccess({ lotId: lot.id, newlyNotified, totalNotified });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
