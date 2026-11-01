import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createCollectorLotAction } from "../actions";
import { WeightSelector } from "./WeightSelector";

export default async function CreateLotPage(props: {
  searchParams: Promise<{ error?: string; categoryId?: string }>;
}) {
  await requireRole(["COLLECTOR", "ADMIN"]);
  const searchParams = await props.searchParams;

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  const selectedCatId = searchParams.categoryId ? parseInt(searchParams.categoryId, 10) : categories[0]?.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          href="/collector"
          className="btn btn-secondary btn-sm"
          style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
        >
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
            नया ई-कचरा लॉट &bull; Create Lot
          </h1>
          <div style={{ fontSize: "0.775rem", color: "var(--slate-500)" }}>
            सामग्री और वजन दर्ज करें / Enter scrap details
          </div>
        </div>
      </div>

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      <form
        action={createCollectorLotAction}
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          padding: "1.5rem 1.25rem",
        }}
      >
        {/* Category Selection */}
        <div>
          <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.6rem" }}>
            1. सामग्री का प्रकार चुनें / Select Material
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {categories.map((cat) => {
              const isChecked = cat.id === selectedCatId;
              return (
                <label
                  key={cat.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    padding: "0.75rem",
                    border: isChecked ? "2px solid var(--primary)" : "1.5px solid var(--slate-200)",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    backgroundColor: isChecked ? "var(--primary-50)" : "#ffffff",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <input
                    type="radio"
                    name="categoryId"
                    value={cat.id}
                    defaultChecked={isChecked}
                    required
                    style={{ marginTop: "0.2rem", accentColor: "var(--primary)" }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: cat.isHazardous ? "#c2410c" : "var(--slate-900)" }}>
                      {cat.nameHi} {cat.isHazardous && "⚠️"}
                    </div>
                    <div style={{ fontSize: "0.725rem", color: "var(--slate-500)", marginTop: "0.1rem" }}>
                      {cat.nameEn}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Weight Stepper */}
        <div>
          <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.6rem" }}>
            2. अनुमानित वजन (किलो) / Approx Weight (kg)
          </label>
          <WeightSelector defaultValue="5" />
        </div>

        {/* Cash Notice */}
        <div
          style={{
            padding: "0.875rem 1rem",
            backgroundColor: "var(--primary-50)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--primary-border)",
            fontSize: "0.8rem",
            color: "var(--primary-900)",
            lineHeight: 1.5,
          }}
        >
          💵 <strong>हाथों-हाथ नकद भुगतान:</strong> रिसाइक्लर आपके सामान की तौल करके तुरंत नकद या UPI द्वारा पूरा भुगतान करेगा। (Verified Scale Handover)
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
          style={{ fontSize: "1.05rem" }}
        >
          रिसाइक्लर खोजें &bull; Find Recycler &rarr;
        </button>
      </form>
    </div>
  );
}
