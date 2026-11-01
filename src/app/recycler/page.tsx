import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { acceptLotAction, updatePickupStatusAction } from "./actions";

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

  return (
    <div>
      {/* R1 Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>R1 Dashboard &amp; Incoming Lots</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{facility.name} &bull; {facility.address}</p>
        </div>
        <div>
          {facility.authorizationStatus === "VERIFIED" ? (
            <span className="badge badge-success">✓ Authorization Verified ({facility.authorizationNo})</span>
          ) : facility.authorizationStatus === "EXPIRED" ? (
            <span className="badge badge-danger">⚠️ Authorization Expired</span>
          ) : (
            <span className="badge badge-warning">⏳ Authorization Pending Review</span>
          )}
        </div>
      </div>

      {/* R1 KPI Stat Boxes */}
      <div className="grid-3">
        <div className="stat-box">
          <div className="stat-label">Incoming Lots</div>
          <div className="stat-value">{incomingLots.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Processed This Week</div>
          <div className="stat-value">{totalWeeklyKg} kg</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Unpaid Payouts</div>
          <div className="stat-value">₹{(totalUnpaidPaise / 100).toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* R1 Incoming Lots Queue */}
      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Incoming Lots Matched</h2>
        {incomingLots.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem 0" }}>
            No incoming lots waiting for review. When mobile collectors match with your facility, they appear here.
          </p>
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
                    <td>{lot.quotedRatePaise ? `₹${(lot.quotedRatePaise / 100).toFixed(0)}/kg` : "Market"}</td>
                    <td style={{ display: "flex", gap: "0.5rem" }}>
                      <form action={acceptLotAction.bind(null, lot.id)}>
                        <button type="submit" className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                          Accept
                        </button>
                      </form>
                      <Link href={`/recycler/verify?query=${lot.lotRef}`} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Doorstep Pickup Requests */}
      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Doorstep Pickup Requests</h2>
        {pickupRequests.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem 0" }}>
            No scheduled pickup requests.
          </p>
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
                      <form action={async (formData: FormData) => {
                        "use server";
                        const newStatus = formData.get("status") as string;
                        await updatePickupStatusAction(req.id, newStatus);
                      }} style={{ display: "flex", gap: "0.25rem" }}>
                        <select name="status" defaultValue={req.status} className="form-control" style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="ON_THE_WAY">ON_THE_WAY</option>
                          <option value="ARRIVED">ARRIVED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <button type="submit" className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Save</button>
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
  );
}

