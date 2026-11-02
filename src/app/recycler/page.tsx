import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Clock, Handshake, Inbox, MapPin, Package, Phone } from "lucide-react";
import { respondToLotOfferAction } from "./actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BROADCAST_RADIUS_KM } from "@/lib/domain/lotBroadcast";
import { offerTotalPaise } from "@/lib/services/lotFlowService";
import { LOT_ITEMS_INCLUDE, lotItemsOf, lotItemsTxt, lotPhotoUrls } from "@/lib/services/lotItemsView";
import { LotPhotoStrip } from "@/components/LotPhotoStrip";
import { rupeesIN } from "@/lib/format";
import { askingItemRates } from "@/lib/domain/lotItems";
import { T, type Txt } from "@/app/collector/ui";

/** "Lot LOT-… · posted 5 min ago" in each app language. */
function postedTxt(lotRef: string, date: Date): Txt {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  const hours = Math.round(minutes / 60);
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const ago =
    minutes < 1
      ? { en: "just now", hi: "अभी", mr: "आत्ताच" }
      : minutes < 60
      ? { en: `${minutes} min ago`, hi: `${minutes} मिनट पहले`, mr: `${minutes} मिनिटांपूर्वी` }
      : hours < 24
      ? { en: `${hours} h ago`, hi: `${hours} घंटे पहले`, mr: `${hours} तासांपूर्वी` }
      : { en: day, hi: day, mr: day };
  return {
    en: `Lot ${lotRef} · posted ${ago.en}`,
    hi: `लॉट ${lotRef} · ${ago.hi} डाला`,
    mr: `लॉट ${lotRef} · ${ago.mr} टाकला`,
  };
}

/** Paise/kg as a short rupee value for an input, e.g. 58000 -> "580", 1333 -> "13.33". */
const rateRupees = (paise: number) => String(Number((paise / 100).toFixed(2)));

const ORDER_HISTORY = <T hi="ऑर्डर इतिहास" en="Order history" mr="ऑर्डर इतिहास" />;

function OfferedLine({ paise }: { paise: number }) {
  const offered = `₹${(paise / 100).toLocaleString("en-IN")}`;
  return (
    <T
      hi={`आपका भाव ${offered} · कलेक्टर के जवाब का इंतज़ार`}
      en={`You offered ${offered} · waiting for collector`}
      mr={`तुमचा भाव ${offered} · कलेक्टरच्या उत्तराची वाट`}
    />
  );
}

