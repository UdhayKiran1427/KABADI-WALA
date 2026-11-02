import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { verifyPickupOtp } from "@/lib/services/vehicleService";

const VerifySchema = z.object({ otp: z.string().regex(/^\d{4}$/, "Enter the 4-digit code") });

/**
 * The vehicle side enters the collector's 4-digit OTP. Correct: pickup done (PICKED_UP), both sides notified.
 * Wrong: 400 WRONG_OTP with tries left; after 5 wrong codes 429 OTP_LOCKED (cancel and send again).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const { body, response: bodyError } = await parseBody(req, VerifySchema);
    if (bodyError) return bodyError;

    const { id } = await params;
    const result = await verifyPickupOtp(user.recyclerId, id, body.otp);
    return apiSuccess({ lotId: id, status: "PICKED_UP", ...result });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
