import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateCategoryPriceBoard } from "@/lib/domain/priceBoard";
import { VoicePriceRow } from "@/components/voice/VoicePriceRow";
import { PageTitle, PageVoice } from "../ui";

export default async function CollectorPriceBoardPage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

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
    },
  });

  const recyclerRates = await prisma.recyclerRate.findMany({
    where: { isCurrent: true },
    select: {
      categoryId: true,
      ratePerKgPaise: true,
    },
  });

  const boardData = categories.map((cat) => {
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
      category: cat,
      board,
    };
  });

  return (
    <div className="c-page">
      <PageVoice
        en="Today's prices. Tap a material to hear its price."
        hi="आज के भाव। भाव सुनने के लिए किसी सामान पर दबाएं।"
        mr="आजचे भाव. भाव ऐकण्यासाठी साहित्यावर दाबा."
      />
      <PageTitle title={{ hi: "आज के भाव", en: "Today's prices", mr: "आजचे भाव" }} back="/collector" />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {boardData.map(({ category, board }) => {
          const rateRupees = (board.currentMedianPaise / 100).toFixed(0);
          const lowRupees = (board.marketLowPaise / 100).toFixed(0);
          const highRupees = (board.marketHighPaise / 100).toFixed(0);

          return (
            <VoicePriceRow
              key={category.id}
              id={String(category.id)}
              nameEn={category.nameEn}
              nameHi={category.nameHi}
              nameMr={category.nameMr || undefined}
              code={category.code}
              rateRupees={rateRupees}
              lowRupees={lowRupees}
              highRupees={highRupees}
              trend={board.trend}
              isHazardous={category.isHazardous}
            />
          );
        })}
      </div>
    </div>
  );
}
