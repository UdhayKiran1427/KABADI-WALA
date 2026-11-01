import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { addPriceRecordAction, deletePriceRecordAction } from "../actions";

export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { categoryId: selectedCatIdStr } = await searchParams;

  const categories = await prisma.materialCategory.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  const selectedCategoryId = selectedCatIdStr ? parseInt(selectedCatIdStr, 10) : categories[0]?.id || 1;
  const currentCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  // Fetch prices for this category over the last 8 weeks (56 days)
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
  const prices = await prisma.pricePoint.findMany({
    where: {
      categoryId: selectedCategoryId,
      recordedAt: { gte: eightWeeksAgo },
    },
    orderBy: { recordedAt: "desc" },
  });

  // Fetch active recycler rates for this category
  const recyclerRates = await prisma.recyclerRate.findMany({
    where: {
      categoryId: selectedCategoryId,
      isCurrent: true,
      recycler: { authorizationStatus: "VERIFIED" },
    },
    select: { ratePerKgPaise: true },
  });

  const recyclerRateNums = recyclerRates.map((r) => r.ratePerKgPaise / 100);
  const recyclerMin = recyclerRateNums.length > 0 ? Math.min(...recyclerRateNums) : 0;
  const recyclerMax = recyclerRateNums.length > 0 ? Math.max(...recyclerRateNums) : 0;

  // Compute 8 weekly buckets for SVG trend line
  const weeklyBuckets: Array<{ weekLabel: string; medianRupees: number; count: number }> = [];
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  for (let i = 7; i >= 0; i--) {
    const start = new Date(now - (i + 1) * ONE_WEEK_MS);
    const end = new Date(now - i * ONE_WEEK_MS);
    const weekPrices = prices
      .filter((p) => p.recordedAt >= start && p.recordedAt < end)
      .map((p) => p.buyingPricePaise / 100)
      .sort((a, b) => a - b);

    const median =
      weekPrices.length > 0
        ? weekPrices[Math.floor(weekPrices.length / 2)]
        : 320; // default baseline if empty

    weeklyBuckets.push({
      weekLabel: `W${8 - i}`,
      medianRupees: Math.round(median),
      count: weekPrices.length,
    });
  }

  // Calculate SVG polyline points (width 600, height 180)
  const chartWidth = 560;
  const chartHeight = 140;
  const maxPrice = Math.max(...weeklyBuckets.map((w) => w.medianRupees), 400);
  const minPrice = Math.max(0, Math.min(...weeklyBuckets.map((w) => w.medianRupees), 200) - 50);

  const points = weeklyBuckets
    .map((w, index) => {
      const x = 30 + (index * (chartWidth - 60)) / 7;
      const y = chartHeight - 20 - ((w.medianRupees - minPrice) / (maxPrice - minPrice || 1)) * (chartHeight - 40);
      return `${x},${y}`;
    })
    .join(" ");

  const latestMedian = weeklyBuckets[7].medianRupees;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>M2 Price Dataset &amp; Trends</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Clean, manage, and export spot prices. Watch weekly trends and recycler spread.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href="/api/v1/admin/prices/export" className="btn btn-secondary">
            📥 Export CSV
          </a>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.75rem", marginBottom: "1.5rem" }}>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/admin/prices?categoryId=${cat.id}`}
            className={`btn ${cat.id === selectedCategoryId ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}
          >
            {cat.nameEn}
          </Link>
        ))}
      </div>

      {/* M2 SVG Weekly Trend Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {currentCategory?.nameEn} — 8-Week Trend
            </h2>
            <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Current Market Median: <strong>₹{latestMedian}/kg</strong> &bull; Recycler Offers: <strong>₹{recyclerMin} – ₹{recyclerMax}/kg</strong>
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
            ₹{latestMedian}/kg
          </div>
        </div>

        {/* SVG Chart */}
        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "1rem", display: "flex", justifyContent: "center" }}>
          <svg viewBox="0 0 580 160" style={{ width: "100%", maxHeight: "200px" }}>
            <line x1="30" y1="120" x2="550" y2="120" stroke="#cbd5e1" strokeDasharray="4" />
            <line x1="30" y1="30" x2="550" y2="30" stroke="#cbd5e1" strokeDasharray="4" />
            <text x="5" y="35" fill="#94a3b8" fontSize="10">₹{maxPrice}</text>
            <text x="5" y="125" fill="#94a3b8" fontSize="10">₹{minPrice}</text>

            <polyline fill="none" stroke="#0284c7" strokeWidth="3" points={points} />

            {weeklyBuckets.map((w, index) => {
              const x = 30 + (index * (chartWidth - 60)) / 7;
              const y = chartHeight - 20 - ((w.medianRupees - minPrice) / (maxPrice - minPrice || 1)) * (chartHeight - 40);
              return (
                <g key={w.weekLabel}>
                  <circle cx={x} cy={y} r="5" fill="#0284c7" />
                  <text x={x} y={y - 10} fill="#0f172a" fontSize="11" fontWeight="600" textAnchor="middle">
                    ₹{w.medianRupees}
                  </text>
                  <text x={x} y="150" fill="#64748b" fontSize="11" textAnchor="middle">
                    {w.weekLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid-2">
        {/* Spot Price Logger */}
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Add Ground Price Record</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
            Log price data gathered from informal scrap dealers or regional hubs.
          </p>

          <form action={addPriceRecordAction}>
            <input type="hidden" name="categoryId" value={selectedCategoryId} />

            <div className="form-group">
              <label className="form-label" htmlFor="buyingPriceRupees">Buying Price (₹/kg)</label>
              <input id="buyingPriceRupees" name="buyingPriceRupees" type="number" step="0.5" defaultValue={latestMedian} className="form-control" required />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="area">Market / Area</label>
                <input id="area" name="area" type="text" defaultValue="Dharavi Hub" className="form-control" required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="buyerType">Dealer Type</label>
                <select id="buyerType" name="buyerType" className="form-control" defaultValue="SCRAP_DEALER">
                  <option value="SCRAP_DEALER">Scrap Dealer (Kabadiwala)</option>
                  <option value="RECYCLER">Formal Recycler</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", background: "#0284c7" }}>
              + Save Price Record
            </button>
          </form>
        </div>

        {/* Recent Ground Prices List */}
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Recent Records ({prices.length})</h2>
          <div className="table-responsive" style={{ maxHeight: "320px", overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Area</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Clean</th>
                </tr>
              </thead>
              <tbody>
                {prices.slice(0, 15).map((p) => (
                  <tr key={p.id}>
                    <td><strong>₹{(p.buyingPricePaise / 100).toFixed(0)}/kg</strong></td>
                    <td>{p.area}</td>
                    <td><span className="badge badge-neutral">{p.source}</span></td>
                    <td>{p.recordedAt.toISOString().split("T")[0]}</td>
                    <td>
                      <form action={deletePriceRecordAction.bind(null, p.id)}>
                        <button type="submit" className="btn btn-danger" style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem" }}>
                          &times;
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

