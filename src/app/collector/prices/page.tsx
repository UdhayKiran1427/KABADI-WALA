import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateCategoryPriceBoard } from "@/lib/domain/priceBoard";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            आज के ई-कचरा भाव / Daily Rates
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>मुम्बई मार्केट एवं रिसाइक्लर भाव / Mumbai District</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {boardData.map(({ category, board }) => {
          const rateRupees = (board.currentMedianPaise / 100).toFixed(0);
          const lowRupees = (board.marketLowPaise / 100).toFixed(0);
          const highRupees = (board.marketHighPaise / 100).toFixed(0);

          const trendIcon = board.trend === "UP" ? "🟢 ↑" : board.trend === "DOWN" ? "🔴 ↓" : "⚪ ↔";
          const trendColor = board.trend === "UP" ? "#059669" : board.trend === "DOWN" ? "#dc2626" : "#64748b";

          return (
            <div
              key={category.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                padding: "1rem",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b" }}>{category.nameHi}</span>
                  {category.isHazardous && <span title="Hazardous Material">⚠️</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                  {category.nameEn} • {category.nameMr}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                  बाजार रेंज: ₹{lowRupees} - ₹{highRupees} / kg
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#065f46" }}>
                  ₹{rateRupees}
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>/kg</span>
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: trendColor, marginTop: "0.15rem" }}>
                  {trendIcon} {board.trend}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
