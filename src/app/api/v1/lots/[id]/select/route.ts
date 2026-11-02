import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireOwnedLot } from "@/lib/auth/lotAccess";
import { apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { selectOffer } from "@/lib/services/lotFlowService";
import { getDealView } from "@/lib/services/dealView";

const SelectSchema = z.object({ offerId: z.string().min(1) });

/**
 * Collector sells the lot to one of the INTERESTED recyclers.
 * Both sides can then see each other's details; returns the deal with its payment link.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { lot, response } = await requireOwnedLot(req, id);
    if (response) return response;

    const { body, response: bodyError } = await parseBody(req, SelectSchema);
    if (bodyError) return bodyError;

    await selectOffer(lot.id, body.offerId);
    return apiSuccess({ deal: await getDealView(lot.id, req.nextUrl.origin, { forCollector: true }) });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
