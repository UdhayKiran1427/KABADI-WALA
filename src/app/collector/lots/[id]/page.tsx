import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleCheckBig,
  LoaderCircle,
  Lock,
  MapPin,
  Navigation,
  Phone,
  ReceiptText,
  RefreshCw,
  SearchX,
  Trash,
  TriangleAlert,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { confirmLotAction, rebroadcastLotAction, selectRecyclerOfferAction, deleteLotAction } from "../../actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DemoPaymentQr } from "@/components/payment/DemoPaymentQr";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";
import { ConfirmSubmit, LotStatusBadge, PageTitle, PageVoice, T } from "../../ui";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const spokenRupees = (paise: number) => (paise / 100).toFixed(0);

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
      transaction: { include: { recycler: true } },
      receiptTokens: { orderBy: { createdAt: "desc" }, take: 1 },
      offers: { include: { recycler: true }, orderBy: { distanceKm: "asc" } },
    },
  });

  if (!lot) {
    notFound();
  }

  if (user.role !== "ADMIN" && lot.collector.userId !== user.userId) {
    redirect("/collector");
  }

  const kg = (lot.approxWeightGrams / 1000).toFixed(1);
  const listedRate = lot.listedRatePerKgPaise ?? 0;
  const listedTotal = lot.estimatedValuePaise ?? calculateLotValuePaise(listedRate, lot.approxWeightGrams);
  const interested = lot.offers.filter((o) => o.status === "INTERESTED");
  const tx = lot.transaction;
  const recycler = tx?.recycler;
  const dealRate = tx ? tx.agreedRatePaise ?? tx.quotedRatePerKgPaise : listedRate;
  const dealTotal = tx?.finalPricePaise ?? calculateLotValuePaise(dealRate, lot.approxWeightGrams);
  const payToken = lot.receiptTokens[0]?.token;
  const canDelete = lot.status === "DRAFT" || lot.status === "READY";
  const isPaid = tx?.paymentStatus === "PAID";
  const rate = tx ? dealRate : listedRate;
  const total = tx ? dealTotal : listedTotal;

  const material = { hi: lot.category.nameHi, en: lot.category.nameEn, mr: lot.category.nameMr };

  // What the speaker reads depends on the step the collector is on.
  const base = {
    en: `${kg} kilo ${lot.category.nameEn}, ${spokenRupees(rate)} rupees per kilo, total ${spokenRupees(total)} rupees.`,
    hi: `${kg} किलो ${lot.category.nameHi}, ${spokenRupees(rate)} रुपये किलो, कुल ${spokenRupees(total)} रुपये।`,
    mr: `${kg} किलो ${lot.category.nameMr || lot.category.nameHi}, ${spokenRupees(rate)} रुपये किलो, एकूण ${spokenRupees(total)} रुपये.`,
  };
  const step = isPaid
    ? { en: "Payment received.", hi: "पैसे मिल गए।", mr: "पैसे मिळाले." }
    : lot.status === "DRAFT"
    ? { en: "Check and tap Confirm.", hi: "जांचें और पक्का करें दबाएं।", mr: "तपासा आणि निश्चित करा दाबा." }
    : lot.status === "READY"
    ? interested.length > 0
      ? {
          en: `${interested.length} buyers are ready. Choose one and tap Sell.`,
          hi: `${interested.length} खरीदार तैयार हैं। एक चुनें और बेचें दबाएं।`,
          mr: `${interested.length} खरेदीदार तयार आहेत. एक निवडा आणि विका दाबा.`,
        }
      : { en: "Waiting for buyers.", hi: "खरीदार का इंतज़ार है।", mr: "खरेदीदाराची वाट पाहत आहे." }
    : lot.status === "MATCHED"
    ? { en: "Show the QR code to the buyer to get paid.", hi: "पैसे लेने के लिए खरीदार को QR दिखाएं।", mr: "पैसे घेण्यासाठी खरेदीदाराला QR दाखवा." }
    : { en: "", hi: "", mr: "" };

  return (
    <div className="c-page">
      <PageVoice en={`${base.en} ${step.en}`} hi={`${base.hi} ${step.hi}`} mr={`${base.mr} ${step.mr}`} />
      {(lot.status === "READY" || lot.status === "MATCHED") && <AutoRefresh />}

      <PageTitle title={{ hi: "लॉट", en: "Lot", mr: "लॉट" }} back="/collector" sub={lot.lotRef} />

      {searchParams.success && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <CircleCheck size={18} aria-hidden="true" /> {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <TriangleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      {/* Lot summary: "10 kg Plastic × ₹10/kg = ₹100" */}
      <div className="card" style={{ padding: "1.25rem", textAlign: "center", border: lot.status === "DRAFT" ? "2px solid var(--primary)" : undefined }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <LotStatusBadge status={lot.status} />
        </div>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--slate-900)" }}>
          {kg} kg <T {...material} />
        </div>
        <div style={{ fontSize: "1rem", color: "var(--slate-600)", marginTop: "0.25rem" }}>
          × {rupees(rate)}/kg
        </div>
        <div className="c-total">= {rupees(total)}</div>

        {lot.status === "DRAFT" && (
          <>
            <form action={confirmLotAction} style={{ marginTop: "1rem" }}>
              <input type="hidden" name="lotId" value={lot.id} />
              <button type="submit" className="btn btn-primary btn-block btn-lg c-btn-xl">
                <Check size={22} aria-hidden="true" />
                <T hi="पक्का करें" en="Confirm" mr="निश्चित करा" />
              </button>
            </form>
            <div className="c-hint" style={{ justifyContent: "center", marginTop: "0.6rem" }}>
              <Lock size={14} aria-hidden="true" />
              <T hi="आपका नंबर छुपा रहेगा" en="Your number stays hidden" mr="तुमचा नंबर लपलेला राहील" />
            </div>
          </>
        )}
      </div>

      {/* READY: recyclers who want to buy */}
      {lot.status === "READY" && (
        <section style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <h2 className="c-section-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <T hi="खरीदार" en="Buyers" mr="खरेदीदार" />
            <span className="badge badge-neutral">{interested.length}</span>
          </h2>

          {interested.length === 0 ? (
            <div className="card c-empty">
              {lot.offers.length === 0 ? (
                <>
                  <SearchX size={32} aria-hidden="true" />
                  <T hi="पास में कोई खरीदार नहीं" en="No buyer nearby" mr="जवळ खरेदीदार नाही" />
                </>
              ) : (
                <>
                  <LoaderCircle size={32} className="c-spin" aria-hidden="true" />
                  <T hi="खरीदार का इंतज़ार…" en="Waiting for buyers…" mr="खरेदीदाराची वाट…" />
                </>
              )}
            </div>
          ) : (
            interested.map((offer) => {
              const offerRate = offer.ratePerKgPaise ?? listedRate;
              return (
                <div key={offer.id} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>{offer.recycler.name}</div>
                      <div className="c-hint">
                        <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <span>
                          {offer.distanceKm.toFixed(1)} km &middot; {offer.recycler.address}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--primary-800)" }}>
                        {rupees(calculateLotValuePaise(offerRate, lot.approxWeightGrams))}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>{rupees(offerRate)}/kg</div>
                    </div>
                  </div>
                  <form action={selectRecyclerOfferAction}>
                    <input type="hidden" name="lotId" value={lot.id} />
                    <input type="hidden" name="offerId" value={offer.id} />
                    <button type="submit" className="btn btn-primary btn-block btn-lg">
                      <T hi="इसे बेचें" en="Sell to this buyer" mr="याला विका" />
                      <ArrowRight size={20} aria-hidden="true" />
                    </button>
                  </form>
                </div>
              );
            })
          )}

          <form action={rebroadcastLotAction}>
            <input type="hidden" name="lotId" value={lot.id} />
            <button type="submit" className="btn btn-secondary btn-block">
              <RefreshCw size={18} aria-hidden="true" />
              <T hi="फिर खोजें" en="Search again" mr="पुन्हा शोधा" />
            </button>
          </form>
        </section>
      )}

      {/* MATCHED: get paid by QR */}
      {lot.status === "MATCHED" && payToken && !isPaid && (
        <div className="card" style={{ padding: "1.25rem", border: "2px solid #0284c7" }}>
          <DemoPaymentQr token={payToken} amountPaise={dealTotal} caption="खरीदार से QR स्कैन करवाएं · Let the buyer scan" />
        </div>
      )}

      {/* Paid */}
      {isPaid && (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", border: "2px solid var(--primary)" }}>
          <CircleCheckBig size={56} aria-hidden="true" style={{ color: "var(--primary)" }} />
          <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--primary-800)", marginTop: "0.5rem" }}>
            {rupees(dealTotal)} <T hi="मिले" en="received" mr="मिळाले" />
          </div>
          {payToken && (
            <Link href={`/invoice/${payToken}`} className="btn btn-secondary btn-block btn-lg" style={{ marginTop: "1rem" }}>
              <ReceiptText size={20} aria-hidden="true" />
              <T hi="बिल देखें" en="View bill" mr="बिल पहा" />
            </Link>
          )}
        </div>
      )}

      {/* Buyer details once chosen */}
      {recycler && (
        <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div className="c-hint" style={{ fontWeight: 700 }}>
            <T hi="खरीदार" en="Buyer" mr="खरेदीदार" />
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--slate-900)" }}>{recycler.name}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--slate-600)" }}>
            {[recycler.address, recycler.area, recycler.district].filter(Boolean).join(", ")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <a href={`tel:${recycler.contactPhone}`} className="btn btn-secondary btn-lg">
              <Phone size={18} aria-hidden="true" />
              <T hi="कॉल" en="Call" mr="कॉल" />
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${recycler.latitude},${recycler.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-lg"
            >
              <Navigation size={18} aria-hidden="true" />
              <T hi="रास्ता" en="Map" mr="रस्ता" />
            </a>
          </div>
        </div>
      )}

      {canDelete && (
        <form action={deleteLotAction} style={{ textAlign: "center" }}>
          <input type="hidden" name="lotId" value={lot.id} />
          <ConfirmSubmit
            className="btn btn-secondary btn-sm c-danger-text"
            question={{ hi: "यह लॉट हटाएं?", en: "Delete this lot?", mr: "हा लॉट हटवायचा?" }}
          >
            <Trash size={16} aria-hidden="true" />
            <T hi="लॉट हटाएं" en="Delete lot" mr="लॉट हटवा" />
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
