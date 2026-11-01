import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createCollectorLotAction } from "../actions";
import { WeightSelector } from "./WeightSelector";

export default async function CreateLotPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["COLLECTOR", "ADMIN"]);
  const searchParams = await props.searchParams;

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
          नया ई-कचरा लॉट / Create Lot
        </h1>
      </div>

      {searchParams.error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "8px",
            fontSize: "0.85rem",
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      <form
        action={createCollectorLotAction}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "1.25rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Category Selection */}
        <div>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            1. सामग्री चुनें / Select Material
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {categories.map((cat, idx) => (
              <label
                key={cat.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  backgroundColor: cat.isHazardous ? "#fff7ed" : "#f8fafc",
                }}
              >
                <input
                  type="radio"
                  name="categoryId"
                  value={cat.id}
                  defaultChecked={idx === 0}
                  required
                />
                <div>
                  <div style={{ fontWeight: 700, color: cat.isHazardous ? "#c2410c" : "#1e293b" }}>
                    {cat.nameHi} {cat.isHazardous && "⚠️"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{cat.nameEn}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Weight Stepper */}
        <div>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            2. अनुमानित वजन (किलो) / Approx Weight (kg)
          </label>
          <WeightSelector defaultValue="5" />
        </div>

        {/* Cash Notice */}
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#ecfdf5",
            borderRadius: "10px",
            border: "1px solid #a7f3d0",
            fontSize: "0.8rem",
            color: "#065f46",
          }}
        >
          💵 <strong>हाथों-हाथ नकद भुगतान:</strong> रिसाइक्लर आपके सामान की तौल करके तुरंत नकद या UPI द्वारा पूरा भुगतान करेगा।
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: "0.875rem",
            fontSize: "1.1rem",
            fontWeight: 800,
            borderRadius: "10px",
          }}
        >
          रिसाइक्लर खोजें / Find Best Recycler &rarr;
        </button>
      </form>
    </div>
  );
}

