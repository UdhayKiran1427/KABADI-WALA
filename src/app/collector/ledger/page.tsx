import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            मेरी कमाई / Earnings Ledger
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>नकद भुगतान एवं बकाया राशि / Cash Payments</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div
          style={{
            backgroundColor: "#ecfdf5",
            borderRadius: "14px",
            padding: "1rem",
            border: "1px solid #a7f3d0",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#065f46", fontWeight: 700 }}>कुल प्राप्त नकद / Received</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#047857", marginTop: "0.2rem" }}>
            ₹{(totalReceivedPaise / 100).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#059669", marginTop: "0.2rem" }}>✓ 100% हाथों-हाथ मिला</div>
        </div>

        <div
          style={{
            backgroundColor: "#fffbeb",
            borderRadius: "14px",
            padding: "1rem",
            border: "1px solid #fde68a",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#92400e", fontWeight: 700 }}>आगामी बकाया / Pending</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#b45309", marginTop: "0.2rem" }}>
            ₹{(totalPendingPaise / 100).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#d97706", marginTop: "0.2rem" }}>तौल के बाद भुगतान</div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "0.75rem 1rem",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>कुल एकत्रित ई-कचरा / Total Waste:</span>
        <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b" }}>{totalKg.toFixed(1)} kg</span>
      </div>

      {/* Transactions List */}
      <div>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.6rem" }}>
          लेनदेन विवरण / Transactions List
        </h2>

        {lots.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              textAlign: "center",
              color: "#64748b",
              border: "1px dashed #cbd5e1",
            }}
          >
            कोई लेनदेन नहीं मिला / No transactions recorded yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
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
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    padding: "0.875rem 1rem",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                      {lot.category.nameHi}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                      {lot.lotRef} • {(lot.approxWeightGrams / 1000).toFixed(1)} kg
                      {recyclerName && ` • ${recyclerName}`}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>
                      ₹{amountRupees}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
                      {lot.status === "COMPLETED" ? `✓ ${paymentMethod} प्राप्त` : "⏳ लंबित (Pending)"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
