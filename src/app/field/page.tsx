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
    take: 5,
    orderBy: { slot: "desc" },
    include: {
      lot: { include: { category: true } },
      recycler: { select: { name: true } },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {searchParams.success && (
        <div className="alert alert-success">
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* Hero Banner with Operational Metrics */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
          color: "#ffffff",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              Ground Operations Console &bull; Modules F1–F4
            </div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, marginTop: "0.35rem", letterSpacing: "-0.02em" }}>
              Field Operations &amp; Doorstep Logistics Command
            </h1>
            <p style={{ fontSize: "0.95rem", color: "#e0e7ff", marginTop: "0.4rem", maxWidth: "680px", lineHeight: 1.5 }}>
              Bridge the informal waste economy: register pickers with zero identity friction, track street-level scrap prices, and execute mobile scale pickups.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.14)", padding: "0.75rem 1.15rem", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: "0.75rem", color: "#c7d2fe", fontWeight: 600 }}>Active Pickups</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fef08a", marginTop: "0.15rem" }}>{activePickupCount}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.14)", padding: "0.75rem 1.15rem", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: "0.75rem", color: "#c7d2fe", fontWeight: 600 }}>Collectors Enrolled</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.15rem" }}>{collectorCount}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.14)", padding: "0.75rem 1.15rem", borderRadius: "12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: "0.75rem", color: "#c7d2fe", fontWeight: 600 }}>Spot Rates Logged</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.15rem" }}>{spotPriceCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Logistics Action Banner: F4 Doorstep Pickups */}
      <div
        className="card"
        style={{
          border: "2px solid #6366f1",
          backgroundColor: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          padding: "1.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "1.85rem" }}>🚚</span>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e1b4b", margin: 0 }}>
              F4: Doorstep Pickups &amp; Cash Handover (घर से उठाव व नकद भुगतान)
            </h2>
          </div>
          <p style={{ color: "var(--slate-600)", fontSize: "0.875rem", margin: 0, maxWidth: "720px", lineHeight: 1.5 }}>
            Deploy field vehicles equipped with calibrated portable digital scales. Verify collector lot PIN on-site, disburse instant cash, and route scrap directly to licensed recyclers.
          </p>
        </div>
        <Link
          href="/field/pickups"
          className="btn btn-primary btn-lg"
          style={{ backgroundColor: "#4f46e5", padding: "0.85rem 1.75rem", fontSize: "0.95rem" }}
        >
          View Pickup Tasks ({activePickupCount}) &rarr;
        </Link>
      </div>

      {/* 3 Core Tools Grid (F1-F3) */}
      <div className="grid-3">
        {/* F1 */}
        <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.4rem" }}>
              F1: Onboard Collector
            </h2>
            <p style={{ color: "var(--slate-600)", fontSize: "0.825rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Quickly register informal scrap collectors with zero identity documents. Generates instant 4-digit PIN and shortCode.
            </p>
          </div>
          <Link href="/field/onboard" className="btn btn-secondary btn-block">
            Open Onboarding Form &rarr;
          </Link>
        </div>

        {/* F2 */}
        <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏷️</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.4rem" }}>
              F2: Log Spot Prices
            </h2>
            <p style={{ color: "var(--slate-600)", fontSize: "0.825rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Record spot buying prices at local kabadi dukaan / scrap dealers. Feeds the 30-day median pricing board.
            </p>
          </div>
          <Link href="/field/prices" className="btn btn-secondary btn-block">
            Log Market Price &rarr;
          </Link>
        </div>

        {/* F3 */}
        <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📷</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.4rem" }}>
              F3: AI Dataset Photos
            </h2>
            <p style={{ color: "var(--slate-600)", fontSize: "0.825rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Capture and label e-waste photos (PCBs, batteries, cables, CRT) to train the on-device AI visual grading classifier.
            </p>
          </div>
          <Link href="/field/training" className="btn btn-secondary btn-block">
            Capture Labeled Photo &rarr;
          </Link>
        </div>
      </div>

      {/* 2-Column Responsive Split for Recent Activity (Fills desktop width cleanly!) */}
      <div className="grid-2">
        {/* Recent Onboarded Collectors */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--slate-900)" }}>
              हाल ही में ऑनबोर्ड किए गए कलेक्टर / Recent Collectors
            </h2>
            <Link href="/field/onboard" style={{ fontSize: "0.8rem", color: "#4f46e5", fontWeight: 700 }}>
              + Onboard New
            </Link>
          </div>

          {recentCollectors.length === 0 ? (
            <div style={{ color: "var(--slate-500)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
              No collectors onboarded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {recentCollectors.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 0.85rem",
                    backgroundColor: "var(--slate-50)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--slate-200)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="badge badge-info" style={{ fontWeight: 800 }}>
                      #{c.shortCode}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--slate-800)" }}>{c.user.phone}</span>
                  </div>
                  <div style={{ color: "var(--slate-500)", fontSize: "0.775rem" }}>
                    {c.operatingArea} &bull; {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Doorstep Pickups */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--slate-900)" }}>
              हाल के पिकअप कार्य / Active Doorstep Tasks
            </h2>
            <Link href="/field/pickups" style={{ fontSize: "0.8rem", color: "#4f46e5", fontWeight: 700 }}>
              View All &rarr;
            </Link>
          </div>

          {recentPickups.length === 0 ? (
            <div style={{ color: "var(--slate-500)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
              No active pickups scheduled.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {recentPickups.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 0.85rem",
                    backgroundColor: "var(--slate-50)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--slate-200)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--slate-900)" }}>{p.lot.lotRef}</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
                      {p.lot.category.nameEn} &bull; 🏭 {p.recycler.name}
                    </div>
                  </div>
                  <div>
                    <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
