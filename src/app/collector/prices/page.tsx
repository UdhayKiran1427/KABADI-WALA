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
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          href="/collector"
          className="btn btn-secondary btn-sm"
          style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
        >
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
            आज के ई-कचरा भाव &bull; Daily Rates
          </h1>
          <div style={{ fontSize: "0.775rem", color: "var(--slate-500)" }}>
            मुम्बई स्क्रैप मार्केट एवं अधिकृत रिसाइक्लर स्पॉट रेट
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#ffffff",
          borderRadius: "var(--radius)",
          border: "1px solid var(--slate-200)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8rem",
          color: "var(--slate-600)",
        }}
      >
        <span>📅 अपडेट: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        <span className="badge badge-success">✓ Live Rates</span>
      </div>

      {/* Rate Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {boardData.map(({ category, board }) => {
          const rateRupees = (board.currentMedianPaise / 100).toFixed(0);
          const lowRupees = (board.marketLowPaise / 100).toFixed(0);
          const highRupees = (board.marketHighPaise / 100).toFixed(0);

          const trendBadge =
            board.trend === "UP"
              ? "badge badge-success"
              : board.trend === "DOWN"
              ? "badge badge-danger"
              : "badge badge-neutral";

          const trendLabel =
            board.trend === "UP" ? "↑ चढ़ रहा (Up)" : board.trend === "DOWN" ? "↓ गिर रहा (Down)" : "↔ स्थिर (Stable)";

          return (
            <div
              key={category.id}
              className="card"
              style={{
                padding: "1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>
                      {category.nameHi}
                    </span>
                    {category.isHazardous && (
                      <span className="badge badge-danger" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                        खतरनाक
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
                    {category.nameEn} &bull; {category.nameMr}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--primary-800)", lineHeight: 1.1 }}>
                    ₹{rateRupees}
                    <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--slate-500)" }}> /kg</span>
                  </div>
                  <div style={{ marginTop: "0.25rem" }}>
                    <span className={trendBadge} style={{ fontSize: "0.675rem" }}>
                      {trendLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Range & Action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.6rem",
                  borderTop: "1px solid var(--slate-100)",
                  fontSize: "0.75rem",
                }}
              >
                <div style={{ color: "var(--slate-500)" }}>
                  बाजार रेंज: <strong>₹{lowRupees} &ndash; ₹{highRupees}</strong> / kg
                </div>
                <Link
                  href={`/collector/create-lot?categoryId=${category.id}`}
                  style={{
                    color: "var(--primary-700)",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  + लॉट बनाएं &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
