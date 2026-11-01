import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CollectorLotDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const params = await props.params;

  const lot = await prisma.lot.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      collector: true,
      handovers: { take: 1 },
      receiptTokens: { take: 1 },
    },
  });

  if (!lot) {
    notFound();
  }

  if (lot.collector.userId !== user.userId) {
    redirect("/collector");
  }

  let recycler = null;
  if (lot.chosenRecyclerId) {
    recycler = await prisma.recycler.findUnique({
      where: { id: lot.chosenRecyclerId },
      select: { name: true, contactPhone: true, address: true },
    });
  }

  const isCompleted = lot.status === "COMPLETED";
  const isHandedOver = lot.status === "HANDED_OVER";
  const isMatched = lot.status === "MATCHED";

  const firstHandover = lot.handovers[0];
  const verificationCode = firstHandover?.verificationCode || "----";
  const declaredKg = (lot.approxWeightGrams / 1000).toFixed(1);
  const confirmedKg = firstHandover?.confirmedWeightGrams
    ? (firstHandover.confirmedWeightGrams / 1000).toFixed(1)
    : null;

  const finalAmountRupees = lot.finalPricePaise
    ? (lot.finalPricePaise / 100).toLocaleString("en-IN")
    : lot.quotedRatePaise
    ? ((lot.quotedRatePaise * lot.approxWeightGrams) / 100000).toLocaleString("en-IN")
    : ((lot.estimatedValuePaise || 0) / 100).toLocaleString("en-IN");

  const receiptToken = lot.receiptTokens[0]?.token;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            हैंडओवर सत्यापन / Handover Pass
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>लॉट #{lot.lotRef}</div>
        </div>
      </div>

      {/* Big 4-Digit Verification Code Card (C8 Wireframe) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "1.5rem",
          textAlign: "center",
          border: isCompleted ? "2px solid #10b981" : "2px solid #3b82f6",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05rem" }}>
          तौल ऑपरेटर को यह 4-अंकों का कोड बताएं
        </div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Tell this 4-digit code to scale operator</div>

        <div
          style={{
            fontSize: "3.5rem",
            fontWeight: 900,
            letterSpacing: "0.8rem",
            color: isCompleted ? "#059669" : "#1d4ed8",
            margin: "0.75rem 0",
            fontFamily: "monospace",
          }}
        >
          {verificationCode}
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "0.3rem 0.8rem",
            borderRadius: "999px",
            fontSize: "0.85rem",
            fontWeight: 700,
            backgroundColor: isCompleted ? "#ecfdf5" : isHandedOver ? "#e0f2fe" : "#fef3c7",
            color: isCompleted ? "#065f46" : isHandedOver ? "#0369a1" : "#92400e",
          }}
        >
          {isCompleted
            ? "✓ तौल और नकद भुगतान पूरा हुआ (Paid)"
            : isHandedOver
            ? "⚖️ तौल सत्यापन जारी है (Weighing)"
            : "⏳ रिसाइक्लर के पास सामान ले जाएं (Take to Recycler)"}
        </div>
      </div>

      {/* Lot Details Summary */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "1.25rem",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>सामग्री / Material</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            {lot.category.nameHi} ({lot.category.nameEn})
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>अनुमानित वजन / Declared</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{declaredKg} kg</span>
        </div>

        {confirmedKg && (
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>कांटा तौल वजन / Scale Weight</span>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#059669" }}>{confirmedKg} kg</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>कुल राशि / Total Amount</span>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#059669" }}>₹{finalAmountRupees}</span>
        </div>

        {recycler && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>रिसाइक्लर / Recycler</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", textAlign: "right" }}>
              {recycler.name}
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>📞 {recycler.contactPhone}</div>
            </span>
          </div>
        )}
      </div>

      {/* Shareable Public Receipt Link */}
      {receiptToken && (
        <Link
          href={`/receipts/${receiptToken}`}
          target="_blank"
          className="btn btn-secondary"
          style={{
            padding: "0.75rem",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "0.9rem",
            borderRadius: "10px",
          }}
        >
          📄 सार्वजनिक डिजिटल रसीद देखें / View Public Receipt
        </Link>
      )}

      {/* Action if Matched but needs different recycler */}
      {isMatched && (
        <div style={{ textAlign: "center" }}>
          <Link
            href={`/collector/lots/${lot.id}/match`}
            style={{ fontSize: "0.85rem", color: "var(--primary)", textDecoration: "underline" }}
          >
            दूसरा रिसाइक्लर बदलें / Change Recycler
          </Link>
        </div>
      )}
    </div>
  );
}
