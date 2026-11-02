import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, CircleCheck, CircleCheckBig, Map as MapIcon, Phone, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DemoPaymentQr } from "@/components/payment/DemoPaymentQr";
import { LOT_ITEMS_INCLUDE, dealLines, lotItemsOf, lotPhotoUrls } from "@/lib/services/lotItemsView";
import { LotPhotoStrip } from "@/components/LotPhotoStrip";
import { rupeesIN } from "@/lib/format";
import { SendVehicleCard } from "./SendVehicleCard";
import { T } from "@/app/collector/ui";

export default async function RecyclerDealPage(props: {
  params: Promise<{ lotId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const { lotId } = await props.params;
  const searchParams = await props.searchParams;

  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      category: true,
      collector: { include: { user: { select: { phone: true } } } },
      transaction: true,
      receiptTokens: { orderBy: { createdAt: "desc" }, take: 1 },
      images: { select: { id: true, storageKey: true } },
      ...LOT_ITEMS_INCLUDE,
    },
  });

  // Only the recycler the collector selected may see the collector's details
  if (!lot || !dbUser.recyclerId || lot.chosenRecyclerId !== dbUser.recyclerId || !lot.transaction) {
    notFound();
  }

  const tx = lot.transaction;
  const lines = dealLines(lotItemsOf(lot), tx);
  const photos = await lotPhotoUrls(lot.images);
  const amountPaise = tx.finalPricePaise ?? tx.quotedPricePaise;
  const isPaid = tx.paymentStatus === "PAID";
  const token = lot.receiptTokens[0]?.token;
  const collectorName = lot.collector.name || `Collector ${lot.collector.shortCode}`;
  const area = [lot.collector.operatingArea, lot.collector.district].filter(Boolean).join(", ");

  return (
    <div className="r-stack">
      {!isPaid && <AutoRefresh />}

      <div>
        <Link href="/recycler" className="r-inline r-muted">
          <ArrowLeft size={16} aria-hidden="true" /> <T hi="डैशबोर्ड" en="Dashboard" mr="डॅशबोर्ड" />
        </Link>
        <h1 className="r-page-title" style={{ marginTop: "0.25rem" }}>
          <T hi="लॉट" en="Lot" mr="लॉट" /> {lot.lotRef}
        </h1>
      </div>

      {searchParams.success && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <CircleCheck size={18} aria-hidden="true" /> {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <CircleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      <div className="r-grid-2-lg">
        {/* Payment first, then sending a vehicle for the pickup */}
        <div className="r-stack" style={{ minWidth: 0 }}>
          <div className="card" style={{ padding: "1.5rem", border: isPaid ? "2px solid var(--primary)" : "2px solid var(--info)" }}>
            {isPaid ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", textAlign: "center" }}>
                <CircleCheckBig size={44} color="var(--primary)" aria-hidden="true" />
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary-800)" }}>
                  <T hi="पेमेंट सफल" en="Payment successful" mr="पेमेंट यशस्वी" />
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900 }}>₹{rupeesIN(amountPaise)}</div>
                {token && (
                  <Link href={`/invoice/${token}`} className="btn btn-secondary btn-block" style={{ marginTop: "0.5rem" }}>
                    <Receipt size={16} aria-hidden="true" /> <T hi="बिल देखें" en="View invoice" mr="बिल पहा" />
                  </Link>
                )}
              </div>
            ) : token ? (
              <DemoPaymentQr token={token} amountPaise={amountPaise} caption={
                <T hi={`${collectorName} को पेमेंट के लिए स्कैन करें`} en={`Scan to pay ${collectorName}`} mr={`${collectorName} ला पेमेंटसाठी स्कॅन करा`} />
              } />
            ) : (
              <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                <T hi="इस डील का पेमेंट लिंक नहीं मिला।" en="Payment link missing for this deal." mr="या डीलची पेमेंट लिंक सापडली नाही." />
              </div>
            )}
          </div>
          <SendVehicleCard lotId={lot.id} recyclerId={dbUser.recyclerId} />
        </div>

        <div className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <h2 className="r-section-title" style={{ marginBottom: "0.5rem" }}>{collectorName}</h2>
          <div className="r-kv">
            <span>
              <T hi="फ़ोन" en="Phone" mr="फोन" />
            </span>
            <span>
              <a href={`tel:${lot.collector.user.phone}`} className="r-inline" style={{ color: "var(--primary-700)" }}>
                <Phone size={15} aria-hidden="true" /> {lot.collector.user.phone}
              </a>
            </span>
          </div>
          {area && (
            <div className="r-kv">
              <span>
                <T hi="इलाका" en="Area" mr="परिसर" />
              </span>
              <span>{area}</span>
            </div>
          )}
          <div className="r-kv">
            <span>
              <T hi="कलेक्टर कोड" en="Collector code" mr="कलेक्टर कोड" />
            </span>
            <span>{lot.collector.shortCode}</span>
          </div>
          {lines.map((line) => (
            <div key={line.categoryId} className="r-kv">
              <span>
                <T hi={line.category.nameHi} en={line.category.nameEn} mr={line.category.nameMr} /> · {(line.weightGrams / 1000).toFixed(1)} kg × ₹{(line.ratePerKgPaise / 100).toFixed(2)}
              </span>
              <span>₹{(line.amountPaise / 100).toLocaleString("en-IN")}</span>
            </div>
          ))}
          <div className="r-kv" style={{ borderBottom: "none", fontSize: "1.05rem" }}>
            <span>
              <T hi="कुल" en="Total" mr="एकूण" />
            </span>
            <span style={{ fontWeight: 800 }}>₹{rupeesIN(amountPaise)}</span>
          </div>

          {photos.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <LotPhotoStrip photos={photos} />
            </div>
          )}

          {lot.collectLat != null && lot.collectLng != null && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lot.collectLat},${lot.collectLng}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "0.75rem" }}
            >
              <MapIcon size={15} aria-hidden="true" /> <T hi="मैप में खोलें" en="Open in Maps" mr="मॅपमध्ये उघडा" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
