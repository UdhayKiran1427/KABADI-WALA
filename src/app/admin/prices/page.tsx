import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronDown, CircleAlert, CircleCheck, Download, Plus, Save, X } from "lucide-react";
import { addPriceRecordAction, deletePriceRecordAction, setTodayPricesAction } from "../actions";
import { getTodayRates } from "@/lib/services/lotFlowService";

export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; error?: string; success?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { categoryId: selectedCatIdStr, error, success } = await searchParams;
  const todayRates = await getTodayRates();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
    <div className="r-stack">
      <h1 className="r-page-title">Today&apos;s Prices</h1>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <CircleCheck size={18} aria-hidden="true" /> {success}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <CircleAlert size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {/* Today's price per category - used to value new collector lots */}
      <div className="card" style={{ border: "2px solid var(--primary)" }}>
        <p className="r-muted" style={{ marginBottom: "1rem" }}>
          ₹ per kg. Leave blank to keep the current price.
        </p>
        <form action={setTodayPricesAction}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            {categories.map((cat) => {
              const current = todayRates.get(cat.id);
              const isToday = current && current.recordedAt >= startOfToday;
              return (
                <label key={cat.id} className="form-group" style={{ marginBottom: 0 }}>
                  <span className="form-label" style={{ fontWeight: 700 }}>{cat.nameEn}</span>
                  <input
                    name={`price_${cat.id}`}
                    type="number"
                    min="0.5"
                    step="0.5"
                    inputMode="decimal"
                    placeholder={current ? (current.ratePerKgPaise / 100).toFixed(2) : "Not set"}
                    className="form-control"
                    style={{ fontSize: "1.1rem", padding: "0.65rem 0.75rem" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: isToday ? "var(--primary-800)" : current ? "var(--text-muted)" : "var(--danger)" }}>
                    {current
                      ? `Now ₹${(current.ratePerKgPaise / 100).toFixed(2)} · ${isToday ? "today" : current.recordedAt.toLocaleDateString("en-IN")}`
                      : "Not set – collectors can't list this"}
                  </span>
                </label>
              );
            })}
          </div>
          <button type="submit" className="btn btn-primary btn-lg">
            <Save size={18} aria-hidden="true" /> Save prices
          </button>
        </form>
      </div>

      {/* Secondary: market price records and trend */}
      <details className="card r-details" open={Boolean(selectedCatIdStr)}>
        <summary>
          Market price records <ChevronDown size={18} aria-hidden="true" />
        </summary>

        <div className="r-stack">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", maxWidth: "100%" }}>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/admin/prices?categoryId=${cat.id}`}
                  className={`btn btn-sm ${cat.id === selectedCategoryId ? "btn-primary" : "btn-secondary"}`}
                >
                  {cat.nameEn}
                </Link>
              ))}
            </div>
            <a href="/api/v1/admin/prices/export" className="btn btn-sm btn-secondary">
              <Download size={15} aria-hidden="true" /> Export CSV
            </a>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <h2 className="r-section-title">{currentCategory?.nameEn} – last 8 weeks</h2>
              <div className="r-muted">
                Median <strong>₹{latestMedian}/kg</strong> · Recyclers <strong>₹{recyclerMin}–₹{recyclerMax}/kg</strong>
              </div>
            </div>

            <div style={{ background: "var(--slate-50)", borderRadius: "8px", padding: "1rem", display: "flex", justifyContent: "center" }}>
              <svg
                viewBox="0 0 580 160"
                style={{ width: "100%", maxHeight: "200px" }}
                role="img"
                aria-label={`Weekly median price for ${currentCategory?.nameEn ?? "category"}`}
              >
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

          <div className="r-grid-2-lg">
            <form action={addPriceRecordAction} style={{ minWidth: 0 }}>
              <h3 className="r-section-title" style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Add market price</h3>
              <input type="hidden" name="categoryId" value={selectedCategoryId} />

              <div className="form-group">
                <label className="form-label" htmlFor="buyingPriceRupees">Price (₹/kg)</label>
                <input id="buyingPriceRupees" name="buyingPriceRupees" type="number" step="0.5" defaultValue={latestMedian} className="form-control" required />
              </div>

              <div className="r-grid-2" style={{ gap: "0 0.75rem" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="area">Area</label>
                  <input id="area" name="area" type="text" defaultValue="Dharavi Hub" className="form-control" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="buyerType">Buyer</label>
                  <select id="buyerType" name="buyerType" className="form-control" defaultValue="SCRAP_DEALER">
                    <option value="SCRAP_DEALER">Scrap dealer</option>
                    <option value="RECYCLER">Recycler</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-secondary btn-block">
                <Plus size={16} aria-hidden="true" /> Add record
              </button>
            </form>

            <div style={{ minWidth: 0 }}>
              <h3 className="r-section-title" style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Recent records ({prices.length})</h3>
              <div className="table-responsive" style={{ maxHeight: "320px", overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Price</th>
                      <th>Area</th>
                      <th>Source</th>
                      <th>Date</th>
                      <th aria-label="Delete"></th>
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
                            <button
                              type="submit"
                              className="btn btn-danger btn-sm"
                              style={{ padding: "0.2rem 0.35rem" }}
                              aria-label={`Delete record ₹${(p.buyingPricePaise / 100).toFixed(0)}/kg, ${p.area}`}
                            >
                              <X size={14} aria-hidden="true" />
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
      </details>
    </div>
  );
}
