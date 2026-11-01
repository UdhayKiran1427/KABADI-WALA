import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  collectorBargainOfferAction,
  collectorAcceptBargainAction,
  deleteLotAction,
} from "../../actions";

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

  if (user.role !== "ADMIN" && lot.collector.userId !== user.userId) {
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
            हैंडओवर सत्यापन &bull; Handover Pass
          </h1>
          <div style={{ fontSize: "0.775rem", color: "var(--slate-500)" }}>
            लॉट कोड: <code>{lot.lotRef}</code>
          </div>
        </div>
      </div>

      {searchParams.success && (
        <div className="alert alert-success">
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* 4-Digit Verification Code Card (C8 Wireframe) */}
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "2rem 1.5rem",
          border: isCompleted ? "2px solid var(--primary)" : "2px solid #0284c7",
          boxShadow: isCompleted ? "0 8px 24px -4px rgba(5, 150, 105, 0.2)" : "0 8px 24px -4px rgba(2, 132, 199, 0.2)",
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--slate-700)" }}>
          तौल ऑपरेटर को यह 4-अंकों का कोड बताएं
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
          Tell this 4-digit code to scale operator
        </div>

        <div
          style={{
            fontSize: "3.5rem",
            fontWeight: 900,
            letterSpacing: "0.75rem",
            color: isCompleted ? "var(--primary-800)" : "#0369a1",
            margin: "0.85rem 0",
            fontFamily: "var(--font-mono)",
            textIndent: "0.75rem",
          }}
        >
          {verificationCode}
        </div>

        <div>
          <span
            className={isCompleted ? "badge badge-success" : isHandedOver ? "badge badge-info" : "badge badge-warning"}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}
          >
            {isCompleted
              ? "✓ तौल और नकद भुगतान पूरा हुआ (Paid)"
              : isHandedOver
              ? "⚖️ तौल सत्यापन जारी है (Weighing)"
              : "⏳ रिसाइक्लर के पास सामान ले जाएं (Take to Recycler)"}
          </span>
        </div>
      </div>

      {/* Lot Details Summary */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.6rem" }}>
          <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>सामग्री / Material</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--slate-900)" }}>
            {lot.category.nameHi} ({lot.category.nameEn})
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.6rem" }}>
          <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>अनुमानित वजन / Declared</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{declaredKg} kg</span>
        </div>

        {confirmedKg && (
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.6rem" }}>
            <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>कांटा तौल वजन / Scale Weight</span>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary-800)" }}>{confirmedKg} kg</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.6rem" }}>
          <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>तय दर / Quoted Rate</span>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--slate-900)" }}>
            ₹{currentRateRupees} / kg
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: recycler ? "1px solid var(--slate-100)" : "none", paddingBottom: recycler ? "0.6rem" : 0 }}>
          <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>कुल राशि / Total Amount</span>
          <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--primary-800)" }}>₹{finalAmountRupees}</span>
        </div>

        {recycler && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ color: "var(--slate-500)", fontSize: "0.85rem" }}>रिसाइक्लर / Recycler</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", textAlign: "right" }}>
              {recycler.name}
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 500 }}>📞 {recycler.contactPhone}</div>
            </span>
          </div>
        )}
      </div>

      {/* Price Bargaining & Confirmation Section */}
      {!isCompleted && tx && (
        <div
          className="card"
          style={{
            border: bargainStatus === "AGREED" ? "2px solid var(--primary)" : "1.5px solid var(--slate-300)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "0.975rem", fontWeight: 700, margin: 0, color: "var(--slate-900)" }}>
              💬 भाव मोल-भाव &bull; Price Negotiation
            </h3>
            {bargainStatus === "AGREED" ? (
              <span className="badge badge-success">✓ भाव तय हुआ</span>
            ) : (
              <span className="badge badge-warning">मोल-भाव खुला है</span>
            )}
          </div>

          {bargainStatus === "AGREED" ? (
            <div className="alert alert-success" style={{ marginBottom: 0 }}>
              🎉 दोनों पक्षों ने <strong>₹{agreedRateRupees}/kg</strong> की दर पर सहमति दी है। तौल के समय इसी दर से भुगतान होगा।
            </div>
          ) : bargainStatus === "OFFER_BY_RECYCLER" ? (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--warning-bg)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--warning-border)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.8rem", color: "#92400e", fontWeight: 600 }}>रिसाइक्लर का नया प्रस्ताव:</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#b45309" }}>
                  ₹{bargainRateRupees} / kg
                </div>
                {tx.bargainNote && <div style={{ fontSize: "0.8rem", color: "#78350f" }}>नोट: "{tx.bargainNote}"</div>}
              </div>

              <form action={collectorAcceptBargainAction}>
                <input type="hidden" name="lotId" value={lot.id} />
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  style={{ backgroundColor: "var(--warning)", borderColor: "var(--warning)" }}
                >
                  ✓ यह भाव स्वीकार करें / Accept Price &rarr;
                </button>
              </form>
            </div>
          ) : bargainStatus === "OFFER_BY_COLLECTOR" ? (
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              ⏳ आपका <strong>₹{bargainRateRupees}/kg</strong> का मोल-भाव रिसाइक्लर के पास भेजा गया है। रिसाइक्लर के जवाब की प्रतीक्षा है।
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "0.8rem", color: "var(--slate-600)", margin: "0 0 0.85rem 0", lineHeight: 1.5 }}>
                यदि आपका माल अच्छी श्रेणी का है, तो आप अपनी इच्छित दर का प्रस्ताव रिसाइक्लर को भेज सकते हैं:
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
                      className="form-control"
                      style={{ fontSize: "1rem", fontWeight: 700 }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    प्रस्ताव भेजें &rarr;
                  </button>
                </div>
                <input
                  type="text"
                  name="note"
                  placeholder="टिप्पणी (जैसे: साफ़ किया हुआ माल / Clean sorted)"
                  className="form-control"
                  style={{ fontSize: "0.825rem" }}
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
          className="btn btn-secondary btn-block"
          style={{ padding: "0.875rem", fontSize: "0.925rem" }}
        >
          📄 सार्वजनिक डिजिटल रसीद देखें / View Public Receipt &rarr;
        </Link>
      )}

      {/* Action if Matched but needs different recycler */}
      {isMatched && (
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <Link
            href={`/collector/lots/${lot.id}/match`}
            style={{ fontSize: "0.825rem", color: "var(--primary-700)", fontWeight: 600, textDecoration: "underline" }}
          >
            दूसरा रिसाइक्लर बदलें / Change Recycler
          </Link>
        </div>
      )}

      {/* Delete Lot Option (for unfinalized lots) */}
      {!isCompleted && !isHandedOver && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px dashed #f87171",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "#991b1b", marginBottom: "0.5rem", fontWeight: 600 }}>
            लॉट रद्द या डिलीट करना चाहते हैं? / Want to cancel or delete this lot?
          </div>
          <form action={deleteLotAction}>
            <input type="hidden" name="lotId" value={lot.id} />
            <button
              type="submit"
              className="btn btn-danger btn-sm"
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              🗑️ लॉट हटाएं / Delete Lot
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
