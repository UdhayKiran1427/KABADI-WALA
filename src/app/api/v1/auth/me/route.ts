import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";

/**
 * Profile of the signed-in user. `collector` is set for collectors, `recycler` for recycler staff.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireApiUser(req, ["COLLECTOR", "RECYCLER", "ADMIN", "FIELD_AGENT"]);
    if (response) return response;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { collector: true, recyclerStaff: { include: { recycler: true } } },
    });
    const collector = dbUser?.collector;
    const recycler = dbUser?.recyclerStaff?.recycler;

    return apiSuccess({
      userId: user.userId,
      phone: user.phone,
      role: user.role,
      language: dbUser?.language,
      // Kept at the top level for existing collector app builds
      collectorId: collector?.id,
      shortCode: collector?.shortCode,
      preferredLanguage: collector?.preferredLanguage,
      operatingArea: collector?.operatingArea,
      district: collector?.district,
      collector: collector
        ? {
            id: collector.id,
            name: collector.name,
            shortCode: collector.shortCode,
            preferredLanguage: collector.preferredLanguage,
            operatingArea: collector.operatingArea,
            district: collector.district,
          }
        : null,
      recycler: recycler
        ? {
            id: recycler.id,
            name: recycler.name,
            address: recycler.address,
            contactPhone: recycler.contactPhone,
            authorizationStatus: recycler.authorizationStatus,
            latitude: recycler.latitude,
            longitude: recycler.longitude,
          }
        : null,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
