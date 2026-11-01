import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createCollectorLotAction } from "../actions";
import { WeightSelector } from "./WeightSelector";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function CreateLotPage(props: {
  searchParams: Promise<{ error?: string; categoryId?: string }>;
}) {
  await requireRole(["COLLECTOR", "ADMIN"]);
  const searchParams = await props.searchParams;

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  const selectedCatId = searchParams.categoryId ? parseInt(searchParams.categoryId, 10) : categories[0]?.id;

  const narration = {
    en: "Create a new scrap lot. Choose the material category such as circuit boards, cables, or batteries. Select the weight, and tap Search Recyclers to find nearby buyers.",
    hi: "नया ई-कचरा लॉट बनाएं। सामग्री की श्रेणी चुनें जैसे सर्किट बोर्ड, तार या बैटरी। वजन सेट करें और पास के रिसाइक्लर खोजने के लिए बटन दबाएं।",
    mr: "नवीन ई-कचरा लॉट तयार करा. सर्किट बोर्ड, केबल किंवा बॅटरी यांसारखी वर्गवारी निवडा. वजन सेट करा आणि जवळील रिसायकलर शोधण्यासाठी बटण दाबा.",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="create-lot-narration" />

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
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
            नया ई-कचरा लॉट बनाएं &bull; Create Scrap Lot
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
            सामग्री और वजन चुनें &bull; Select material category and approximate weight
          </div>
        </div>
      </div>

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="collector-layout-wrapper">
        {/* LEFT COLUMN: Main Creation Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <form
            action={createCollectorLotAction}
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              padding: "1.5rem",
            }}
          >
            {/* Category Selection */}
            <div>
              <label className="form-label" style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                1. सामग्री का प्रकार चुनें / Select Material Category *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {categories.map((cat) => {
                  const isChecked = cat.id === selectedCatId;
                  return (
                    <label
                      key={cat.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.6rem",
                        padding: "0.85rem",
                        border: isChecked ? "2px solid var(--primary)" : "1.5px solid var(--slate-200)",
                        borderRadius: "var(--radius-md)",
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
                        <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
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
              <label className="form-label" style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                2. अनुमानित वजन (किलो) / Approximate Weight (kg) *
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
                fontSize: "0.825rem",
                color: "var(--primary-900)",
                lineHeight: 1.5,
              }}
            >
              💵 <strong>हाथों-हाथ नकद भुगतान:</strong> रिसाइक्लर गेट पर वजन की पुष्टि होते ही तुरंत नकद या UPI द्वारा पूरा भुगतान मिलेगा।
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ fontSize: "1.05rem", padding: "0.85rem" }}
            >
              रिसाइक्लर खोजें &bull; Find Recycler &rarr;
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Real-Time Value Benchmark & Segregation Guide (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Packaging Guide */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.6rem" }}>
              📦 सही पैकिंग के नियम
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>✔️</span>
                <span><strong>साफ बोरी में रखें:</strong> मिट्टी, पत्थर या कचरे से अलग रखें ताकि रिसाइक्लर वजन न काटे।</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>✔️</span>
                <span><strong>सर्किट बोर्ड न तोड़ें:</strong> पूरे साबुत PCB का भाव टूटे हुए चूरे से ज्यादा होता है।</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>✔️</span>
                <span><strong>बैटरी को पानी से बचाएं:</strong> लीथियम-आयन बैटरी को सूखा रखें और लोहे से अलग रखें।</span>
              </div>
            </div>
          </div>

          {/* Handover Flow Summary */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.5rem" }}>
              🔄 आगे क्या होगा?
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "var(--slate-600)" }}>
              <div><strong>कदम 1:</strong> रिसाइक्लर चुनें और 4-अंकों का पास कोड पाएं।</div>
              <div><strong>कदम 2:</strong> रिसाइक्लर के गेट पर जाएं या गाड़ी पिकअप का इंतजार करें।</div>
              <div><strong>कदम 3:</strong> वजन तौलवाएं और तुरंत नकद/UPI भुगतान लें।</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
