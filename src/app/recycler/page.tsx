import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Clock, Handshake, Inbox, MapPin, Package, Phone } from "lucide-react";
import { respondToLotOfferAction } from "./actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { BROADCAST_RADIUS_KM } from "@/lib/domain/lotBroadcast";
import { offerTotalPaise } from "@/lib/services/lotFlowService";
import { LOT_ITEMS_INCLUDE, lotItemsLabel, lotItemsOf, lotPhotoUrls } from "@/lib/services/lotItemsView";
import { LotPhotoStrip } from "@/components/LotPhotoStrip";

function timeAgo(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + " h ago";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function RecyclerDashboardPage(props: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const searchParams = await props.searchParams;
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return (
      <div className="card">
        <h2 className="r-section-title">No facility linked</h2>
        <p className="r-muted">Your account is not linked to a recycler. Please contact the admin.</p>
      </div>
    );
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
  });

  if (!facility) {
    return <div className="card">Facility not found.</div>;
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

  // Deals still to pay: lots whose collector selected this facility (paid ones are in History)
  const deals = await prisma.lot.findMany({
    where: {
      chosenRecyclerId: recyclerId,
      status: "MATCHED",
      offers: { some: { recyclerId, status: "SELECTED" } },
    },
    include: {
      category: true,
      ...LOT_ITEMS_INCLUDE,
      collector: { include: { user: { select: { phone: true } } } },
      transaction: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const unpaidDealCount = deals.filter((d) => d.transaction?.paymentStatus !== "PAID").length;

  return (
    <div className="r-stack">
      <AutoRefresh intervalMs={20000} />
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
            {facility.authorizationStatus === "PENDING" ? "Waiting for admin approval" : facility.authorizationStatus}
          </span>
        )}
      </div>

      <div className="r-grid-2-lg">
        {/* Nearby lot requests (5 km broadcast) - collector identity hidden */}
        <section className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <div className="r-section-head">
            <div>
              <h2 className="r-section-title">
                <Package size={20} aria-hidden="true" /> Nearby Lot Requests
              </h2>
              <div className="r-muted">Within {BROADCAST_RADIUS_KM} km</div>
            </div>
            <span className="badge badge-neutral">{openOffers.length}</span>
          </div>

          {openOffers.length === 0 ? (
            <div className="r-empty">
              <Inbox size={28} aria-hidden="true" />
              <div>No requests near you right now.</div>
            </div>
          ) : (
            <div className="r-list">
              {openOffers.map(({ offer, items, photos }) => {
                const lot = offer.lot;
                return (
                  <div key={offer.id} className="r-item">
                    <div className="r-item-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="r-item-title">{lotItemsLabel(items)}</div>
                        <div className="r-muted">
                          Lot {lot.lotRef} &middot; posted {timeAgo(offer.createdAt)}
                        </div>
                      </div>
                      <div className="r-amount">₹{((lot.estimatedValuePaise ?? 0) / 100).toLocaleString("en-IN")}</div>
                    </div>

                    <LotPhotoStrip photos={photos} />

                    <div className="r-meta">
                      <span>
                        <MapPin size={15} aria-hidden="true" /> {offer.distanceKm.toFixed(1)} km away
                      </span>
                      {lot.collector.operatingArea && <span>{lot.collector.operatingArea}</span>}
                    </div>

                    {offer.status === "INTERESTED" ? (
                      <span className="badge badge-info r-inline" style={{ alignSelf: "flex-start" }}>
                        <Clock size={14} aria-hidden="true" />
                        You offered ₹{(offerTotalPaise(offer, lot.approxWeightGrams) / 100).toLocaleString("en-IN")} &middot; waiting for collector
                      </span>
                    ) : (
                      <>
                        <form action={respondToLotOfferAction} className="r-offer-form">
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="response" value="INTERESTED" />
                          <div className="r-muted">Your price per kg</div>
                          {items.map((item) => (
                            <label key={item.categoryId} className="r-offer-row">
                              <span className="r-offer-name">
                                {item.category.nameEn} <span className="r-muted">{(item.weightGrams / 1000).toFixed(1)} kg</span>
                              </span>
                              <span className="r-rate-form">
                                <span aria-hidden="true">₹</span>
                                <input
                                  type="number"
                                  name={`rate_${item.categoryId}`}
                                  min="1"
                                  step="0.5"
                                  defaultValue={(item.listedRatePerKgPaise / 100).toFixed(0)}
                                  required
                                  aria-label={`Your buying rate for ${item.category.nameEn} in rupees per kg`}
                                  className="form-control r-rate-input"
                                />
                                <span aria-hidden="true">/kg</span>
                              </span>
                            </label>
                          ))}
                          <button type="submit" className="btn btn-primary btn-block">
                            Ready to buy
                          </button>
                        </form>
                        <form action={respondToLotOfferAction}>
                          <input type="hidden" name="offerId" value={offer.id} />
                          <input type="hidden" name="response" value="DECLINED" />
                          <button type="submit" className="btn btn-sm btn-secondary btn-block">
                            Not interested
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
                <Handshake size={20} aria-hidden="true" /> My Deals
              </h2>
              <div className="r-muted">{unpaidDealCount > 0 ? `${unpaidDealCount} to pay` : "All paid"} · <Link href="/recycler/history">Order history</Link></div>
            </div>
            <span className="badge badge-neutral">{deals.length}</span>
          </div>

          {deals.length === 0 ? (
            <div className="r-empty">
              <Handshake size={28} aria-hidden="true" />
              <div>No deals to pay.</div>
              <Link href="/recycler/history" className="btn btn-sm btn-secondary">Order history</Link>
            </div>
          ) : (
            <div className="r-list">
              {deals.map((lot) => {
                const tx = lot.transaction;
                const amount = tx ? tx.finalPricePaise ?? tx.quotedPricePaise : 0;
                const isPaid = tx?.paymentStatus === "PAID";
                return (
                  <div key={lot.id} className="r-item">
                    <div className="r-item-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="r-item-title">
                          {lotItemsLabel(lotItemsOf(lot))}
                        </div>
                        <div className="r-muted">Lot {lot.lotRef}</div>
                      </div>
                      <div className="r-amount">₹{(amount / 100).toLocaleString("en-IN")}</div>
                    </div>

                    <div className="r-meta">
                      <span>{lot.collector.name || `Collector ${lot.collector.shortCode}`}</span>
                      <a href={`tel:${lot.collector.user.phone}`}>
                        <Phone size={15} aria-hidden="true" /> {lot.collector.user.phone}
                      </a>
                    </div>

                    <div className="r-actions" style={{ justifyContent: "space-between" }}>
                      <span className={`badge ${isPaid ? "badge-success" : "badge-warning"}`}>
                        {isPaid ? "Paid" : "To pay"}
                      </span>
                      <Link
                        href={`/recycler/deals/${lot.id}`}
                        className={`btn btn-sm ${isPaid ? "btn-secondary" : "btn-primary"} r-inline`}
                      >
                        {isPaid ? "View" : "Open & pay"} <ArrowRight size={15} aria-hidden="true" />
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
