import { NextRequest } from "next/server";
import { requireOwnedLot } from "@/lib/auth/lotAccess";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { confirmLot } from "@/lib/services/lotFlowService";

/**
 * Collector confirms a DRAFT lot. It becomes READY and verified recyclers within 5 km are notified
 * (material, weight, price, distance, area - never the collector's name or phone).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { lot, response } = await requireOwnedLot(req, id);
    if (response) return response;

    const { totalNotified } = await confirmLot(lot.id);
    return apiSuccess({ lotId: lot.id, status: "READY", recyclersNotified: totalNotified });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
