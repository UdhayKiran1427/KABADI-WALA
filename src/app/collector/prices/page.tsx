import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateCategoryPriceBoard } from "@/lib/domain/priceBoard";
import { PageTitle, PageVoice } from "../ui";
import { PricesBoardClient, type CategoryBoardItem, type NearbyAreaItem } from "./PricesBoardClient";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";

export default async function CollectorPriceBoardPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  const collectorLat = 19.0434;
  const collectorLng = 72.8567;

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const past14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const pricePoints = await prisma.pricePoint.findMany({
    where: {
      recordedAt: { gte: past14Days },
    },
    select: {
      categoryId: true,
      buyingPricePaise: true,
      recordedAt: true,
      area: true,
    },
  });

  const recyclerRates = await prisma.recyclerRate.findMany({
    where: { isCurrent: true },
    select: {
      categoryId: true,
      ratePerKgPaise: true,
    },
  });

  const boardCategories: CategoryBoardItem[] = categories.map((cat) => {
    const recentPrices = pricePoints
      .filter((p) => p.categoryId === cat.id && p.recordedAt >= past7Days)
      .map((p) => p.buyingPricePaise);

    const priorPrices = pricePoints
      .filter((p) => p.categoryId === cat.id && p.recordedAt < past7Days)
      .map((p) => p.buyingPricePaise);

    const catRecyclerRates = recyclerRates
      .filter((r) => r.categoryId === cat.id)
      .map((r) => r.ratePerKgPaise);

    const board = generateCategoryPriceBoard(cat.id, recentPrices, priorPrices, catRecyclerRates);

    return {
      id: String(cat.id),
      nameEn: cat.nameEn,
      nameHi: cat.nameHi,
      nameMr: cat.nameMr || undefined,
      code: cat.code,
      rateRupees: (board.currentMedianPaise / 100).toFixed(0),
      lowRupees: (board.marketLowPaise / 100).toFixed(0),
      highRupees: (board.marketHighPaise / 100).toFixed(0),
      trend: board.trend,
      isHazardous: cat.isHazardous,
      ratePaise: board.currentMedianPaise,
    };
  });

  // Fetch nearby area centroids (excluding current area)
  const centroids = await prisma.areaCentroid.findMany();
  const nearbyAreas: NearbyAreaItem[] = (
    centroids.length > 0
      ? centroids
      : [
          { area: "Kurla West", district: "Mumbai", latitude: 19.0688, longitude: 72.8797 },
          { area: "Sion West", district: "Mumbai", latitude: 19.0430, longitude: 72.8634 },
          { area: "Bandra East", district: "Mumbai", latitude: 19.0596, longitude: 72.8450 },
        ]
  )
    .filter((c) => !collector?.operatingArea || !c.area.toLowerCase().includes("dharavi"))
    .map((c) => {
      const distanceKm = calculateHaversineDistanceKm(collectorLat, collectorLng, c.latitude, c.longitude);
      // Determine sample rates per category in this area (+₹10 to +₹30 variance)
      const rates: Record<string, number> = {};
      for (const cat of boardCategories) {
        rates[cat.id] = cat.ratePaise + (c.area.includes("Kurla") ? 2500 : c.area.includes("Bandra") ? 3500 : 1500);
      }
      return {
        areaName: c.area,
        distanceKm,
        latitude: c.latitude,
        longitude: c.longitude,
        rates,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  return (
    <div className="c-page">
      <PageVoice
        en="Today's prices. Tap a material to hear its price, or toggle Nearby areas to compare rates."
        hi="आज के भाव। भाव सुनने के लिए किसी सामान पर दबाएं, या आस-पास के भाव तुलना करने के लिए टॉगल करें।"
        mr="आजचे भाव. भाव ऐकण्यासाठी साहित्यावर दाबा, किंवा जवळपासचे भाव तुलना करा."
      />
      <PageTitle title={{ hi: "आज के भाव", en: "Today's prices", mr: "आजचे भाव" }} back="/collector" />

      <PricesBoardClient categories={boardCategories} nearbyAreas={nearbyAreas} />
    </div>
  );
}
