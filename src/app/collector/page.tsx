import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CollectorDashboardClient } from "./CollectorDashboardClient";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";

const LOTS_SHOWN = 10;

export default async function CollectorDashboardPage(props: {
  searchParams?: Promise<{ denied?: string }>;
}) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const searchParams = props.searchParams ? await props.searchParams : {};
  const roleDeniedNotice = searchParams?.denied === "role_forbidden";

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
    select: { id: true, operatingArea: true },
  });

  const camp = await prisma.collectionPoint.findFirst({
    where: { type: "CAMP" },
  });

  let campBanner = null;
  if (camp) {
    const dist = calculateHaversineDistanceKm(19.0434, 72.8567, camp.latitude, camp.longitude);
    if (dist <= 10) {
      campBanner = {
        name: camp.name,
        distanceKm: dist,
        dates: camp.operatingDates || "This Saturday & Sunday",
        address: camp.address,
      };
    }
  }

  const lots = collector
    ? await prisma.lot.findMany({
        where: { collectorId: collector.id },
        orderBy: { collectedAt: "desc" },
        take: LOTS_SHOWN + 1,
        select: {
          id: true,
          approxWeightGrams: true,
          status: true,
          estimatedValuePaise: true,
          finalPricePaise: true,
          category: { select: { nameEn: true, nameHi: true, nameMr: true } },
          _count: { select: { items: true } },
        },
      })
    : [];

  return (
    <CollectorDashboardClient
      lots={lots.slice(0, LOTS_SHOWN)}
      hasMore={lots.length > LOTS_SHOWN}
      campBanner={campBanner}
      roleDeniedNotice={roleDeniedNotice}
    />
  );
}
