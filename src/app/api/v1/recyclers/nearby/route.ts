import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { boundingBox } from "@/lib/domain/geoBox";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
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

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      isNaN(radiusKm) ||
      radiusKm <= 0 ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return apiError("INVALID_PARAMS", "Invalid numeric parameters or out-of-range coordinates", 400);
    }

    // Database prefilter by bounding box, then the exact distance check below.
    const box = boundingBox(lat, lng, radiusKm);
    const recyclers = await prisma.recycler.findMany({
      where: {
        authorizationStatus: "VERIFIED",
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

