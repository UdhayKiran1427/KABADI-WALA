import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PickupRequestsTimelinePage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const requests = await prisma.pickupRequest.findMany({
    where: { collectorId: user.userId },
    include: {
      recycler: { select: { name: true, contactPhone: true } },
      lot: { include: { category: true } },
    },
    orderBy: { slot: "desc" },
  });

  const stages = [
    { key: "REQUESTED", labelHi: "अनुरोध भेजा", labelEn: "Requested", icon: "📝" },
    { key: "ACCEPTED", labelHi: "स्वीकार किया", labelEn: "Accepted", icon: "✓" },
    { key: "ON_THE_WAY", labelHi: "रास्ते में है", labelEn: "On the way", icon: "🚚" },
    { key: "ARRIVED", labelHi: "पहुंच गया", labelEn: "Arrived", icon: "📍" },
    { key: "COMPLETED", labelHi: "पूरा हुआ", labelEn: "Completed", icon: "🎉" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            डोरस्टेप पिकअप स्थिति / Pickup Status (C22)
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Live Vehicle Tracking &amp; Status Timeline</div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div
          style={{
            padding: "2.5rem 1rem",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            textAlign: "center",
            color: "#64748b",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚚</div>
          <div style={{ fontWeight: 600 }}>कोई सक्रिय पिकअप अनुरोध नहीं है</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
            When you request doorstep pickup for heavy lots, you can track the collection van here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {requests.map((req) => {
            const currentStageIndex = stages.findIndex((s) => s.key === req.status);

            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                      लॉट #{req.lot.lotRef} • {req.lot.category.nameHi}
                    </h2>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                      वजन: {(req.lot.approxWeightGrams / 1000).toFixed(1)} kg • {req.recycler.name}
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      backgroundColor: req.status === "COMPLETED" ? "#ecfdf5" : "#fef3c7",
                      color: req.status === "COMPLETED" ? "#065f46" : "#92400e",
                      fontWeight: 700,
                    }}
                  >
                    {req.status}
                  </span>
                </div>

                {/* 5-Stage Visual Timeline */}
                <div style={{ display: "flex", justifyContent: "space-between", position: "relative", margin: "0.5rem 0" }}>
                  {stages.map((stage, idx) => {
                    const isPassed = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div
                        key={stage.key}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          zIndex: 2,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: isCurrent ? "#2563eb" : isPassed ? "#10b981" : "#e2e8f0",
                            color: isPassed || isCurrent ? "#ffffff" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1rem",
                            fontWeight: 800,
                            boxShadow: isCurrent ? "0 0 0 4px rgba(37,99,235,0.2)" : "none",
                          }}
                        >
                          {stage.icon}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: isCurrent ? 800 : 600,
                            color: isCurrent ? "#2563eb" : isPassed ? "#1e293b" : "#94a3b8",
                            marginTop: "0.35rem",
                          }}
                        >
                          {stage.labelHi}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    color: "#475569",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>⏰ निर्धारित समय: {new Date(req.slot).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                  <a href={`tel:${req.recycler.contactPhone}`} style={{ color: "#2563eb", fontWeight: 700 }}>
                    📞 संपर्क करें
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