export default async function RecyclerDashboardPage(props: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const searchParams = await props.searchParams;
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return (
      <div className="card">
        <h2 className="r-section-title">
          <T hi="कोई फ़ैसिलिटी नहीं जुड़ी" en="No facility linked" mr="फॅसिलिटी जोडलेली नाही" />
        </h2>
        <p className="r-muted">
          <T
            hi="आपका खाता किसी रीसाइक्लर से नहीं जुड़ा है। कृपया एडमिन से संपर्क करें।"
            en="Your account is not linked to a recycler. Please contact the admin."
            mr="तुमचे खाते कोणत्याही रीसायकलरशी जोडलेले नाही. कृपया अॅडमिनशी संपर्क करा."
          />
        </p>
      </div>
    );
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
  });

  if (!facility) {
    return (
      <div className="card">
        <T hi="फ़ैसिलिटी नहीं मिली।" en="Facility not found." mr="फॅसिलिटी सापडली नाही." />
      </div>
    );
  }

  // Open lot broadcasts within 5 km (collector identity is not loaded)
  const offerRows = await prisma.lotOffer.findMany({
    where: {
      recyclerId,
      status: { in: ["NOTIFIED", "INTERESTED"] },
      lot: { is: { status: "READY" } },
    },
    include: {
      lot: {
        select: {
          lotRef: true,
          categoryId: true,
          approxWeightGrams: true,
          listedRatePerKgPaise: true,
          estimatedValuePaise: true,
          askingPricePaise: true,
          category: true,
          images: { select: { id: true, storageKey: true } },
          ...LOT_ITEMS_INCLUDE,
          collector: { select: { operatingArea: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const openOffers = await Promise.all(
    offerRows.map(async (offer) => ({ offer, items: lotItemsOf(offer.lot), photos: await lotPhotoUrls(offer.lot.images) }))
  );

  // Open deals: still to pay, or paid but not picked up yet (finished ones are in History)
  const deals = await prisma.lot.findMany({
    where: {
      chosenRecyclerId: recyclerId,
      offers: { some: { recyclerId, status: "SELECTED" } },
      OR: [{ status: "MATCHED" }, { status: "COMPLETED", vehicleDispatches: { none: { status: "PICKED_UP" } } }],
    },
    include: {
      category: true,
      ...LOT_ITEMS_INCLUDE,
      collector: { include: { user: { select: { phone: true } } } },
      transaction: true,
      vehicleDispatches: { where: { status: "ON_THE_WAY" }, select: { id: true }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const unpaidDealCount = deals.filter((d) => d.transaction?.paymentStatus !== "PAID").length;
  const isFacilityBlocked = facility.authorizationStatus === "EXPIRED" || facility.authorizationStatus === "SUSPENDED";

  return (
    <div className="r-stack">
      <AutoRefresh intervalMs={20000} />
      {isFacilityBlocked && (
        <div
          className="alert alert-danger"
          style={{
            backgroundColor: "#fef2f2",
            border: "2px solid #ef4444",
            color: "#991b1b",
            padding: "1rem 1.25rem",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 600,
          }}
        >
          <CircleAlert size={24} style={{ color: "#dc2626", flexShrink: 0 }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700 }}>
              <T hi="फ़ैसिलिटी की मंज़ूरी:" en="Facility Authorization is" mr="फॅसिलिटीची मंजुरी:" /> {facility.authorizationStatus}
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 500, marginTop: "0.2rem" }}>
              <T
                hi="आपकी रीसाइक्लर मंज़ूरी रुकी हुई है। नए लॉट लेना बंद है। मंज़ूरी फिर से पाने के लिए एडमिन से संपर्क करें।"
                en={`Your recycler authorization has been ${facility.authorizationStatus.toLowerCase()}. Accepting new lots is blocked. Please contact the platform administration to renew your accreditation.`}
                mr="तुमची रीसायकलर मंजुरी थांबवली आहे. नवीन लॉट घेणे बंद आहे. मंजुरी पुन्हा मिळवण्यासाठी अॅडमिनशी संपर्क करा."
              />
            </div>
          </div>
        </div>
      )}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 className="r-page-title">{facility.name}</h1>
        {facility.authorizationStatus !== "VERIFIED" && (
          <span className={`badge ${facility.authorizationStatus === "PENDING" ? "badge-warning" : "badge-danger"}`}>
            {facility.authorizationStatus === "PENDING" ? (
              <T hi="एडमिन की मंज़ूरी का इंतज़ार" en="Waiting for admin approval" mr="अॅडमिनच्या मंजुरीची वाट" />
            ) : (
              facility.authorizationStatus
            )}
          </span>
        )}
      </div>

      <div className="r-grid-2-lg">
        {/* Nearby lot requests (5 km broadcast) - collector identity hidden */}
        <section className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <div className="r-section-head">
            <div>
              <h2 className="r-section-title">
                <Package size={20} aria-hidden="true" /> <T hi="पास के लॉट" en="Nearby Lot Requests" mr="जवळचे लॉट" />
              </h2>
              <div className="r-muted">
                <T hi={`${BROADCAST_RADIUS_KM} km के अंदर`} en={`Within ${BROADCAST_RADIUS_KM} km`} mr={`${BROADCAST_RADIUS_KM} km च्या आत`} />
              </div>
            </div>
            <span className="badge badge-neutral">{openOffers.length}</span>
          </div>

          {openOffers.length === 0 ? (
            <div className="r-empty">
              <Inbox size={28} aria-hidden="true" />
              <div>
                <T hi="अभी आपके पास कोई लॉट नहीं।" en="No requests near you right now." mr="सध्या तुमच्या जवळ लॉट नाही." />
              </div>
            </div>
          ) : (
            <div className="r-list">
              {openOffers.map(({ offer, items, photos }) => {
                const lot = offer.lot;
                // Offer boxes start at the collector's asking price (or today's rate when none)
                const startRates = askingItemRates(items, lot.askingPricePaise ?? null);
                return (
                  <div key={offer.id} className="r-item">
                    <div className="r-item-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="r-item-title">
                          <T {...lotItemsTxt(items)} />
                        </div>
                        <div className="r-muted">
                          <T {...postedTxt(lot.lotRef, offer.createdAt)} />
                        </div>
                      </div>
                      {lot.askingPricePaise ? (
                        <div className="r-asking">
                          <div className="r-asking-label">
                            <T hi="कलेक्टर का भाव" en="Collector asks" mr="कलेक्टरचा भाव" />
                          </div>
                          <div className="r-amount">₹{rupeesIN(lot.askingPricePaise)}</div>
                          <div className="r-asking-sub">
                            <T
                              hi={`आज के भाव से ₹${rupeesIN(lot.estimatedValuePaise ?? 0)}`}
                              en={`Today's rate ₹${rupeesIN(lot.estimatedValuePaise ?? 0)}`}
                              mr={`आजच्या भावाने ₹${rupeesIN(lot.estimatedValuePaise ?? 0)}`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="r-amount">₹{rupeesIN(lot.estimatedValuePaise ?? 0)}</div>
                      )}
                    </div>

                    <LotPhotoStrip photos={photos} />

                    <div className="r-meta">
                      <span>
                        <MapPin size={15} aria-hidden="true" />{" "}
                        <T hi={`${offer.distanceKm.toFixed(1)} km दूर`} en={`${offer.distanceKm.toFixed(1)} km away`} mr={`${offer.distanceKm.toFixed(1)} km दूर`} />
                      </span>
                      {lot.collector.operatingArea && <span>{lot.collector.operatingArea}</span>}
                    </div>

                    {offer.status === "INTERESTED" ? (
                      <span className="badge badge-info r-inline" style={{ alignSelf: "flex-start" }}>
                        <Clock size={14} aria-hidden="true" />
                        <OfferedLine paise={offerTotalPaise(offer, lot.approxWeightGrams)} />
                      </span>
                    ) : (
                      <>
                        <form action={respondToLotOfferAction} className="r-offer-form">
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="response" value="INTERESTED" />
                          <div className="r-muted">
                            <T hi="आपका भाव (प्रति kg)" en="Your price per kg" mr="तुमचा भाव (प्रति kg)" />
                          </div>
                          {items.map((item) => (
                            <label key={item.categoryId} className="r-offer-row">
                              <span className="r-offer-name">
                                <T hi={item.category.nameHi} en={item.category.nameEn} mr={item.category.nameMr} />{" "}
                                <span className="r-muted">{(item.weightGrams / 1000).toFixed(1)} kg</span>
                              </span>
                              <span className="r-rate-form">
                                <span aria-hidden="true">₹</span>
                                <input
                                  type="number"
                                  name={`rate_${item.categoryId}`}
                                  min="1"
                                  step="0.01"
                                  defaultValue={rateRupees(startRates.find((r) => r.categoryId === item.categoryId)?.ratePerKgPaise ?? item.listedRatePerKgPaise)}
                                  required
                                  aria-label={`Your buying rate for ${item.category.nameEn} in rupees per kg`}
                                  className="form-control r-rate-input"
                                />
                                <span aria-hidden="true">/kg</span>
                              </span>
                            </label>
                          ))}
                          <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={isFacilityBlocked}
                            title={isFacilityBlocked ? "Accepting lots is blocked due to authorization status" : undefined}
                          >
                            {isFacilityBlocked ? (
                              <T hi="बंद" en="Blocked" mr="बंद" />
                            ) : (
                              <T hi="खरीदने को तैयार" en="Ready to buy" mr="खरेदीस तयार" />
                            )}
                          </button>
                        </form>
                        <form action={respondToLotOfferAction}>
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="response" value="DECLINED" />
                          <button type="submit" className="btn btn-sm btn-secondary btn-block">
                            <T hi="दिलचस्पी नहीं" en="Not interested" mr="रस नाही" />
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Deals: lots whose collector selected this recycler */}
        <section className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <div className="r-section-head">
            <div>
              <h2 className="r-section-title">
                <Handshake size={20} aria-hidden="true" /> <T hi="मेरी डील" en="My Deals" mr="माझ्या डील" />
              </h2>
              <div className="r-muted">
                {unpaidDealCount > 0 ? (
                  <T hi={`${unpaidDealCount} का पेमेंट बाकी`} en={`${unpaidDealCount} to pay`} mr={`${unpaidDealCount} पेमेंट बाकी`} />
                ) : deals.length > 0 ? (
                  <T hi="पिकअप बाकी" en="Pickups pending" mr="पिकअप बाकी" />
                ) : (
                  <T hi="सब पूरा" en="All done" mr="सर्व पूर्ण" />
                )}{" "}
                · <Link href="/recycler/history">{ORDER_HISTORY}</Link>
              </div>
            </div>
            <span className="badge badge-neutral">{deals.length}</span>
          </div>

          {deals.length === 0 ? (
            <div className="r-empty">
              <Handshake size={28} aria-hidden="true" />
              <div>
                <T hi="कोई डील बाकी नहीं।" en="No deals to pay." mr="कोणतीही डील बाकी नाही." />
              </div>
              <Link href="/recycler/history" className="btn btn-sm btn-secondary">
                {ORDER_HISTORY}
              </Link>
            </div>
          ) : (
            <div className="r-list">
              {deals.map((lot) => {
                const tx = lot.transaction;
                const amount = tx ? tx.finalPricePaise ?? tx.quotedPricePaise : 0;
                const isPaid = tx?.paymentStatus === "PAID";
                const vehicleOnTheWay = lot.vehicleDispatches.length > 0;
                const badge: { cls: string; label: Txt; action: Txt } = !isPaid
                  ? {
                      cls: "badge-warning",
                      label: { hi: "पेमेंट बाकी", en: "To pay", mr: "पेमेंट बाकी" },
                      action: { hi: "खोलें और पेमेंट करें", en: "Open & pay", mr: "उघडा आणि पेमेंट करा" },
                    }
                  : vehicleOnTheWay
                  ? {
                      cls: "badge-info",
                      label: { hi: "गाड़ी रास्ते में", en: "Vehicle on the way", mr: "गाडी वाटेत" },
                      action: { hi: "कोड डालें", en: "Enter code", mr: "कोड टाका" },
                    }
                  : {
                      cls: "badge-success",
                      label: { hi: "पेमेंट हो गया · गाड़ी भेजें", en: "Paid · send vehicle", mr: "पेमेंट झाले · गाडी पाठवा" },
                      action: { hi: "गाड़ी भेजें", en: "Send vehicle", mr: "गाडी पाठवा" },
                    };
                return (
                  <div key={lot.id} className="r-item">
                    <div className="r-item-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="r-item-title">
                          <T {...lotItemsTxt(lotItemsOf(lot))} />
                        </div>
                        <div className="r-muted">
                          <T hi="लॉट" en="Lot" mr="लॉट" /> {lot.lotRef}
                        </div>
                      </div>
                      <div className="r-amount">₹{rupeesIN(amount)}</div>
                    </div>

                    <div className="r-meta">
                      <span>{lot.collector.name || `Collector ${lot.collector.shortCode}`}</span>
                      <a href={`tel:${lot.collector.user.phone}`}>
                        <Phone size={15} aria-hidden="true" /> {lot.collector.user.phone}
                      </a>
                    </div>

                    <div className="r-actions" style={{ justifyContent: "space-between" }}>
                      <span className={`badge ${badge.cls}`}>
                        <T {...badge.label} />
                      </span>
                      <Link href={`/recycler/deals/${lot.id}`} className="btn btn-sm btn-primary r-inline">
                        <T {...badge.action} /> <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
