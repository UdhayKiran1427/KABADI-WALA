import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { VoiceSafetyCard } from "@/components/voice/VoiceSafetyCard";
import { PageTitle, PageVoice } from "../ui";

const HAZARD_ICONS = ["flame", "acid", "battery", "screen"] as const;

export default async function CollectorSafetyGuidePage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

  const topics = await prisma.safetyTopic.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="c-page">
      <PageVoice
        en="Safety. Never burn cables, never use acid on circuit boards, never open batteries, and never smash old TV screens."
        hi="सुरक्षा। तार कभी न जलाएं, सर्किट बोर्ड पर एसिड न लगाएं, बैटरी न खोलें, और पुरानी टीवी स्क्रीन न तोड़ें।"
        mr="सुरक्षा. वायर कधीही जाळू नका, सर्किट बोर्डवर अ‍ॅसिड वापरू नका, बॅटरी फोडू नका, आणि जुनी टीव्ही स्क्रीन तोडू नका."
      />
      <PageTitle title={{ hi: "सुरक्षा", en: "Safety", mr: "सुरक्षा" }} back="/collector" />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {topics.map((t, index) => (
          <VoiceSafetyCard
            key={t.id}
            id={t.id}
            icon={HAZARD_ICONS[index % HAZARD_ICONS.length]}
            titleHi={t.titleHi}
            titleMr={t.titleMr || undefined}
            titleEn={t.titleEn}
            contentHi={t.contentHi}
            contentMr={t.contentMr || undefined}
            contentEn={t.contentEn}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
