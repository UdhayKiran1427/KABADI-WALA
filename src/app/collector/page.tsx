import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CollectorDashboardClient } from "./CollectorDashboardClient";

export default async function CollectorDashboardPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  const collectorId = collector?.id;

  // 1. Fetch recent lots for collector
  const recentLots = collectorId
    ? await prisma.lot.findMany({
        where: { collectorId },
        orderBy: { collectedAt: "desc" },
        take: 5,
        include: {
          category: true,
          handovers: { select: { verificationCode: true, status: true }, take: 1 },
        },
      })
    : [];

  const activeCount = recentLots.filter(
    (l) => l.status !== "COMPLETED" && l.status !== "CANCELLED" && l.status !== "REJECTED"
  ).length;

  // 2. Fetch categories and live rates for desktop sidebar
  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
    take: 6,
  });

  const currentRates = await prisma.recyclerRate.findMany({
    where: { isCurrent: true },
    select: { categoryId: true, ratePerKgPaise: true },
  });

  // 3. Fetch verified recyclers for desktop sidebar
  const verifiedRecyclers = await prisma.recycler.findMany({
    where: { authorizationStatus: "VERIFIED" },
    take: 2,
    select: { id: true, name: true, address: true, contactPhone: true, pickupAvailable: true },
  });

  return (
    <CollectorDashboardClient
      collector={collector ? { shortCode: collector.shortCode, operatingArea: collector.operatingArea } : null}
      activeCount={activeCount}
      recentLots={recentLots}
      categories={categories}
      currentRates={currentRates}
      verifiedRecyclers={verifiedRecyclers}
    />
  );
}
