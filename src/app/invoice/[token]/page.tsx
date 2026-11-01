import { notFound } from "next/navigation";
import { CircleCheckBig, Hourglass, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="r-kv" style={strong ? { fontSize: "1.15rem" } : undefined}>
      <span>{label}</span>
      <span style={strong ? { fontWeight: 900 } : undefined}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate-500)", margin: "1.25rem 0 0.25rem" }}>
      {children}
    </h3>
  );
}

export default async function InvoicePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  const share = await prisma.receiptShareToken.findUnique({
    where: { token },
    include: {
      lot: {
        include: {
          category: true,
          collector: { include: { user: { select: { phone: true } } } },
          transaction: { include: { recycler: true } },
          payments: { orderBy: { paidAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!share || share.expiresAt < new Date() || !share.lot.transaction) {
    notFound();
  }

  const lot = share.lot;
  const tx = share.lot.transaction;
  const recycler = tx.recycler;
  const payment = lot.payments[0];
  const isPaid = tx.paymentStatus === "PAID";
  const ratePaise = tx.agreedRatePaise ?? tx.quotedRatePerKgPaise;
  const amountPaise = tx.finalPricePaise ?? calculateLotValuePaise(ratePaise, lot.approxWeightGrams);
  const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "1.5rem auto", padding: "0 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {isPaid ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: "1.75rem 1.25rem", border: "2px solid var(--primary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}
        >
          <CircleCheckBig size={48} color="var(--primary)" aria-hidden="true" />
          <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--primary-800)", marginTop: "0.25rem" }}>
            Payment successful
          </h1>
          <div style={{ fontSize: "0.9rem", color: "var(--slate-500)" }}>भुगतान सफल</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{rupees(amountPaise)}</div>
          {payment && (
            <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
              {payment.method} · Ref {payment.upiRef} · {payment.paidAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}
          <span className="badge badge-warning" style={{ fontSize: "0.7rem", marginTop: "0.35rem" }}>Demo – no real money</span>
        </div>
      ) : (
        <div className="alert alert-warning" style={{ marginBottom: 0 }}>
          <Hourglass size={18} aria-hidden="true" /> Payment pending for this lot.
        </div>
      )}

      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <h2 className="r-section-title">
            <Receipt size={20} aria-hidden="true" /> Invoice
          </h2>
          <code style={{ fontSize: "0.8rem" }}>{lot.lotRef}</code>
        </div>

        <Row label="Material" value={`${lot.category.nameEn} (${lot.category.nameHi})`} />
        <Row label="Weight" value={`${(lot.approxWeightGrams / 1000).toFixed(1)} kg`} />
        <Row label="Rate" value={`${rupees(ratePaise)} / kg`} />
        <Row label="Total" value={rupees(amountPaise)} strong />

        <SectionTitle>Seller (collector)</SectionTitle>
        <Row label="Name" value={lot.collector.name || `Collector ${lot.collector.shortCode}`} />
        <Row label="Phone" value={lot.collector.user.phone} />
        <Row label="Area" value={[lot.collector.operatingArea, lot.collector.district].filter(Boolean).join(", ")} />

        <SectionTitle>Buyer (recycler)</SectionTitle>
        <Row label="Name" value={recycler.name} />
        <Row label="Address" value={recycler.address} />
        <Row label="Phone" value={recycler.contactPhone} />
        <Row label="Authorization no." value={recycler.authorizationNo} />
      </div>
    </div>
  );
}
