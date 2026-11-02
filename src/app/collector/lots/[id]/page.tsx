import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BellRing, Check, CircleCheck, CircleCheckBig, LoaderCircle, Lock, MapPin, ReceiptText, RefreshCw, SearchX, Trash, TriangleAlert, Truck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { confirmLotAction, rebroadcastLotAction, selectRecyclerOfferAction, deleteLotAction, submitCoverageRequestAction, createPickupRequestAction } from "../../actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DemoPaymentQr } from "@/components/payment/DemoPaymentQr";
import { calculateLotValuePaise } from "@/lib/domain/lotBroadcast";
import { offerTotalPaise } from "@/lib/services/lotFlowService";
import { LOT_ITEMS_INCLUDE, lotItemsOf, lotPhotoUrls } from "@/lib/services/lotItemsView";
import { LotPhotoStrip } from "@/components/LotPhotoStrip";
import { ConfirmSubmit, LotStatusBadge, PageTitle, PageVoice, T } from "../../ui";
import { RecyclerDirectionsCard } from "@/components/geo/RecyclerDirectionsCard";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";
import { calculateTravelMinutes } from "@/lib/domain/geoDirections";
import { inr } from "@/lib/format";
import { getLotDispatch } from "@/lib/services/vehicleService";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const spokenRupees = (paise: number) => Math.round(paise / 100).toString();


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
      images: true,
      ...LOT_ITEMS_INCLUDE,
    },
  });

  if (!lot) {
    notFound();
  }

  if (user.role !== "ADMIN" && lot.collector.userId !== user.userId) {
    redirect("/collector");
  }

  const items = lotItemsOf(lot);
  const photos = await lotPhotoUrls(lot.images);
  const kg = (lot.approxWeightGrams / 1000).toFixed(1);
  const listedRate = lot.listedRatePerKgPaise ?? 0;
  const listedTotal = lot.estimatedValuePaise ?? calculateLotValuePaise(listedRate, lot.approxWeightGrams);
  const interested = lot.offers.filter((o) => o.status === "INTERESTED");
  const tx = lot.transaction;
  const recycler = tx?.recycler;
  const dealRate = tx ? tx.agreedRatePaise ?? tx.quotedRatePerKgPaise : listedRate;
  const dealTotal = tx ? tx.finalPricePaise ?? tx.quotedPricePaise : listedTotal;
  const payToken = lot.receiptTokens[0]?.token;
  const canDelete = lot.status === "DRAFT" || lot.status === "READY";
  const isPaid = tx?.paymentStatus === "PAID";
  const total = tx ? dealTotal : listedTotal;
  // Buyer's vehicle for the pickup; its OTP is shown only here, to the collector
  const dispatch = tx ? await getLotDispatch(lot.id) : null;
  const vehicleComing = dispatch?.status === "ON_THE_WAY";
  const spokenOtp = vehicleComing ? dispatch.otp.split("").join(" ") : "";
  // Per-material rates: agreed ones once a buyer is chosen, otherwise today's price
  const itemRate = (categoryId: number, listed: number) =>
    tx?.itemRates.find((r) => r.categoryId === categoryId)?.ratePerKgPaise ?? (tx && items.length === 1 ? dealRate : listed);

  // What the speaker reads depends on the step the collector is on.
  const spokenItems = (lang: "en" | "hi" | "mr") =>
    items
      .map((i) => `${(i.weightGrams / 1000).toFixed(1)} ${lang === "en" ? "kilo" : "किलो"} ${lang === "en" ? i.category.nameEn : lang === "mr" ? i.category.nameMr || i.category.nameHi : i.category.nameHi}`)
      .join(", ");
  const base = {
    en: `${spokenItems("en")}. Total ${spokenRupees(total)} rupees.`,
    hi: `${spokenItems("hi")}। कुल ${spokenRupees(total)} रुपये।`,
    mr: `${spokenItems("mr")}. एकूण ${spokenRupees(total)} रुपये.`,
  };
  const step = vehicleComing
    ? {
        en: `Vehicle ${dispatch.vehicle.number} is coming. Your pickup code is ${spokenOtp}. Tell it to the driver.`,
        hi: `गाड़ी ${dispatch.vehicle.number} आ रही है। आपका पिकअप कोड है ${spokenOtp}। यह कोड ड्राइवर को बताएं।`,
        mr: `गाडी ${dispatch.vehicle.number} येत आहे. तुमचा पिकअप कोड आहे ${spokenOtp}. हा कोड ड्रायव्हरला सांगा.`,
      }
    : isPaid
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
      {(lot.status === "READY" || lot.status === "MATCHED" || (isPaid && dispatch?.status !== "PICKED_UP")) && <AutoRefresh />}

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
        <ul className="lot-items" style={{ textAlign: "left", marginTop: "0.5rem" }}>
          {items.map((i) => {
            const r = itemRate(i.categoryId, i.listedRatePerKgPaise);
            return (
              <li key={i.categoryId}>
                <span>
                  <strong>{(i.weightGrams / 1000).toFixed(1)} kg</strong> <T hi={i.category.nameHi} en={i.category.nameEn} mr={i.category.nameMr} />{" "}
                  <span style={{ color: "var(--slate-500)" }}>× {rupees(r)}</span>
                </span>
                <span>{rupees(calculateLotValuePaise(r, i.weightGrams))}</span>
              </li>
            );
          })}
        </ul>
        <div className="c-total">= {rupees(total)}</div>
        {lot.askingPricePaise != null && !tx && (
          <div className="c-asking-show">
            <T hi="आपका भाव" en="Your price" mr="तुमचा भाव" />: <strong>{rupees(lot.askingPricePaise)}</strong>
          </div>
        )}
        {items.length > 1 && <div className="c-hint" style={{ justifyContent: "center" }}>{kg} kg</div>}
        {photos.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <LotPhotoStrip photos={photos} />
          </div>
        )}

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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "1.25rem 0.5rem", textAlign: "center" }}>
                  <SearchX size={36} aria-hidden="true" style={{ color: "var(--slate-400)" }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>
                      <T hi="इस इलाके में अभी कोई रीसाइक्लर नहीं है" en="No authorized recycler nearby" mr="या भागात सध्या कोणताही खरेदीदार नाही" />
                    </div>
                    <div style={{ fontSize: "0.825rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                      <T
                        hi="आपके 5 किमी के दायरे में कोई अधिकृत रीसाइक्लर नहीं मिला। जब कोई उपलब्ध होगा हम आपको सूचित करेंगे।"
                        en="No authorized recycler currently covers your 5 km radius. We can notify you as soon as one covers your area."
                        mr="तुमच्या 5 किमी परिसरात अधिकृत खरेदीदार उपलब्ध नाही. उपलब्ध होताच आम्ही कळवू."
                      />
                    </div>
                  </div>

                  {/* GEO G6.3: Notify me button (creates CoverageRequest) */}
                  <form action={submitCoverageRequestAction}>
                    <input type="hidden" name="lotId" value={lot.id} />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ padding: "0.4rem 0.85rem" }}>
                      <BellRing size={16} />
                      <T hi="उपलब्ध होने पर मुझे बताएं" en="Notify me when available" mr="उपलब्ध झाल्यावर मला कळवा" />
                    </button>
                  </form>

                  {/* GEO G6.4: Debug toggle showing reason excluded */}
                  <details style={{ width: "100%", fontSize: "0.75rem", color: "var(--slate-500)", textAlign: "left", marginTop: "0.5rem", cursor: "pointer" }}>
                    <summary style={{ fontWeight: 600 }}>
                      🔍 <T hi="कारण देखें (Debug: Reasons excluded)" en="View excluded reasons (Debug)" mr="वगळण्याचे कारण पहा" />
                    </summary>
                    <div style={{ padding: "0.5rem", backgroundColor: "var(--slate-100)", borderRadius: "6px", marginTop: "0.35rem" }}>
                      &bull; Distance &gt; 5 km from verified facility<br />
                      &bull; Facility authorization verification required<br />
                      &bull; Material category active rate check
                    </div>
                  </details>
                </div>
              ) : (
                <>
                  <LoaderCircle size={32} className="c-spin" aria-hidden="true" />
                  <T hi="खरीदार का इंतज़ार…" en="Waiting for buyers…" mr="खरेदीदाराची वाट…" />
                </>
              )}
            </div>
          ) : (
            interested.map((offer) => {
              const offerTotal = offerTotalPaise(offer, lot.approxWeightGrams);
              return (
                <div key={offer.id} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>{offer.recycler.name}</div>
                      <div className="c-hint">
                        <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <span>
                          {offer.distanceKm.toFixed(1)} km &middot; ~{calculateTravelMinutes(offer.distanceKm, "bike")} min bike &middot; {offer.recycler.address}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--primary-800)" }}>
                        {rupees(offerTotal)}
                      </div>
                      {items.length === 1 && (
                        <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>{rupees(offer.ratePerKgPaise ?? listedRate)}/kg</div>
                      )}
                      {lot.askingPricePaise != null && (
                        <div className={`c-offer-vs ${offerTotal >= lot.askingPricePaise ? "is-ok" : "is-low"}`}>
                          {offerTotal >= lot.askingPricePaise ? (
                            <T hi="आपका भाव मिला" en="Meets your price" mr="तुमचा भाव मिळाला" />
                          ) : (
                            <T
                              hi={`आपके भाव से ${rupees(lot.askingPricePaise - offerTotal)} कम`}
                              en={`${rupees(lot.askingPricePaise - offerTotal)} below your price`}
                              mr={`तुमच्या भावापेक्षा ${rupees(lot.askingPricePaise - offerTotal)} कमी`}
                            />
                          )}
                        </div>
                      )}
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

                  {/* GEO G8.1: Doorstep Pickup Request Option */}
                  {offer.recycler.pickupAvailable && (
                    <details style={{ marginTop: "0.25rem", borderTop: "1px dashed var(--slate-200)", paddingTop: "0.5rem", fontSize: "0.8rem", color: "var(--primary-800)" }}>
                      <summary style={{ fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <Truck size={14} />
                        <T hi="घर से पिकअप का अनुरोध करें" en="Request Doorstep Pickup" mr="घरोघरी पिकअपची विनंती करा" />
                      </summary>
                      <form action={createPickupRequestAction} style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <input type="hidden" name="lotId" value={lot.id} />
                        <input type="hidden" name="recyclerId" value={offer.recycler.id} />
                        <input type="hidden" name="latitude" value={lot.collectLat || ""} />
                        <input type="hidden" name="longitude" value={lot.collectLng || ""} />
                        
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate-600)" }}>
                          समय चुनें / Choose Slot:
                        </label>
                        <select name="slotTime" className="form-control" style={{ padding: "0.4rem", fontSize: "0.8rem" }}>
                          <option value="morning">सुबह (Morning 10:00 AM)</option>
                          <option value="afternoon">दोपहर (Afternoon 02:00 PM)</option>
                          <option value="evening">शाम (Evening 05:00 PM)</option>
                        </select>

                        <input
                          type="text"
                          name="landmark"
                          placeholder="लैंडमार्क / Landmark (e.g. Near Ration Shop)"
                          className="form-control"
                          style={{ padding: "0.4rem", fontSize: "0.8rem" }}
                        />

                        <button type="submit" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start", marginTop: "0.2rem" }}>
                          <Truck size={14} />
                          <T hi="पिकअप अनुरोध भेजें" en="Submit Pickup Request" mr="पिकअप विनंती पाठवा" />
                        </button>
                      </form>
                    </details>
                  )}
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
            {inr(dealTotal)} <T hi="मिले" en="received" mr="मिळाले" />
          </div>
          {payToken && (
            <Link href={`/invoice/${payToken}`} className="btn btn-secondary btn-block btn-lg" style={{ marginTop: "1rem" }}>
              <ReceiptText size={20} aria-hidden="true" />
              <T hi="बिल देखें" en="View bill" mr="बिल पहा" />
            </Link>
          )}
        </div>
      )}

      {/* Pickup: the buyer's vehicle and the code the collector gives the driver */}
      {tx && (dispatch || isPaid) && (
        <div className="card" style={{ padding: "1.25rem", textAlign: "center", border: vehicleComing ? "2px solid #0284c7" : undefined }}>
          {!dispatch ? (
            <div className="c-hint" style={{ justifyContent: "center" }}>
              <Truck size={18} aria-hidden="true" />
              <T hi="खरीदार की गाड़ी का इंतज़ार" en="Waiting for the buyer's vehicle" mr="खरेदीदाराच्या गाडीची वाट" />
            </div>
          ) : vehicleComing ? (
            <>
              <div className="c-hint" style={{ justifyContent: "center", fontWeight: 700 }}>
                <Truck size={18} aria-hidden="true" />
                <T hi="गाड़ी आ रही है" en="Vehicle on the way" mr="गाडी येत आहे" />
              </div>
              <div style={{ fontWeight: 800, color: "var(--slate-900)", marginTop: "0.25rem" }}>
                {dispatch.vehicle.number} · {dispatch.vehicle.name}
              </div>
              <div className="c-section-title" style={{ marginTop: "0.75rem" }}>
                <T hi="पिकअप कोड" en="Pickup code" mr="पिकअप कोड" />
              </div>
              <div className="c-otp">{dispatch.otp}</div>
              <div className="c-hint" style={{ justifyContent: "center" }}>
                <Lock size={14} aria-hidden="true" />
                <T
                  hi="माल देते समय यह कोड सिर्फ ड्राइवर को बताएं"
                  en="Tell this code only to the driver when you hand over the scrap"
                  mr="माल देताना हा कोड फक्त ड्रायव्हरला सांगा"
                />
              </div>
            </>
          ) : (
            <>
              <CircleCheck size={40} aria-hidden="true" style={{ color: "var(--primary)" }} />
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--primary-800)" }}>
                <T hi="माल उठा लिया गया" en="Picked up" mr="माल उचलला" />
              </div>
              <div className="c-hint" style={{ justifyContent: "center" }}>
                {dispatch.vehicle.number} · {dispatch.vehicle.name}
                {dispatch.pickedUpAt &&
                  ` · ${dispatch.pickedUpAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}
              </div>
            </>
          )}
        </div>
      )}

      {/* Buyer details & directions once chosen */}
      {recycler && (
        <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h2 className="c-section-title">
            <T hi="खरीदार केंद्र व रास्ता" en="Buyer Facility & Directions" mr="खरेदीदार केंद्र व रस्ता" />
          </h2>
          <RecyclerDirectionsCard
            recycler={{
              id: recycler.id,
              name: recycler.name,
              address: [recycler.address, recycler.area, recycler.district].filter(Boolean).join(", "),
              landmark: recycler.landmark,
              latitude: recycler.latitude,
              longitude: recycler.longitude,
              contactPhone: recycler.contactPhone,
              whatsappPhone: recycler.whatsappPhone,
            }}
            distanceKm={
              lot.collectLat != null && lot.collectLng != null
                ? calculateHaversineDistanceKm(lot.collectLat, lot.collectLng, recycler.latitude, recycler.longitude)
                : 2.0
            }
            lotId={lot.id}
            lotRef={lot.lotRef}
            userLat={lot.collectLat}
            userLng={lot.collectLng}
            showArrivalButton={lot.status === "MATCHED"}
          />
        </section>
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
