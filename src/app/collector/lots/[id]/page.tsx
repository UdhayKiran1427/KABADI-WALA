import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  collectorBargainOfferAction,
  collectorAcceptBargainAction,
  deleteLotAction,
} from "../../actions";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

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

  const narration = {
    en: `Lot handover pass. Lot reference: ${lot.lotRef}. Category: ${lot.category.nameEn}. Weight: ${declaredKg} kilograms. Status: ${lot.status}. Verification PIN is ${verificationCode}. Share this PIN with the recycler at the scale.`,
    hi: `लॉट हैंडओवर पास। लॉट कोड: ${lot.lotRef}। सामग्री: ${lot.category.nameHi}। वजन: ${declaredKg} किलो। स्थिति: ${lot.status}। सत्यापन पिन: ${verificationCode}। तौल के समय रिसाइक्लर को यह पिन बताएं।`,
    mr: `लॉट हँडओव्हर पास. लॉट कोड: ${lot.lotRef}. वर्गवारी: ${lot.category.nameMr || lot.category.nameHi}. वजन: ${declaredKg} किलो. स्थिती: ${lot.status}. पडताळणी पिन: ${verificationCode}. वजनाच्या वेळी रिसायकलरला हा कोड सांगा.`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="lot-detail-narration" />

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
            हैंडओवर सत्यापन पास &bull; Gate Handover Pass
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
            लॉट कोड: <code>{lot.lotRef}</code> &bull; Status: <strong>{lot.status}</strong>
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

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="collector-layout-wrapper">
        {/* LEFT COLUMN: Main 4-Digit Pass & Bargain */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
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
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-700)" }}>
              तौल ऑपरेटर को यह 4-अंकों का कोड बताएं
            </div>
            <div style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
              Tell this 4-digit code to scale operator
            </div>

            <div
              style={{
                fontSize: "3.5rem",
                fontWeight: 900,
                letterSpacing: "0.75rem",
                color: isCompleted ? "var(--primary-800)" : "#0369a1",
                margin: "1rem 0",
                fontFamily: "var(--font-mono)",
                textIndent: "0.75rem",
              }}
            >
              {verificationCode}
            </div>

            {/* Listen to Code Digit-by-Digit (Audio Accessibility) */}
            {verificationCode !== "----" && (
              <div style={{ marginBottom: "1rem" }}>
                <VoiceSpeaker
                  id={`code-speaker-${lot.id}`}
                  textHi={`आपका 4 अंकों का सत्यापन कोड है ${verificationCode.split("").join(" ")}। तौल ऑपरेटर को यह कोड बताएं।`}
                  textMr={`तुमचा 4 अंकी पडताळणी कोड आहे ${verificationCode.split("").join(" ")}. ऑपरेटरला हा कोड सांगा.`}
                  size="sm"
                  variant="pill"
                  label="कोड बोलकर सुनें / Hear Code"
                />
              </div>
            )}

            <div>
              <span
                className={isCompleted ? "badge badge-success" : isHandedOver ? "badge badge-info" : "badge badge-warning"}
                style={{ fontSize: "0.825rem", padding: "0.4rem 0.9rem" }}
              >
                {isCompleted
                  ? "✓ तौल और नकद भुगतान पूरा हुआ (Paid)"
                  : isHandedOver
                  ? "⚖️ तौल सत्यापन जारी है (Weighing in Progress)"
                  : "⏳ रिसाइक्लर के पास सामान ले जाएं (Take to Facility Gate)"}
              </span>
            </div>
          </div>

          {/* Price Bargaining Section */}
          {!isCompleted && tx && (
            <div
              className="card"
              style={{
                border: bargainStatus === "AGREED" ? "2px solid var(--primary)" : "1.5px solid var(--slate-300)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--slate-900)" }}>
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
                  <p style={{ fontSize: "0.825rem", color: "var(--slate-600)", margin: "0 0 0.85rem 0", lineHeight: 1.5 }}>
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

          {/* Delete Lot Option */}
          {!isCompleted && !isHandedOver && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#fef2f2",
                border: "1px dashed #f87171",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#991b1b", marginBottom: "0.5rem", fontWeight: 600 }}>
                लॉट रद्द या हटाना चाहते हैं? / Cancel or Delete Lot
              </div>
              <form action={deleteLotAction}>
                <input type="hidden" name="lotId" value={lot.id} />
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  style={{
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    padding: "0.45rem 1.25rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  🗑️ लॉट हटाएं / Delete Lot
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Lot Specification, Recycler Facility & Receipt (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Lot Summary Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
              📋 लॉट विवरण &bull; Lot Specifications
            </h3>

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

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.25rem" }}>
              <span style={{ color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 600 }}>कुल भुगतान राशि / Total Payout</span>
              <span style={{ fontWeight: 900, fontSize: "1.35rem", color: "var(--primary-800)" }}>₹{finalAmountRupees}</span>
            </div>
          </div>

          {/* Recycler Facility Location & Contact */}
          {recycler && (
            <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid #0284c7" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.5rem" }}>
                🏢 रिसाइक्लर सुविधा &bull; Facility Info
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
                <div><strong>नाम:</strong> {recycler.name}</div>
                <div><strong>पता:</strong> {recycler.address}</div>
                <div><strong>संपर्क:</strong> 📞 {recycler.contactPhone}</div>
              </div>

              {isMatched && (
                <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid var(--slate-200)" }}>
                  <Link
                    href={`/collector/lots/${lot.id}/match`}
                    style={{ fontSize: "0.825rem", color: "var(--primary-700)", fontWeight: 700 }}
                  >
                    🔄 दूसरा रिसाइक्लर बदलें &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Shareable Public Receipt Link */}
          {receiptToken && (
            <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
                📄 डिजिटल रसीद &bull; Public Receipt
              </h3>
              <p style={{ fontSize: "0.775rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                यह रसीद सरकार एवं CPCB द्वारा मान्य है। इसे किसी को भी शेयर कर सकते हैं।
              </p>
              <Link
                href={`/receipts/${receiptToken}`}
                target="_blank"
                className="btn btn-secondary btn-block"
                style={{ padding: "0.75rem", fontSize: "0.85rem" }}
              >
                रसीद खोलें / View Receipt &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
