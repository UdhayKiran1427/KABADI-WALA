import { ArrowRight, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createCollectorLotAction } from "../actions";
import { WeightSelector } from "./WeightSelector";
import { LocationCapture } from "./LocationCapture";
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

  const selectedCatId = searchParams.categoryId ? parseInt(searchParams.categoryId, 10) : categories[0]?.id;

  return (
    <div className="c-page">
      <PageVoice
        en="New lot. Choose the material, then the weight in kilograms, then tap Next."
        hi="नया लॉट। सामान चुनें, फिर किलो में वजन चुनें, फिर आगे दबाएं।"
        mr="नवीन लॉट. साहित्य निवडा, मग किलोमध्ये वजन निवडा, मग पुढे दाबा."
      />
      <PageTitle title={{ hi: "नया लॉट", en: "New lot", mr: "नवीन लॉट" }} back="/collector" />

      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <TriangleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      <form action={createCollectorLotAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend className="c-section-title" style={{ marginBottom: "0.6rem" }}>
            1. <T hi="सामान चुनें" en="Material" mr="साहित्य निवडा" />
          </legend>
          <div className="c-choice-grid">
            {categories.map((cat) => {
              const todayRate = todayRates.get(cat.id);
              return (
                <label key={cat.id} className="c-choice">
                  <input type="radio" name="categoryId" value={cat.id} defaultChecked={cat.id === selectedCatId} required />
                  <span className="c-choice-name">
                    <T hi={cat.nameHi} en={cat.nameEn} mr={cat.nameMr} />
                    {cat.isHazardous && (
                      <TriangleAlert size={14} aria-label="खतरनाक / Hazardous" style={{ color: "#c2410c", marginLeft: "0.25rem", verticalAlign: "-2px" }} />
                    )}
                  </span>
                  <span className="c-choice-price">
                    {todayRate ? (
                      <>
                        ₹{(todayRate.ratePerKgPaise / 100).toFixed(0)}
                        <small>/kg</small>
                      </>
                    ) : (
                      <small style={{ color: "var(--slate-400)" }}>
                        <T hi="आज भाव नहीं" en="No price today" mr="आज भाव नाही" />
                      </small>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="weightInput" className="c-section-title" style={{ display: "block", marginBottom: "0.6rem" }}>
            2. <T hi="वजन (किलो)" en="Weight (kg)" mr="वजन (किलो)" />
          </label>
          <WeightSelector defaultValue="5" />
        </div>

        <LocationCapture fallbackArea={collector?.operatingArea || ""} />

        <button type="submit" className="btn btn-primary btn-block btn-lg c-btn-xl">
          <T hi="आगे" en="Next" mr="पुढे" />
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
