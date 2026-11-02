import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { cancelDispatch, dispatchVehicle } from "@/lib/services/vehicleService";

const SendSchema = z.object({ vehicleId: z.string().min(1) });

/**
 * Recycler sends one of its vehicles to pick up the lot (active or paid deal).
 * A new 4-digit OTP is created; only the collector sees it (GET /lots/{id}/deal -> pickup.otp).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const { body, response: bodyError } = await parseBody(req, SendSchema);
    if (bodyError) return bodyError;

    const { id } = await params;
    const result = await dispatchVehicle(user.recyclerId, id, body.vehicleId);
    return apiSuccess({ lotId: id, status: "ON_THE_WAY", ...result }, 201);
  } catch (err) {
    return apiErrorFrom(err);
  }
}

/**
 * Calls the vehicle back before pickup; the collector's OTP stops working. Send again for a new OTP.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const { id } = await params;
    await cancelDispatch(user.recyclerId, id);
    return apiSuccess({ lotId: id, status: "CANCELLED" });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
