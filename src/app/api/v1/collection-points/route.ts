import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const latStr = url.searchParams.get("latitude");
    const lngStr = url.searchParams.get("longitude");
    const radiusStr = url.searchParams.get("radiusKm") || "30";

    const points = await prisma.collectionPoint.findMany();

    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const radiusKm = parseFloat(radiusStr);

      const withDist = points
        .map((p) => {
          const distanceKm = calculateHaversineDistanceKm(lat, lng, p.latitude, p.longitude);
          return { ...p, distanceKm };
        })
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return apiSuccess({ count: withDist.length, points: withDist });
    }

    return apiSuccess({ count: points.length, points });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

