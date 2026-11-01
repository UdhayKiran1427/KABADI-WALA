import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const latStr = url.searchParams.get("latitude");
    const lngStr = url.searchParams.get("longitude");
    const radiusStr = url.searchParams.get("radiusKm") || "30";

    if (latStr || lngStr) {
      if (!latStr || !lngStr) {
        return apiError("MISSING_PARAMS", "Both latitude and longitude must be provided", 400);
      }
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const radiusKm = parseFloat(radiusStr);

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm) || radiusKm <= 0 || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return apiError("INVALID_PARAMS", "Invalid numeric coordinates or radius", 400);
      }

      const points = await prisma.collectionPoint.findMany();
      const withDist = points
        .map((p) => {
          const distanceKm = calculateHaversineDistanceKm(lat, lng, p.latitude, p.longitude);
          return { ...p, distanceKm };
        })
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return apiSuccess({ count: withDist.length, points: withDist });
    }

    const points = await prisma.collectionPoint.findMany();
    return apiSuccess({ count: points.length, points });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

