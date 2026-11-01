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
          background: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)",
          color: "#ffffff",
          padding: "1.5rem",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 8px 20px -4px rgba(5, 150, 105, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255, 255, 255, 0.8)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              नमस्ते &bull; Welcome
            </div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, letterSpacing: "-0.01em", marginTop: "0.15rem" }}>
              {collector?.shortCode ? `कलेक्टर #${collector.shortCode}` : "कबाड़ीवाला मित्र"}
            </h1>
          </div>
          <span
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.18)",
              backdropFilter: "blur(4px)",
              padding: "0.3rem 0.65rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "1px solid rgba(255, 255, 255, 0.25)",
            }}
          >
            📍 {collector?.operatingArea || "Mumbai"}
          </span>
        </div>

        <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ backgroundColor: "rgba(255,255,255,0.14)", padding: "0.75rem 0.875rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.725rem", fontWeight: 600 }}>सक्रिय लॉट / Active Lots</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, marginTop: "0.15rem" }}>{activeCount}</div>
          </div>
          <div style={{ backgroundColor: "rgba(255,255,255,0.14)", padding: "0.75rem 0.875rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.725rem", fontWeight: 600 }}>भुगतान विधि / Payout</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.25rem" }}>💵 नकद / UPI</div>
          </div>
        </div>
      </div>

      {/* 4 Main Action Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        <Link href="/collector/create-lot" className="action-tile" style={{ borderColor: "var(--primary-border)", background: "#ffffff" }}>
          <div className="action-tile-icon" style={{ backgroundColor: "var(--primary-100)", color: "var(--primary-800)" }}>
            📦
          </div>
          <div className="action-tile-title" style={{ color: "var(--primary-800)" }}>नया लॉट बनाएं</div>
          <div className="action-tile-subtitle">Create New Scrap Lot</div>
        </Link>

        <Link href="/collector/prices" className="action-tile">
          <div className="action-tile-icon" style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
            📈
          </div>
          <div className="action-tile-title">आज के भाव</div>
          <div className="action-tile-subtitle">Today's Scrap Rates</div>
        </Link>

        <Link href="/collector/ledger" className="action-tile">
          <div className="action-tile-icon" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
            💰
          </div>
          <div className="action-tile-title">मेरी कमाई</div>
          <div className="action-tile-subtitle">Earnings &amp; Payouts</div>
        </Link>

        <Link href="/collector/safety" className="action-tile" style={{ borderColor: "#fecaca" }}>
          <div className="action-tile-icon" style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
            ⚠️
          </div>
          <div className="action-tile-title" style={{ color: "#991b1b" }}>सुरक्षा नियम</div>
          <div className="action-tile-subtitle">4 Critical Safety Rules</div>
        </Link>
      </div>

      {/* Geolocation Shortcuts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Link
          href="/collector/drop-points"
          className="card card-interactive"
          style={{
            padding: "0.875rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>⛺</span>
          <div>
            <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--slate-800)" }}>ड्रॉप बॉक्स / कैंप</div>
            <div style={{ fontSize: "0.7rem", color: "var(--slate-500)" }}>Nearby Drop Points</div>
          </div>
        </Link>

        <Link
          href="/collector/pickup-requests"
          className="card card-interactive"
          style={{
            padding: "0.875rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>🚚</span>
          <div>
            <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--slate-800)" }}>पिकअप स्थिति</div>
            <div style={{ fontSize: "0.7rem", color: "var(--slate-500)" }}>Pickup Requests</div>
          </div>
        </Link>
      </div>

      {/* Active Lots Section */}
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--slate-900)" }}>
            हाल के लॉट &bull; Recent Lots
          </h2>
          <Link href="/collector/create-lot" style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}>
            + नया जोड़ें
          </Link>
        </div>

        {recentLots.length === 0 ? (
          <div
            style={{
              padding: "2.5rem 1.5rem",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              color: "var(--slate-500)",
              border: "1.5px dashed var(--slate-300)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📦</div>
            <div style={{ fontWeight: 600, color: "var(--slate-700)" }}>कोई लॉट नहीं मिला / No active lots</div>
            <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>आपने अभी तक कोई स्क्रैप लॉट दर्ज नहीं किया है।</div>
            <Link
              href="/collector/create-lot"
              className="btn btn-sm btn-primary"
              style={{ marginTop: "1rem", display: "inline-block" }}
            >
              पहला लॉट बनाएं / Create First Lot &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {recentLots.map((lot) => {
              const statusColor =
                lot.status === "COMPLETED"
                  ? "var(--success)"
                  : lot.status === "HANDED_OVER"
                  ? "var(--info)"
                  : lot.status === "MATCHED"
                  ? "var(--warning)"
                  : "var(--slate-500)";

              const statusBadge =
                lot.status === "COMPLETED"
                  ? "badge badge-success"
                  : lot.status === "HANDED_OVER"
                  ? "badge badge-info"
                  : lot.status === "MATCHED"
                  ? "badge badge-warning"
                  : "badge badge-neutral";

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
                  className="card card-interactive"
                  style={{
                    padding: "0.875rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--slate-900)" }}>
                      {lot.category.nameHi} ({lot.category.nameEn})
                    </div>
                    <div style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
                      <code>{lot.lotRef}</code> &bull; {(lot.approxWeightGrams / 1000).toFixed(1)} kg
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span className={statusBadge} style={{ fontSize: "0.7rem" }}>
                      {statusText}
                    </span>
                    {firstHandover?.verificationCode && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          backgroundColor: "var(--slate-100)",
                          border: "1px solid var(--slate-200)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          marginTop: "0.3rem",
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
