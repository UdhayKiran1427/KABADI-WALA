import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CollectorDashboardPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  const collectorId = collector?.id;

  // Fetch recent lots
  const recentLots = collectorId
    ? await prisma.lot.findMany({
        where: { collectorId },
        orderBy: { collectedAt: "desc" },
        take: 5,
        include: {
          category: true,
          handovers: { select: { verificationCode: true, status: true }, take: 1 },
        },
      })
    : [];

  const activeCount = recentLots.filter((l) => l.status !== "COMPLETED" && l.status !== "CANCELLED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          color: "#ffffff",
          padding: "1.25rem",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>नमस्ते / Welcome</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.1rem" }}>
              {collector?.shortCode ? `कलेक्टर #${collector.shortCode}` : "कबाड़ीवाला मित्र"}
            </h1>
          </div>
          <span
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              padding: "0.3rem 0.6rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            📍 {collector?.operatingArea || "Mumbai"}
          </span>
        </div>

        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", fontSize: "0.85rem" }}>
          <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 0.75rem", borderRadius: "10px", flex: 1 }}>
            <div style={{ opacity: 0.8, fontSize: "0.75rem" }}>सक्रिय लॉट / Active</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{activeCount}</div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 0.75rem", borderRadius: "10px", flex: 1 }}>
            <div style={{ opacity: 0.8, fontSize: "0.75rem" }}>भुगतान / Payment</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>💵 नकद (Cash)</div>
          </div>
        </div>
      </div>

      {/* 4 Main Action Tiles (C3 Wireframe) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Link
          href="/collector/create-lot"
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem 1rem",
            borderRadius: "14px",
            border: "2px solid #10b981",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "2.25rem" }}>📦</span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "#065f46" }}>नया लॉट बनाएं</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Create New Lot</span>
        </Link>

        <Link
          href="/collector/prices"
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem 1rem",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "2.25rem" }}>📈</span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>आज के भाव</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Today's Scrap Rates</span>
        </Link>

        <Link
          href="/collector/ledger"
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem 1rem",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "2.25rem" }}>💰</span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>मेरी कमाई</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Earnings & Ledger</span>
        </Link>

        <Link
          href="/collector/safety"
          style={{
            padding: "1.25rem 1rem",
            borderRadius: "14px",
            border: "1px solid #fecaca",
            backgroundColor: "#fff5f5",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "2.25rem" }}>⚠️</span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "#991b1b" }}>सुरक्षा नियम</span>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Safety Guide (4 Rules)</span>
        </Link>
      </div>

      {/* Active Lots Section */}
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>हाल के लॉट / Recent Lots</h2>
          <Link href="/collector/create-lot" style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
            + नया जोड़ें
          </Link>
        </div>

        {recentLots.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              textAlign: "center",
              color: "#64748b",
              border: "1px dashed #cbd5e1",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
            <div>कोई लॉट नहीं मिला / No active lots</div>
            <Link
              href="/collector/create-lot"
              className="btn btn-primary"
              style={{ marginTop: "0.75rem", display: "inline-block", fontSize: "0.85rem" }}
            >
              पहला लॉट बनाएं / Create First Lot
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {recentLots.map((lot) => {
              const statusColor =
                lot.status === "COMPLETED"
                  ? "#059669"
                  : lot.status === "HANDED_OVER"
                  ? "#0284c7"
                  : lot.status === "MATCHED"
                  ? "#d97706"
                  : "#64748b";

              const statusText =
                lot.status === "COMPLETED"
                  ? "✓ पूरा हुआ (Paid)"
                  : lot.status === "HANDED_OVER"
                  ? "⚖️ तौल जारी (Weighing)"
                  : lot.status === "MATCHED"
                  ? "🤝 रिसाइक्लर तय (Matched)"
                  : "⏳ तैयार (Ready)";

              const firstHandover = lot.handovers[0];

              return (
                <Link
                  key={lot.id}
                  href={`/collector/lots/${lot.id}`}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    padding: "0.875rem 1rem",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                        {lot.category.nameHi} ({lot.category.nameEn})
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                      {lot.lotRef} • {(lot.approxWeightGrams / 1000).toFixed(1)} kg
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColor }}>
                      {statusText}
                    </div>
                    {firstHandover?.verificationCode && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          backgroundColor: "#f1f5f9",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          marginTop: "0.25rem",
                          display: "inline-block",
                        }}
                      >
                        पिन: {firstHandover.verificationCode}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
