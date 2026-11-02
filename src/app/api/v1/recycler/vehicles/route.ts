import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { addVehicle, listVehicles } from "@/lib/services/vehicleService";

const AddVehicleSchema = z.object({
  name: z.string().min(2).max(40),
  number: z.string().min(4).max(20),
});

/**
 * The recycler's vehicles with their state: EMPTY, ON_THE_WAY (to a pickup) or LOADED
 * (picked up, not yet unloaded at the yard), plus how many lots are on the way / loaded.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    return apiSuccess({ vehicles: await listVehicles(user.recyclerId) });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

/**
 * Adds a vehicle: only a name and a vehicle number. Re-adding a removed number brings it back.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;
    if (!user.recyclerId) return apiError("NO_FACILITY", "Your account is not linked to a recycler facility", 403);

    const { body, response: bodyError } = await parseBody(req, AddVehicleSchema);
    if (bodyError) return bodyError;

    const vehicle = await addVehicle(user.recyclerId, body);
    return apiSuccess({ vehicle: { id: vehicle.id, name: vehicle.name, number: vehicle.number } }, 201);
  } catch (err) {
    return apiErrorFrom(err);
  }
}
