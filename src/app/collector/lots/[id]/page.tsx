import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { collectorBargainOfferAction, collectorAcceptBargainAction } from "../../actions";

export default async function CollectorLotDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const params = await props.params;
  const searchParams = await props.searchParams;

  const lot = await prisma.lot.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      collector: true,
      handovers: { take: 1 },
      transaction: true,
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

  const currentRateRupees = lot.quotedRatePaise
    ? (lot.quotedRatePaise / 100).toFixed(0)
    : "0";

  const finalAmountRupees = lot.finalPricePaise
    ? (lot.finalPricePaise / 100).toLocaleString("en-IN")
    : lot.quotedRatePaise
    ? ((lot.quotedRatePaise * lot.approxWeightGrams) / 100000).toLocaleString("en-IN")
    : ((lot.estimatedValuePaise || 0) / 100).toLocaleString("en-IN");

  const receiptToken = lot.receiptTokens[0]?.token;

  // Bargain states
  const tx = lot.transaction;
  const bargainStatus = tx?.bargainStatus || "NONE";
  const bargainRateRupees = tx?.bargainRatePaise ? (tx.bargainRatePaise / 100).toFixed(0) : null;
  const agreedRateRupees = tx?.agreedRatePaise ? (tx.agreedRatePaise / 100).toFixed(0) : null;

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

      {searchParams.success && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

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
          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>तय दर / Quoted Rate</span>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b" }}>
            ₹{currentRateRupees} / kg
          </span>
        </div>

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

      {/* Price Bargaining & Confirmation Section */}
      {!isCompleted && tx && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "1.25rem",
            border: bargainStatus === "AGREED" ? "2px solid #10b981" : "1px solid #cbd5e1",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>
              💬 भाव मोल-भाव / Price Negotiation
            </h3>
            {bargainStatus === "AGREED" ? (
              <span className="badge" style={{ backgroundColor: "#ecfdf5", color: "#065f46", fontWeight: 700 }}>
                ✓ भाव तय हुआ (Agreed)
              </span>
            ) : (
              <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 700 }}>
                मोल-भाव खुला है (Open)
              </span>
            )}
          </div>

          {bargainStatus === "AGREED" ? (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#ecfdf5",
                borderRadius: "10px",
                border: "1px solid #a7f3d0",
                fontSize: "0.85rem",
                color: "#065f46",
                fontWeight: 600,
              }}
            >
              🎉 दोनों पक्षों ने <strong>₹{agreedRateRupees}/kg</strong> की दर पर सहमति दी है। तौल के समय इसी दर से भुगतान होगा।
            </div>
          ) : bargainStatus === "OFFER_BY_RECYCLER" ? (
            <div
              style={{
                padding: "0.875rem",
                backgroundColor: "#fef3c7",
                borderRadius: "10px",
                border: "1px solid #fde68a",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.8rem", color: "#92400e", fontWeight: 600 }}>रिसाइक्लर का नया प्रस्ताव:</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#b45309" }}>
                  ₹{bargainRateRupees} / kg
                </div>
                {tx.bargainNote && <div style={{ fontSize: "0.8rem", color: "#78350f" }}>नोट: "{tx.bargainNote}"</div>}
              </div>

              <form action={collectorAcceptBargainAction}>
                <input type="hidden" name="lotId" value={lot.id} />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    borderRadius: "8px",
                  }}
                >
                  ✓ यह भाव स्वीकार करें / Accept & Confirm Price &rarr;
                </button>
              </form>
            </div>
          ) : bargainStatus === "OFFER_BY_COLLECTOR" ? (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#eff6ff",
                borderRadius: "10px",
                border: "1px solid #bfdbfe",
                fontSize: "0.85rem",
                color: "#1e40af",
              }}
            >
              ⏳ आपका <strong>₹{bargainRateRupees}/kg</strong> का मोल-भाव रिसाइक्लर के पास भेजा गया है। रिसाइक्लर के जवाब की प्रतीक्षा है।
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem 0" }}>
                यदि आपका सामान उच्च गुणवत्ता या साफ किया हुआ है, तो आप अपनी इच्छित दर का प्रस्ताव रिसाइक्लर को भेज सकते हैं:
              </p>

              <form action={collectorBargainOfferAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input type="hidden" name="lotId" value={lot.id} />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      name="offerRateRupees"
                      defaultValue={Number(currentRateRupees) + 10}
                      placeholder="आपकी दर ₹/kg"
                      required
                      className="input"
                      style={{ padding: "0.6rem", fontSize: "1rem", fontWeight: 700 }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    मोल-भाव भेजें &rarr;
                  </button>
                </div>
                <input
                  type="text"
                  name="note"
                  placeholder="टिप्पणी (जैसे: साफ़ किया हुआ माल / Clean sorted)"
                  className="input"
                  style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                />
              </form>
            </div>
          )}
        </div>
      )}

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
