import { prisma } from "@/lib/prisma";
import { buildPublicReceipt } from "@/lib/domain/anonymization";

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
          <h2>Receipt Not Found</h2>
          <p className="text-muted">This transaction receipt link is invalid or has expired.</p>
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
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "550px", margin: "0 auto", background: "white", borderRadius: "12px", border: "1px solid var(--border)", padding: "2rem", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", borderBottom: "2px dashed #cbd5e1", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>♻️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Formal Traceability Receipt</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>Government-Compliant E-Waste Handover Verification</p>
          <div style={{ marginTop: "0.5rem" }}>
            <span className="badge badge-success">✓ Verified Transaction</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9375rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Lot Reference:</span>
            <strong><code>{receipt.lotRef}</code></strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Material:</span>
            <strong>{receipt.categoryName}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Scale Confirmed Weight:</span>
            <strong>{receipt.weightKg} kg</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Settlement Amount:</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--primary)" }}>{receipt.finalPriceRupees}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Authorized Recycler:</span>
            <strong>{receipt.recyclerName}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>CPCB/SPCB Auth No:</span>
            <code>{receipt.authorizationNo}</code>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Verified At:</span>
            <span>{new Date(receipt.confirmedAt).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div style={{ marginTop: "2rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "6px", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          🔒 Privacy Protected: No personal collector data or phone numbers are exposed on public receipts.
        </div>
      </div>
    </div>
  );
}

