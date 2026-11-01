import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { roundCoordinateTo100m } from "@/lib/domain/anonymization";
import { impactWindowStart, monthlyKg } from "@/lib/domain/impact";

export default async function AdminImpactPage() {
  await requireRole(["ADMIN"]);

  const now = new Date();

  // Totals are computed by the database, not by loading every row.
  const [weightSum, collectorsCount, paidSum, monthlyRows, coverageRequests] = await Promise.all([
    prisma.handover.aggregate({ where: { status: "CONFIRMED" }, _sum: { confirmedWeightGrams: true } }),
    prisma.collector.count(),
    prisma.payment.aggregate({ _sum: { amountPaise: true } }),
    // Only the last 6 months, only the two columns we bucket.
    prisma.handover.findMany({
      where: { status: "CONFIRMED", capturedAt: { gte: impactWindowStart(now) } },
      select: { confirmedWeightGrams: true, capturedAt: true },
    }),
    // Newest 5000 requests are plenty for a ~100m demand heatmap.
    prisma.coverageRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { latitude: true, longitude: true, approxWeightGrams: true },
    }),
  ]);

  const totalKg = Math.round((weightSum._sum.confirmedWeightGrams ?? 0) / 1000);
  const totalPaidRupees = (paidSum._sum.amountPaise ?? 0) / 100;
  const totalPaidLakhs = (totalPaidRupees / 100000).toFixed(1);

  const monthsData = monthlyKg(
    monthlyRows.map((h) => ({ capturedAt: h.capturedAt, grams: h.confirmedWeightGrams })),
    now
  );
  const maxKg = Math.max(...monthsData.map((m) => m.kg), 1);

  // Group by rounded 100m lat/lng cells
  const cellMap = new Map<string, { lat: number; lng: number; count: number; totalWeightKg: number }>();
  for (const cr of coverageRequests) {
    const rLat = roundCoordinateTo100m(cr.latitude) || 0;
    const rLng = roundCoordinateTo100m(cr.longitude) || 0;
    const key = `${rLat},${rLng}`;
    const cell = cellMap.get(key) || { lat: rLat, lng: rLng, count: 0, totalWeightKg: 0 };
    cell.count += 1;
    cell.totalWeightKg += cr.approxWeightGrams / 1000;
    cellMap.set(key, cell);
  }
  const heatmapCells = Array.from(cellMap.values()).sort((x, y) => y.count - x.count);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="r-page-title">Impact</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid-3">
        <div className="stat-box">
          <div className="stat-label">Kg recycled</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>{totalKg.toLocaleString("en-IN")} kg</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Collectors</div>
          <div className="stat-value">{collectorsCount}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Paid to collectors</div>
          <div className="stat-value" style={{ color: "#0284c7" }}>₹{totalPaidLakhs}L</div>
          <small style={{ color: "var(--text-muted)" }}>₹{totalPaidRupees.toLocaleString("en-IN")}</small>
        </div>
      </div>

      {/* Monthly Routed Volume Bar Chart */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Kg per month</h2>

        <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "160px", borderBottom: "2px solid #cbd5e1", paddingBottom: "0.5rem" }}>
            {monthsData.map((m) => {
              const heightPercent = Math.max(15, (m.kg / maxKg) * 100);
              return (
                <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "50px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>
                    {m.kg}kg
                  </span>
                  <div
                    style={{
                      width: "36px",
                      height: `${heightPercent}%`,
                      background: "linear-gradient(180deg, #15803d 0%, #16a34a 100%)",
                      borderRadius: "4px 4px 0 0",
                    }}
                  />
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Unit Economics Template */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Unit economics</h2>
          <div style={{ fontSize: "0.875rem", lineHeight: "1.8", color: "var(--text)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.5rem 0" }}>
              <span>Traditional Middleman Price (e.g. PCB):</span>
              <strong>₹250/kg</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.5rem 0" }}>
              <span>Direct Authorized Recycler Price:</span>
              <strong style={{ color: "var(--primary)" }}>₹340/kg (+36%)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.5rem 0" }}>
              <span>Average Monthly Lot Weight per Collector:</span>
              <span>120 kg</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.5rem 0" }}>
              <span>Monthly Extra Earnings per Collector:</span>
              <strong style={{ color: "var(--success)" }}>+₹10,800 / month</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
              <span>Platform Take-Rate (Authorized Recycler EPR Fee):</span>
              <strong>2.5%</strong>
            </div>
          </div>
        </div>

        {/* Coverage Gap Heatmap (100m cells) */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Areas with no recycler</h2>

          {heatmapCells.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", background: "#f8fafc", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              No uncovered areas yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Cell (~100m)</th>
                    <th>Requests</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapCells.slice(0, 5).map((cell, idx) => (
                    <tr key={idx}>
                      <td><code>{cell.lat}, {cell.lng}</code></td>
                      <td><span className="badge badge-warning">{cell.count} requests</span></td>
                      <td><strong>{cell.totalWeightKg.toFixed(1)} kg</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

