import { type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { markVehicleUnloaded } from "@/lib/services/vehicleService";

/**
 * Marks everything the vehicle picked up as unloaded at the yard, so it shows as EMPTY again.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const { id } = await params;
    const unloadedLots = await markVehicleUnloaded(user.recyclerId, id);
    return apiSuccess({ id, unloadedLots });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
