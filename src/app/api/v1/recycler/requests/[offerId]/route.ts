import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { respondToOffer } from "@/lib/services/lotFlowService";

const ItemRateSchema = z.object({ categoryId: z.number().int().positive(), ratePerKgPaise: z.number().int().positive() });

const RespondSchema = z.discriminatedUnion("response", [
  z.object({
    response: z.literal("INTERESTED"),
    // Rate per material; materials left out use ratePerKgPaise, or today's price if that is missing too
    itemRates: z.array(ItemRateSchema).max(20).optional(),
    ratePerKgPaise: z.number().int().positive().optional(),
  }),
  z.object({ response: z.literal("DECLINED") }),
]);

/**
 * Recycler answers a lot request: "INTERESTED" (ready to buy, with per-material rates) or "DECLINED".
 * An INTERESTED answer notifies the collector and adds this recycler to their list.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { offerId } = await params;
    const result = await respondToOffer(
      offerId,
      user.recyclerId,
      parsed.data.response,
      parsed.data.response === "INTERESTED" ? { itemRates: parsed.data.itemRates, ratePerKgPaise: parsed.data.ratePerKgPaise } : {}
    );
    return apiSuccess({ offerId, ...result });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
