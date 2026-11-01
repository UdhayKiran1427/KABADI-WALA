import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { checkArrivalProximity } from "@/lib/domain/geoDirections";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireApiUser(req, ["COLLECTOR", "ADMIN"]);
    if (response) return response;

    const { id } = await props.params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { transaction: { include: { recycler: true } }, handovers: { take: 1 } },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    const recycler = lot.transaction?.recycler;
    if (!recycler) {
      return apiError("NO_RECYCLER", "No recycler matched for this lot", 400);
    }

    const body = await req.json().catch(() => ({}));
    const lat = typeof body.latitude === "number" ? body.latitude : NaN;
    const lng = typeof body.longitude === "number" ? body.longitude : NaN;

    if (isNaN(lat) || isNaN(lng)) {
      return apiError("INVALID_COORDINATES", "Valid latitude and longitude are required", 400);
    }

    const proximity = checkArrivalProximity(lat, lng, recycler.latitude, recycler.longitude);

    // Update handover if present
    const handover = lot.handovers[0];
    if (handover) {
      await prisma.handover.update({
        where: { id: handover.id },
        data: {
          arrivedAt: new Date(),
          arrivalDistanceM: proximity.distanceMeters,
        },
      });
    }

    return apiSuccess({
      arrived: proximity.arrived,
      distanceMeters: proximity.distanceMeters,
      message: proximity.arrived
        ? `Arrived at ${recycler.name} (${proximity.distanceMeters}m away)`
        : `Location is ${proximity.distanceMeters}m from ${recycler.name}`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}
