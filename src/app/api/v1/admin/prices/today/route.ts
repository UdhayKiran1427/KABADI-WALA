import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { setTodayPrices } from "@/lib/services/adminService";

const TodayPricesSchema = z.object({
  prices: z
    .array(z.object({ categoryId: z.number().int().positive(), ratePerKgPaise: z.number().int().positive() }))
    .min(1, "Send at least one price"),
});

/**
 * Admin sets today's price (paise per kg) for one or more categories.
 * Read current prices with the public GET /prices/today.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["ADMIN"]);
    if (response) return response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = TodayPricesSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const updated = await setTodayPrices(user.userId, parsed.data.prices);
    return apiSuccess({ updated });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
