import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function DropPointsPage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

  const collectorLat = 19.0434;
  const collectorLng = 72.8567;

  const points = await prisma.collectionPoint.findMany({
    include: {
      recycler: { select: { name: true, contactPhone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pointsWithDistance = points
    .map((p) => {
      const distanceKm = calculateHaversineDistanceKm(collectorLat, collectorLng, p.latitude, p.longitude);
      return { ...p, distanceKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const narration = {
    en: `Nearby e-waste drop points. Found ${points.length} verified collection bins within range. Smaller items like batteries, cables, and phones can be safely deposited here.`,
    hi: `नजदीकी ड्रॉप बॉक्स एवं कैंप। आपके आसपास ${points.length} अधिकृत ड्रॉप बॉक्स उपलब्ध हैं। छोटी वस्तुएं जैसे बैटरी और केबल यहाँ जमा कर सकते हैं।`,
    mr: `जवळील ड्रॉप बॉक्स आणि कॅम्प. तुमच्या परिसरात ${points.length} अधिकृत ड्रॉप बॉक्स आहेत. बॅटरी, केबल यांसारख्या लहान वस्तू सुरक्षितपणे येथे जमा करू शकता.`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="drop-points-narration" />

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            नजदीकी ड्रॉप बॉक्स एवं कैंप / Drop Points (C21)
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Nearby E-Waste Drop Boxes &amp; Collection Camps</div>
        </div>
      </div>

      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#eff6ff",
          borderRadius: "12px",
          border: "1px solid #bfdbfe",
          fontSize: "0.85rem",
          color: "#1e40af",
        }}
      >
        📍 <strong>स्थानीय ड्रॉप बॉक्स:</strong> छोटे इलेक्ट्रॉनिक सामान (बैटरी, केबल, फोन) को इन ड्रॉप बॉक्स में सुरक्षित जमा कर सकते हैं।
      </div>

      {pointsWithDistance.length === 0 ? (
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
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📦</div>
          <div style={{ fontWeight: 600 }}>कोई ड्रॉप पॉइंट उपलब्ध नहीं है</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
            No collection camps active in your area today.
          </div>
        </div>
      ) : (
        <div className="grid-2">
          {pointsWithDistance.map((p) => {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
            const typeLabel =
              p.type === "CAMP"
                ? "⛺ विशेष कलेक्शन कैंप (Camp)"
                : p.type === "CENTER"
                ? "🏢 केंद्र (Center)"
                : "📦 कम्युनिटी ड्रॉप बॉक्स (Drop Box)";

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "1.25rem",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        backgroundColor: p.type === "CAMP" ? "#fef3c7" : "#e0f2fe",
                        color: p.type === "CAMP" ? "#92400e" : "#0369a1",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                      }}
                    >
                      {typeLabel}
                    </span>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1e293b", marginTop: "0.35rem" }}>
                      {p.name}
                    </h2>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{p.address}</div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>
                      {p.distanceKm.toFixed(1)} km
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    fontSize: "0.8rem",
                    color: "#475569",
                    backgroundColor: "#f8fafc",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                  }}
                >
                  {p.operatingHours && <div>⏰ <strong>समय:</strong> {p.operatingHours}</div>}
                  {p.operatingDates && <div>📅 <strong>दिन:</strong> {p.operatingDates}</div>}
                  {p.recycler?.name && <div>🏢 <strong>संचालक:</strong> {p.recycler.name}</div>}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.45rem", fontSize: "0.8rem", textAlign: "center" }}
                  >
                    🗺️ रास्ता देखें (Directions) &rarr;
                  </a>
                  {p.contactPhone && (
                    <a
                      href={`tel:${p.contactPhone}`}
                      className="btn btn-secondary"
                      style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                      title="Call"
                    >
                      📞
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

