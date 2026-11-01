import { NextRequest } from "next/server";
import { z } from "zod";
import { requireOwnedLot } from "@/lib/auth/lotAccess";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = SelectSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    await selectOffer(lot.id, parsed.data.offerId);
    return apiSuccess({ deal: await getDealView(lot.id, req.nextUrl.origin) });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
