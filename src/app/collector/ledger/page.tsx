import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function CollectorLedgerPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  const collectorId = collector?.id;

  const lots = collectorId
    ? await prisma.lot.findMany({
        where: { collectorId },
        orderBy: { collectedAt: "desc" },
        include: {
          category: true,
          transaction: {
            include: {
              payments: true,
              recycler: { select: { name: true } },
            },
          },
        },
      })
    : [];

  let totalReceivedPaise = 0;
  let totalPendingPaise = 0;
  let totalKg = 0;

  for (const lot of lots) {
    totalKg += lot.approxWeightGrams / 1000;
    const finalAmount = lot.finalPricePaise || lot.estimatedValuePaise || 0;
    if (lot.status === "COMPLETED") {
      totalReceivedPaise += finalAmount;
    } else if (lot.status !== "CANCELLED" && lot.status !== "REJECTED") {
      totalPendingPaise += finalAmount;
    }
  }

  const narration = {
    en: `Earnings ledger. Total received: ₹${(totalReceivedPaise / 100).toLocaleString("en-IN")}. Pending amount: ₹${(totalPendingPaise / 100).toLocaleString("en-IN")}. Total scrap collected: ${totalKg.toFixed(1)} kilograms.`,
    hi: `मेरी कमाई का बहीखाता। कुल प्राप्त राशि: ₹${(totalReceivedPaise / 100).toLocaleString("en-IN")}। बकाया राशि: ₹${(totalPendingPaise / 100).toLocaleString("en-IN")}। कुल कचरा: ${totalKg.toFixed(1)} किलोग्राम।`,
    mr: `माझी कमाई हिशोब. एकूण मिळालेली रक्कम: ₹${(totalReceivedPaise / 100).toLocaleString("en-IN")}. बाकी रक्कम: ₹${(totalPendingPaise / 100).toLocaleString("en-IN")}. एकूण स्क्रॅप: ${totalKg.toFixed(1)} किलो.`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="ledger-page-narration" />

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
            मेरी कमाई &bull; Earnings &amp; Payout Ledger
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
            नकद व UPI भुगतान बहीखाता &bull; Cash Settlements &amp; Pending Balance
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="collector-layout-wrapper">
        {/* LEFT COLUMN: Main Ledger & Transactions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            <div
              style={{
                backgroundColor: "var(--primary-50)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                border: "1.5px solid var(--primary-border)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "var(--primary-800)", fontWeight: 700 }}>
                कुल प्राप्त नकद / Received Payout
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--primary-900)", marginTop: "0.25rem", letterSpacing: "-0.02em" }}>
                ₹{(totalReceivedPaise / 100).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--primary-700)", marginTop: "0.35rem" }}>
                ✓ 100% हाथों-हाथ मिला (Direct Payout)
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fffbeb",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                border: "1.5px solid #fde68a",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#92400e", fontWeight: 700 }}>
                आगामी बकाया / Pending Settlement
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#b45309", marginTop: "0.25rem", letterSpacing: "-0.02em" }}>
                ₹{(totalPendingPaise / 100).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#d97706", marginTop: "0.35rem" }}>
                तौल सत्यापन के बाद देय
              </div>
            </div>
          </div>

          {/* Waste Weight Stat */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-md)",
              padding: "0.875rem 1.25rem",
              border: "1px solid var(--slate-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <span style={{ fontSize: "0.875rem", color: "var(--slate-600)", fontWeight: 600 }}>
              कुल एकत्रित एवं पुनर्चक्रित कचरा / Total Recycled Weight:
            </span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--slate-900)" }}>
              {totalKg.toFixed(1)} kg
            </span>
          </div>

          {/* Transactions List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--slate-900)" }}>
                लेनदेन विवरण &bull; Transactions List
              </h2>
              <span className="badge badge-neutral">{lots.length} Records</span>
            </div>

            {lots.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  color: "var(--slate-500)",
                  border: "1.5px dashed var(--slate-300)",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>🪙</div>
                <div style={{ fontWeight: 700, color: "var(--slate-700)" }}>कोई लेनदेन नहीं मिला</div>
                <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  जब आप स्क्रैप लॉट बेचेंगे, यहाँ रसीद और भुगतान विवरण दिखाई देगा।
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {lots.map((lot) => {
                  const amountRupees = (
                    (lot.finalPricePaise || lot.estimatedValuePaise || 0) /
                    100
                  ).toLocaleString("en-IN");

                  const paymentMethod = lot.transaction?.payments[0]?.method || "CASH";
                  const recyclerName = lot.transaction?.recycler?.name;

                  return (
                    <Link
                      key={lot.id}
                      href={`/collector/lots/${lot.id}`}
                      className="card card-interactive"
                      style={{
                        padding: "1rem 1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--slate-900)" }}>
                          {lot.category.nameHi} <span style={{ fontSize: "0.825rem", fontWeight: 500, color: "var(--slate-500)" }}>({lot.category.nameEn})</span>
                        </div>
                        <div style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginTop: "0.2rem" }}>
                          <code>{lot.lotRef}</code> &bull; {(lot.approxWeightGrams / 1000).toFixed(1)} kg
                          {recyclerName && ` &bull; 🏢 ${recyclerName}`}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--primary-800)" }}>
                          ₹{amountRupees}
                        </div>
                        <div style={{ marginTop: "0.2rem" }}>
                          {lot.status === "COMPLETED" ? (
                            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                              ✓ {paymentMethod} भुगतान
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                              ⏳ लंबित (Pending)
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Payout Guarantees & Collector Protection (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Direct Cash Guarantee Card */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.5rem" }}>
              💵 100% नकद गारंटी &bull; Payout Rights
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>✅</span>
                <span><strong>कोई कमीशन नहीं:</strong> रिसाइक्लर से मिलने वाला पूरा पैसा आपका है। कोई बिचौलिया कटौती नहीं।</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>✅</span>
                <span><strong>कांटा तौल रसीद:</strong> गेट पर प्रमाणित डिजिटल कांटे से तौल होती है। कम तौलने पर तुरंत शिकायत करें।</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>✅</span>
                <span><strong>नकद या UPI:</strong> आपकी पसंद के अनुसार तुरंत नकद रुपया या फोनपे/गूगलपे पर भुगतान लें।</span>
              </div>
            </div>
          </div>

          {/* Quick Support Card */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              📞 कबाड़ी साथी हेल्पलाइन
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              यदि किसी रिसाइक्लर ने तौल में गड़बड़ी की या भुगतान रोका, तो तुरंत अपने वार्ड के फील्ड एजेंट या हेल्पलाइन पर संपर्क करें:
            </p>
            <div style={{ marginTop: "0.6rem", fontWeight: 700, color: "var(--primary-800)", fontSize: "0.95rem" }}>
              📱 1800-KABADI-WALA (Toll Free)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
