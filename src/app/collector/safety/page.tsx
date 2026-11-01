import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { VoiceSafetyCard } from "@/components/voice/VoiceSafetyCard";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function CollectorSafetyGuidePage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

  const topics = await prisma.safetyTopic.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const narration = {
    en: "Health and safety guidelines. Never burn cables, never use acid on circuit boards, never dismantle batteries, and never smash CRT monitors.",
    hi: "स्वास्थ्य और सुरक्षा सावधानियां। तार कभी न जलाएं, सर्किट बोर्ड पर एसिड न लगाएं, बैटरी न खोलें, और सीआरटी मॉनिटर न तोड़ें।",
    mr: "आरोग्य आणि सुरक्षा नियम. वायर कधीही जाळू नका, अ‍ॅसिड वापरू नका, बॅटरी फोडू नका, आणि सीआरटी मॉनिटर तोडू नका.",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="safety-page-narration" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
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

        {/* C11 Main Audio Speaker */}
        <VoiceSpeaker screenKey="C11_SAFETY" size="md" />
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

      {/* C11: Picture + Short Audio for each hazard (Responsive 2x2 on desktop) */}
      <div className="grid-2">
        {topics.map((t, index) => {
          const icons = ["🔥", "🧪", "💥", "📺"];
          const icon = icons[index % icons.length];

          return (
            <VoiceSafetyCard
              key={t.id}
              id={t.id}
              icon={icon}
              titleHi={t.titleHi}
              titleMr={t.titleMr || undefined}
              titleEn={t.titleEn}
              contentHi={t.contentHi}
              contentMr={t.contentMr || undefined}
              contentEn={t.contentEn}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}
