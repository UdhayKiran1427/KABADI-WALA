import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CollectorDashboardClient } from "./CollectorDashboardClient";

const LOTS_SHOWN = 10;

export default async function CollectorDashboardPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
    select: { id: true },
  });

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

  return <CollectorDashboardClient lots={lots.slice(0, LOTS_SHOWN)} hasMore={lots.length > LOTS_SHOWN} />;
}
