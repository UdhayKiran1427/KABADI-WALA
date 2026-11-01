import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  acceptLotFormAction,
  updatePickupStatusFormAction,
  dispatchPickupFormAction,
  recyclerAcceptBargainAction,
} from "./actions";

export default async function RecyclerDashboardPage() {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return (
      <div className="card">
        <h2>No Facility Assigned</h2>
        <p className="text-muted">Your account is not linked to an active recycler facility.</p>
      </div>
    );
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // 1. Incoming lots matched to this facility
  const incomingLots = await prisma.lot.findMany({
    where: {
      chosenRecyclerId: recyclerId,
      status: { in: ["READY", "MATCHED"] },
    },
    include: {
      category: true,
      collector: true,
      transaction: true,
    },
    orderBy: { collectedAt: "desc" },
  });

  // 2. This week volume in kg (completed lots)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyHandovers = await prisma.handover.findMany({
    where: {
      confirmedById: dbUser.id,
      status: "CONFIRMED",
      recyclerConfirmedAt: { gte: oneWeekAgo },
    },
    select: { confirmedWeightGrams: true },
  });
  const totalWeeklyGrams = weeklyHandovers.reduce((sum, h) => sum + (h.confirmedWeightGrams || 0), 0);
  const totalWeeklyKg = (totalWeeklyGrams / 1000).toFixed(0);

  // 3. Unpaid amount in paise
  const unpaidTransactions = await prisma.transaction.findMany({
    where: {
      recyclerId,
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
      finalPricePaise: { not: null },
    },
    select: { finalPricePaise: true },
  });
  const totalUnpaidPaise = unpaidTransactions.reduce((sum, t) => sum + (t.finalPricePaise || 0), 0);

  // 4. Pickup requests
  const pickupRequests = await prisma.pickupRequest.findMany({
    where: { recyclerId },
    include: {
      lot: { include: { category: true } },
      collector: true,
    },
    orderBy: { slot: "asc" },
  });

  // 5. Facility current rates for sidebar
  const currentRates = await prisma.recyclerRate.findMany({
    where: { recyclerId, isCurrent: true },
    include: { category: true },
    take: 6,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* R1 Top Bar Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--slate-200)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              {facility.name}
            </h1>
          </div>
          <p style={{ color: "var(--slate-500)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            📍 {facility.address} &bull; Radius: {facility.serviceRadiusKm} km &bull; Contact: {facility.contactPhone}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {facility.authorizationStatus === "VERIFIED" ? (
            <span className="badge badge-success" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              ✓ CPCB / SPCB Verified ({facility.authorizationNo})
            </span>
          ) : facility.authorizationStatus === "EXPIRED" ? (
            <span className="badge badge-danger">⚠️ Authorization Expired</span>
          ) : (
            <span className="badge badge-warning">⏳ Authorization Pending Review</span>
          )}

          <Link href="/recycler/verify" className="btn btn-sm btn-primary">
            ⚡ Quick Handover (R2) &rarr;
          </Link>
        </div>
      </div>

      {/* R1 4-Column KPI Stat Boxes (Full Screen Width) */}
      <div className="grid-4">
        <div className="stat-box">
          <div className="stat-label">Incoming Lots Matched</div>
          <div className="stat-value">{incomingLots.length}</div>
          <div className="stat-meta">Waiting at facility gate for review</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Processed This Week</div>
          <div className="stat-value" style={{ color: "var(--primary-800)" }}>{totalWeeklyKg} kg</div>
          <div className="stat-meta">Verified scale handovers (7 days)</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Unpaid Payouts Balance</div>
          <div className="stat-value" style={{ color: "#b45309" }}>₹{(totalUnpaidPaise / 100).toLocaleString("en-IN")}</div>
          <div className="stat-meta">Pending Cash / UPI settlements</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Doorstep Pickup Fleet</div>
          <div className="stat-value" style={{ color: "#0369a1" }}>{pickupRequests.length}</div>
          <div className="stat-meta">Active collection requests scheduled</div>
        </div>
      </div>

      {/* Responsive 2-Column Dashboard Grid: Uses Wide Screens Efficiently! */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Main Queues & Tables */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
          {/* R1 Incoming Lots Queue */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)" }}>
                  Incoming Lots Matched
                </h2>
                <div style={{ fontSize: "0.775rem", color: "var(--slate-500)" }}>
                  Lots assigned to your facility awaiting weighing &amp; verification
                </div>
              </div>
              <span className="badge badge-neutral">{incomingLots.length} Total</span>
            </div>

            {incomingLots.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--slate-500)", backgroundColor: "var(--slate-50)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>📦</div>
                <div>No incoming lots waiting for review.</div>
                <div style={{ fontSize: "0.775rem", marginTop: "0.25rem" }}>When mobile collectors match with your facility, they appear here.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Lot Ref</th>
                      <th>Material</th>
                      <th>Weight</th>
                      <th>Collector Area</th>
                      <th>Quoted Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomingLots.map((lot) => (
                      <tr key={lot.id}>
                        <td><strong>{lot.lotRef}</strong></td>
                        <td>{lot.category.nameEn} ({lot.category.nameHi})</td>
                        <td>{(lot.approxWeightGrams / 1000).toFixed(1)} kg</td>
                        <td>{lot.collector.operatingArea}</td>
                        <td>
                          <div>{lot.quotedRatePaise ? `₹${(lot.quotedRatePaise / 100).toFixed(0)}/kg` : "Market"}</div>
                          {lot.transaction?.bargainStatus === "OFFER_BY_COLLECTOR" && (
                            <div style={{ marginTop: "0.25rem" }}>
                              <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                                💬 Collector asks: ₹{(lot.transaction.bargainRatePaise! / 100).toFixed(0)}/kg
                              </span>
                            </div>
                          )}
                          {lot.transaction?.bargainStatus === "AGREED" && (
                            <div style={{ marginTop: "0.25rem" }}>
                              <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                                ✓ Agreed: ₹{(lot.transaction.agreedRatePaise! / 100).toFixed(0)}/kg
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <form action={acceptLotFormAction}>
                              <input type="hidden" name="lotId" value={lot.id} />
                              <button type="submit" className="btn btn-sm btn-primary">
                                Accept
                              </button>
                            </form>
                            <Link href={`/recycler/verify?query=${lot.lotRef}`} className="btn btn-sm btn-secondary">
                              Review
                            </Link>
                            <form action={dispatchPickupFormAction}>
                              <input type="hidden" name="lotId" value={lot.id} />
                              <button
                                type="submit"
                                className="btn btn-sm btn-secondary"
                                style={{ borderColor: "#2563eb", color: "#2563eb" }}
                                title="Dispatch field vehicle to pick up directly"
                              >
                                🚚 Dispatch
                              </button>
                            </form>
                          </div>

                          {lot.transaction && lot.transaction.bargainStatus === "OFFER_BY_COLLECTOR" && (
                            <div style={{ marginTop: "0.35rem" }}>
                              <form action={recyclerAcceptBargainAction}>
                                <input type="hidden" name="transactionId" value={lot.transaction.id} />
                                <button
                                  type="submit"
                                  className="btn btn-sm btn-primary"
                                  style={{ backgroundColor: "var(--primary-700)", fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
                                >
                                  ✓ Accept ₹{(lot.transaction.bargainRatePaise! / 100).toFixed(0)}
                                </button>
                              </form>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Doorstep Pickup Requests */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)" }}>
                  Doorstep Pickup Requests
                </h2>
                <div style={{ fontSize: "0.775rem", color: "var(--slate-500)" }}>
                  Scheduled pickups dispatched or requested by collectors
                </div>
              </div>
              <span className="badge badge-neutral">{pickupRequests.length} Scheduled</span>
            </div>

            {pickupRequests.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--slate-500)", backgroundColor: "var(--slate-50)", borderRadius: "var(--radius)" }}>
                <div>No scheduled pickup requests currently pending.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Slot Time</th>
                      <th>Lot Ref</th>
                      <th>Material</th>
                      <th>Weight</th>
                      <th>Status</th>
                      <th>Update Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickupRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{new Date(req.slot).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                        <td><strong>{req.lot.lotRef}</strong></td>
                        <td>{req.lot.category.nameEn}</td>
                        <td>{(req.lot.approxWeightGrams / 1000).toFixed(1)} kg</td>
                        <td>
                          <span className={`badge ${req.status === "COMPLETED" ? "badge-success" : req.status === "REQUESTED" ? "badge-warning" : "badge-neutral"}`}>
                            {req.status}
                          </span>
                        </td>
                        <td>
                          <form action={updatePickupStatusFormAction} style={{ display: "flex", gap: "0.3rem" }}>
                            <input type="hidden" name="requestId" value={req.id} />
                            <select name="status" defaultValue={req.status} className="form-control" style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                              <option value="ACCEPTED">ACCEPTED</option>
                              <option value="ON_THE_WAY">ON_THE_WAY</option>
                              <option value="ARRIVED">ARRIVED</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                            <button type="submit" className="btn btn-sm btn-secondary">Save</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Desktop Facility Sidebar (Fills Wide Screens Cleanly!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Widget 1: Quick Scale Handover Jump (R2 Shortcut) */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
              ⚡ R2 Quick Scale Verification
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginBottom: "0.85rem" }}>
              Enter collector lot code or reference to jump straight into scale weight &amp; PIN check:
            </p>

            <form action="/recycler/verify" method="GET" style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                name="query"
                placeholder="e.g. LOT-KW01 or 4821"
                required
                className="form-control"
                style={{ fontSize: "0.85rem", padding: "0.45rem 0.65rem" }}
              />
              <button type="submit" className="btn btn-sm btn-primary" style={{ whiteSpace: "nowrap" }}>
                Verify &rarr;
              </button>
            </form>
          </div>

          {/* Widget 2: Facility Active Rates (R3 Overview) */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)" }}>
                  🏷️ Active Buying Rates (R3)
                </h3>
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>Current rates per kilogram</div>
              </div>
              <Link href="/recycler/rates" className="btn btn-sm btn-secondary" style={{ fontSize: "0.75rem" }}>
                Edit Rates &rarr;
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {currentRates.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.45rem 0.65rem",
                    backgroundColor: "var(--slate-50)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--slate-200)",
                    fontSize: "0.825rem",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--slate-800)" }}>
                    {r.category.nameEn}
                  </span>
                  <strong style={{ color: "var(--primary-800)" }}>
                    ₹{(r.ratePerKgPaise / 100).toFixed(0)} / kg
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Regulatory Compliance & Permit Info */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.6rem" }}>
              📜 SPCB / CPCB Regulatory Record
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.775rem", color: "var(--slate-600)" }}>
              <div><strong>Permit No:</strong> <code>{facility.authorizationNo}</code></div>
              <div><strong>Status:</strong> <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>{facility.authorizationStatus}</span></div>
              <div><strong>Valid Till:</strong> {facility.authorizationValidTill ? new Date(facility.authorizationValidTill).toLocaleDateString("en-IN") : "Dec 2027"}</div>
              <div><strong>Min Lot Weight:</strong> {(facility.minimumWeightGrams / 1000)} kg</div>
              <div><strong>Operating State:</strong> {facility.state} ({facility.district})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
