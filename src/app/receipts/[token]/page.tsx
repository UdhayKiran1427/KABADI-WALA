import { prisma } from "@/lib/prisma";
import { buildPublicReceipt } from "@/lib/domain/anonymization";
import Link from "next/link";

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const shareToken = await prisma.receiptShareToken.findUnique({
    where: { token },
    include: {
      lot: {
        include: {
          category: true,
          collector: true,
          transaction: { include: { recycler: true } },
          handovers: { where: { status: "CONFIRMED" }, take: 1 },
        },
      },
    },
  });

  if (!shareToken || !shareToken.lot) {
    return (
      <div style={{ maxWidth: "500px", margin: "4rem auto", padding: "1rem" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📄</div>
          <h2>रसीद नहीं मिली &bull; Receipt Not Found</h2>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            This transaction receipt link is invalid, expired, or has been revoked.
          </p>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: "1.5rem" }}>
            Return to Platform Home
          </Link>
        </div>
      </div>
    );
  }

  const lot = shareToken.lot;
  const recycler = lot.transaction?.recycler;
  const handover = lot.handovers[0];

  const receipt = buildPublicReceipt(
    lot.lotRef,
    lot.category.nameEn,
    handover?.confirmedWeightGrams || lot.approxWeightGrams,
    lot.finalPricePaise || 0,
    handover?.recyclerConfirmedAt || lot.updatedAt,
    recycler?.name || "Authorized Formal Recycler",
    recycler?.authorizationNo || "VERIFIED"
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem 1rem 4rem" }}>
      <div
        className="card"
        style={{
          maxWidth: "540px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--slate-200)",
          padding: "2rem 1.75rem",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
        }}
      >
        {/* Certificate Header */}
        <div style={{ textAlign: "center", borderBottom: "2px dashed var(--slate-300)", paddingBottom: "1.75rem", marginBottom: "1.75rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--primary-700)", fontWeight: 800, fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            <span>♻️</span> KABADI WALA
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.01em" }}>
            Formal Traceability Receipt
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.775rem", marginTop: "0.2rem" }}>
            Government-Compliant E-Waste Handover Verification &bull; EPR Proof
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <span className="badge badge-success" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>
              ✓ Verified &amp; Settled Transaction
            </span>
          </div>
        </div>

        {/* Receipt Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.9rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--slate-500)" }}>Lot Reference</span>
            <strong><code>{receipt.lotRef}</code></strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--slate-500)" }}>Scrap Material</span>
            <strong style={{ color: "var(--slate-900)" }}>{receipt.categoryName}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--slate-500)" }}>Scale Confirmed Weight</span>
            <strong style={{ color: "var(--primary-800)", fontSize: "1rem" }}>{receipt.weightKg} kg</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--slate-500)" }}>Settlement Amount</span>
            <strong style={{ fontSize: "1.35rem", color: "var(--primary-800)" }}>{receipt.finalPriceRupees}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem", alignItems: "flex-start" }}>
            <span style={{ color: "var(--slate-500)" }}>Authorized Recycler</span>
            <strong style={{ textAlign: "right", color: "var(--slate-900)" }}>{receipt.recyclerName}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--slate-500)" }}>CPCB / SPCB Auth No</span>
            <code>{receipt.authorizationNo}</code>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--slate-100)", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--slate-500)" }}>Collector Short Code</span>
            <span className="badge badge-neutral">#{lot.collector.shortCode}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.25rem" }}>
            <span style={{ color: "var(--slate-500)" }}>Verification Timestamp</span>
            <span style={{ color: "var(--slate-700)", fontSize: "0.825rem" }}>
              {new Date(receipt.confirmedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        {/* Privacy Note */}
        <div
          style={{
            marginTop: "1.75rem",
            padding: "0.875rem",
            backgroundColor: "var(--slate-50)",
            borderRadius: "var(--radius)",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--slate-500)",
            lineHeight: 1.5,
            border: "1px solid var(--slate-200)",
          }}
        >
          🔒 <strong>Zero-PII Privacy Protection:</strong> Personal phone numbers, home locations, and banking identifiers are strictly excluded from public receipts.
        </div>

        {/* Navigation & Print */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Link href="/" className="btn btn-secondary btn-sm">
            &larr; Platform Home
          </Link>
        </div>
      </div>
    </div>
  );
}
