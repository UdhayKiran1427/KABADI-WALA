import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const latStr = url.searchParams.get("latitude");
    const lngStr = url.searchParams.get("longitude");
    const radiusStr = url.searchParams.get("radiusKm") || "25";

    if (!latStr || !lngStr) {
      return apiError("MISSING_PARAMS", "latitude and longitude are required", 400);
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radiusKm = parseFloat(radiusStr);

    const recyclers = await prisma.recycler.findMany({
      where: { authorizationStatus: "VERIFIED" },
      select: {
        id: true,
        name: true,
        address: true,
        area: true,
        district: true,
        latitude: true,
        longitude: true,
        contactPhone: true,
        pickupAvailable: true,
        serviceRadiusKm: true,
        authorizationStatus: true,
        authorizationValidTill: true,
      },
    });

    const nearby = recyclers
      .map((r) => {
        const distanceKm = calculateHaversineDistanceKm(lat, lng, r.latitude, r.longitude);
        return { ...r, distanceKm };
      })
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return apiSuccess({
      count: nearby.length,
      radiusKm,
      recyclers: nearby,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

