import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { removeVehicle } from "@/lib/services/vehicleService";

/**
 * Removes a vehicle from the list. Not allowed while it is on the way to a pickup (409 VEHICLE_BUSY).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const { id } = await params;
    await removeVehicle(user.recyclerId, id);
    return apiSuccess({ id, removed: true });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
