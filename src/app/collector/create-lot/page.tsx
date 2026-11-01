import { ArrowRight, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createCollectorLotAction } from "../actions";
import { LocationCapture } from "./LocationCapture";
import { LotItemsPicker } from "./LotItemsPicker";
import { PhotoPicker } from "./PhotoPicker";
import { getTodayRates } from "@/lib/services/lotFlowService";
import { PageTitle, PageVoice, T } from "../ui";

export default async function CreateLotPage(props: {
  searchParams: Promise<{ error?: string; categoryId?: string }>;
}) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const searchParams = await props.searchParams;

  const [categories, todayRates, collector] = await Promise.all([
    prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    }),
    getTodayRates(),
    prisma.collector.findUnique({ where: { userId: user.userId }, select: { operatingArea: true } }),
  ]);

  const materials = categories.map((cat) => ({
    id: cat.id,
    nameHi: cat.nameHi,
    nameEn: cat.nameEn,
    nameMr: cat.nameMr,
    isHazardous: cat.isHazardous,
    ratePaise: todayRates.get(cat.id)?.ratePerKgPaise ?? null,
  }));

  return (
    <div className="c-page">
      <PageVoice
        en="New lot. Tap every material you have, enter the kilograms for each, add photos if you like, then tap Next."
        hi="नया लॉट। आपके पास जो भी सामान है उसे चुनें, हर सामान का वजन किलो में डालें, चाहें तो फोटो जोड़ें, फिर आगे दबाएं।"
        mr="नवीन लॉट. तुमच्याकडील प्रत्येक साहित्य निवडा, प्रत्येकाचे वजन किलोमध्ये टाका, हवे तर फोटो जोडा, मग पुढे दाबा."
      />
      <PageTitle title={{ hi: "नया लॉट", en: "New lot", mr: "नवीन लॉट" }} back="/collector" />

      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <TriangleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      <form action={createCollectorLotAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <LotItemsPicker
          materials={materials}
          initialCategoryId={searchParams.categoryId ? parseInt(searchParams.categoryId, 10) : undefined}
        />

        <PhotoPicker />

        <LocationCapture fallbackArea={collector?.operatingArea || ""} />

        <button type="submit" className="btn btn-primary btn-block btn-lg c-btn-xl">
          <T hi="आगे" en="Next" mr="पुढे" />
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
