import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminOverviewPage() {
  await requireRole(["ADMIN"]);

  // M1: Pending recyclers
  const pendingRecyclersCount = await prisma.recycler.count({
    where: { authorizationStatus: "PENDING" },
  });

  // M2: Price records
  const priceCount = await prisma.pricePoint.count();

  // M3: Open anomaly flags
  const openFlagsCount = await prisma.anomalyFlag.count({
    where: { status: "OPEN" },
  });

  // M4: Images & Lots
  const imageCount = await prisma.lotImage.count();
  const lotCount = await prisma.lot.count();

  // M5: Total weight routed & collector payouts
  const completedHandovers = await prisma.handover.findMany({
    where: { status: "CONFIRMED" },
    select: { confirmedWeightGrams: true },
  });
  const totalGrams = completedHandovers.reduce((acc, h) => acc + (h.confirmedWeightGrams || 0), 0);
  const totalKg = (totalGrams / 1000).toFixed(0);

  const payments = await prisma.payment.findMany({
    select: { amountPaise: true },
  });
  const totalPaidRupees = (payments.reduce((acc, p) => acc + p.amountPaise, 0) / 100).toLocaleString("en-IN");

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Admin Platform Control Center</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          Live monitoring across recyclers, price integrity, anomaly alarms, AI datasets, and formalization impact.
        </p>
      </div>

      <div className="grid-3">
        <Link href="/admin/recyclers" className="stat-box" style={{ display: "block" }}>
          <div className="stat-label">M1 Pending Verifications</div>
          <div className="stat-value" style={{ color: pendingRecyclersCount > 0 ? "var(--warning)" : "var(--success)" }}>
            {pendingRecyclersCount}
          </div>
          <small style={{ color: "var(--text-muted)" }}>Recyclers awaiting authorization review</small>
        </Link>

        <Link href="/admin/anomalies" className="stat-box" style={{ display: "block" }}>
          <div className="stat-label">M3 Open Anomaly Alerts</div>
          <div className="stat-value" style={{ color: openFlagsCount > 0 ? "var(--danger)" : "var(--success)" }}>
            {openFlagsCount}
          </div>
          <small style={{ color: "var(--text-muted)" }}>Price outliers, weight discrepancies, GPS spoofs</small>
        </Link>

        <Link href="/admin/prices" className="stat-box" style={{ display: "block" }}>
          <div className="stat-label">M2 Price Records</div>
          <div className="stat-value">{priceCount}</div>
          <small style={{ color: "var(--text-muted)" }}>Scrap dealer &amp; recycler price points</small>
        </Link>
      </div>

      <div className="grid-3" style={{ marginTop: "1rem" }}>
        <Link href="/admin/dataset-health" className="stat-box" style={{ display: "block" }}>
          <div className="stat-label">M4 Dataset Volume</div>
          <div className="stat-value">{imageCount} <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>images / {lotCount} lots</span></div>
          <small style={{ color: "var(--text-muted)" }}>AI classification &amp; valuation dataset</small>
        </Link>

        <Link href="/admin/impact" className="stat-box" style={{ display: "block" }}>
          <div className="stat-label">M5 Circular Volume</div>
          <div className="stat-value">{totalKg} kg</div>
          <small style={{ color: "var(--text-muted)" }}>Routed to authorized recyclers</small>
        </Link>

        <Link href="/admin/impact" className="stat-box" style={{ display: "block" }}>
          <div className="stat-label">M5 Collector Payouts</div>
          <div className="stat-value">₹{totalPaidRupees}</div>
          <small style={{ color: "var(--text-muted)" }}>Total cash &amp; UPI paid to collectors</small>
        </Link>
      </div>
    </div>
  );
}

