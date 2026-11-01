import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CollectorSafetyGuidePage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

  const topics = await prisma.safetyTopic.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            सुरक्षा नियम / Safety Rules
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>स्वास्थ्य एवं सुरक्षा सावधानियां (4 Core Rules)</div>
        </div>
      </div>

      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          color: "#991b1b",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>⚠️</span>
        <div>
          <strong>चेतावनी:</strong> ई-कचरे को अनौपचारिक रूप से जलाने या तोड़ने से फेफड़ों और आंखों को स्थायी नुकसान हो सकता है।
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {topics.map((t, index) => {
          const icons = ["🔥", "🧪", "💥", "📺"];
          const icon = icons[index % icons.length];

          return (
            <div
              key={t.id}
              style={{
                backgroundColor: "#fffaf5",
                borderRadius: "16px",
                padding: "1.25rem",
                border: "1px solid #fed7aa",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <span style={{ fontSize: "2rem" }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#9a3412" }}>
                    {t.titleHi}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#c2410c", fontWeight: 600 }}>
                    {t.titleMr} • {t.titleEn}
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "#334155", lineHeight: "1.5", marginTop: "0.5rem" }}>
                    {t.contentHi}
                  </p>

                  <div
                    style={{
                      marginTop: "0.5rem",
                      paddingTop: "0.5rem",
                      borderTop: "1px dashed #fed7aa",
                      fontSize: "0.75rem",
                      color: "#64748b",
                    }}
                  >
                    <em>{t.contentMr}</em>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
