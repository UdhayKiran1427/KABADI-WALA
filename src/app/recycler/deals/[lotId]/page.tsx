import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheckBig, Map as MapIcon, Phone, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DemoPaymentQr } from "@/components/payment/DemoPaymentQr";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";

export default async function RecyclerDealPage(props: { params: Promise<{ lotId: string }> }) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const { lotId } = await props.params;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      category: true,
      collector: { include: { user: { select: { phone: true } } } },
      transaction: true,
      receiptTokens: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Only the recycler the collector selected may see the collector's details
  if (!lot || !dbUser.recyclerId || lot.chosenRecyclerId !== dbUser.recyclerId || !lot.transaction) {
    notFound();
  }

  const tx = lot.transaction;
  const rate = tx.agreedRatePaise ?? tx.quotedRatePerKgPaise;
  const amountPaise = tx.finalPricePaise ?? calculateLotValuePaise(rate, lot.approxWeightGrams);
  const isPaid = tx.paymentStatus === "PAID";
  const token = lot.receiptTokens[0]?.token;
  const collectorName = lot.collector.name || `Collector ${lot.collector.shortCode}`;
  const area = [lot.collector.operatingArea, lot.collector.district].filter(Boolean).join(", ");

  return (
    <div className="r-stack">
      {!isPaid && <AutoRefresh />}

      <div>
        <Link href="/recycler" className="r-inline r-muted">
          <ArrowLeft size={16} aria-hidden="true" /> Dashboard
        </Link>
        <h1 className="r-page-title" style={{ marginTop: "0.25rem" }}>Lot {lot.lotRef}</h1>
      </div>

      <div className="r-grid-2-lg">
        {/* Payment first: it is the one action on this screen */}
        <div className="card" style={{ padding: "1.5rem", border: isPaid ? "2px solid var(--primary)" : "2px solid var(--info)" }}>
          {isPaid ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", textAlign: "center" }}>
              <CircleCheckBig size={44} color="var(--primary)" aria-hidden="true" />
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary-800)" }}>Payment successful</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900 }}>₹{(amountPaise / 100).toLocaleString("en-IN")}</div>
              {token && (
                <Link href={`/invoice/${token}`} className="btn btn-secondary btn-block" style={{ marginTop: "0.5rem" }}>
                  <Receipt size={16} aria-hidden="true" /> View invoice
                </Link>
              )}
            </div>
          ) : token ? (
            <DemoPaymentQr token={token} amountPaise={amountPaise} caption={`Scan to pay ${collectorName}`} />
          ) : (
            <div className="alert alert-danger" style={{ marginBottom: 0 }}>Payment link missing for this deal.</div>
          )}
        </div>

        <div className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <h2 className="r-section-title" style={{ marginBottom: "0.5rem" }}>{collectorName}</h2>
          <div className="r-kv">
            <span>Phone</span>
            <span>
              <a href={`tel:${lot.collector.user.phone}`} className="r-inline" style={{ color: "var(--primary-700)" }}>
                <Phone size={15} aria-hidden="true" /> {lot.collector.user.phone}
              </a>
            </span>
          </div>
          {area && (
            <div className="r-kv">
              <span>Area</span>
              <span>{area}</span>
            </div>
          )}
          <div className="r-kv">
            <span>Collector code</span>
            <span>{lot.collector.shortCode}</span>
          </div>
          <div className="r-kv">
            <span>Material</span>
            <span>{lot.category.nameEn} ({lot.category.nameHi})</span>
          </div>
          <div className="r-kv">
            <span>Weight</span>
            <span>{(lot.approxWeightGrams / 1000).toFixed(1)} kg</span>
          </div>
          <div className="r-kv">
            <span>Rate</span>
            <span>₹{(rate / 100).toFixed(2)}/kg</span>
          </div>
          <div className="r-kv" style={{ borderBottom: "none", fontSize: "1.05rem" }}>
            <span>Total</span>
            <span style={{ fontWeight: 800 }}>₹{(amountPaise / 100).toLocaleString("en-IN")}</span>
          </div>

          {lot.collectLat != null && lot.collectLng != null && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lot.collectLat},${lot.collectLng}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "0.75rem" }}
            >
              <MapIcon size={15} aria-hidden="true" /> Open in Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
