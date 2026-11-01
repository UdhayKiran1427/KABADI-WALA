import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
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

    const { body, response: bodyError } = await parseBody(req, RespondSchema);
    if (bodyError) return bodyError;

    const { offerId } = await params;
    const result = await respondToOffer(
      offerId,
      user.recyclerId,
      body.response,
      body.response === "INTERESTED" ? { itemRates: body.itemRates, ratePerKgPaise: body.ratePerKgPaise } : {}
    );
    return apiSuccess({ offerId, ...result });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
