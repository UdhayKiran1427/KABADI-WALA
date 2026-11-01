import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function FieldAgentDashboardPage(props: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  // Counts
  const collectorCount = await prisma.collector.count();
  const spotPriceCount = await prisma.pricePoint.count({ where: { source: "FIELD_AGENT" } });
  const trainingSampleCount = await prisma.trainingSample.count();
  const activePickupCount = await prisma.pickupRequest.count({
    where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
  });

  // Recent onboarded collectors
  const recentCollectors = await prisma.collector.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { phone: true } },
    },
  });

  // Recent active pickups
  const recentPickups = await prisma.pickupRequest.findMany({
    take: 3,
    orderBy: { slot: "desc" },
    include: {
      lot: { include: { category: true } },
      recycler: { select: { name: true } },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {searchParams.success && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            borderRadius: "10px",
            border: "1px solid #a7f3d0",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
          color: "#ffffff",
          padding: "1.5rem",
          borderRadius: "16px",
          boxShadow: "0 4px 15px rgba(30, 64, 175, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.05rem" }}>
              Field Operations Console
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.2rem" }}>
              Ground Operations &amp; Doorstep Logistics (F1–F4)
            </h1>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: "0.25rem", maxWidth: "600px" }}>
              Pick up heavy lots from collectors, weigh on portable scales, pay instant cash, and transport e-waste to authorized recyclers.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Pending Pickups</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fef08a" }}>{activePickupCount}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Collectors</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{collectorCount}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Spot Rates</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{spotPriceCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Logistics Action Card: F4 Doorstep Pickups */}
      <div
        className="card"
        style={{
          border: "2px solid #3b82f6",
          backgroundColor: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.8rem" }}>🚚</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
              F4: Doorstep Pickups &amp; Cash Handover (घर से उठाव व नकद भुगतान)
            </h2>
          </div>
          <p style={{ color: "#475569", fontSize: "0.85rem", margin: 0, maxWidth: "650px" }}>
            Go to collectors with a vehicle &amp; portable digital scale. Weigh scrap on-site, verify 4-digit code, disburse cash to collector, and transport e-waste back to the recycler facility.
          </p>
        </div>
        <Link
          href="/field/pickups"
          className="btn btn-primary"
          style={{ backgroundColor: "#2563eb", padding: "0.75rem 1.5rem", fontSize: "0.95rem", fontWeight: 700 }}
        >
          View Pickup Tasks ({activePickupCount}) &rarr;
        </Link>
      </div>

      {/* 3 Core Tools Grid (F1-F3) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {/* F1 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              F1: Onboard Collector
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1rem" }}>
              Quickly register informal scrap collectors with zero identity documents. Generates instant 4-digit PIN and shortCode.
            </p>
          </div>
          <Link href="/field/onboard" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Open Onboarding Form &rarr;
          </Link>
        </div>

        {/* F2 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏷️</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              F2: Log Spot Prices
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1rem" }}>
              Record spot buying prices at local kabadi dukaan / scrap dealers. Feeds the 30-day median pricing board.
            </p>
          </div>
          <Link href="/field/prices" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Log Market Price &rarr;
          </Link>
        </div>

        {/* F3 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📷</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              F3: Training Photos
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1rem" }}>
              Capture and label e-waste photos (PCBs, batteries, cables, CRT) to train the AI image classifier.
            </p>
          </div>
          <Link href="/field/training" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Capture Labeled Photo &rarr;
          </Link>
        </div>
      </div>

      {/* Recent Onboarded Collectors */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>हाल ही में ऑनबोर्ड किए गए कलेक्टर / Recent Collectors</h2>
          <Link href="/field/onboard" style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>
            + Onboard New
          </Link>
        </div>

        {recentCollectors.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
            No collectors onboarded yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentCollectors.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <span className="badge" style={{ backgroundColor: "#dbeafe", color: "#1e40af", fontWeight: 700, marginRight: "0.5rem" }}>
                    #{c.shortCode}
                  </span>
                  <span>{c.user.phone}</span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {c.operatingArea} &bull; {new Date(c.createdAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
