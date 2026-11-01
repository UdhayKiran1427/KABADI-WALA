import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateRecyclerStatusAction, createRecyclerAction } from "../actions";

export default async function AdminRecyclersPage() {
  await requireRole(["ADMIN"]);

  const recyclers = await prisma.recycler.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      staff: { include: { user: true } },
      verifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewedBy: true },
      },
    },
  });

  const now = new Date();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>M1 Recycler Verification Queue</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Review CPCB/SPCB statutory authorizations, approve facilities, or suspend non-compliant recyclers.
          </p>
        </div>
      </div>

      {/* Recyclers Table */}
      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Authorized Facilities ({recyclers.length})</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Facility Name</th>
                <th>Auth Number</th>
                <th>Validity Expiry</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recyclers.map((r) => {
                const isPastExpiry = r.authorizationValidTill && r.authorizationValidTill < now;
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.area}, {r.district}</div>
                    </td>
                    <td><code>{r.authorizationNo}</code></td>
                    <td>
                      {r.authorizationValidTill ? (
                        <span style={{ color: isPastExpiry ? "var(--danger)" : "inherit" }}>
                          {r.authorizationValidTill.toISOString().split("T")[0]}
                          {isPastExpiry && " (Expired)"}
                        </span>
                      ) : (
                        "None"
                      )}
                    </td>
                    <td>{r.contactPhone}</td>
                    <td>
                      <span className={`badge ${r.authorizationStatus === "VERIFIED" ? "badge-success" : r.authorizationStatus === "EXPIRED" ? "badge-danger" : "badge-warning"}`}>
                        {r.authorizationStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {r.authorizationStatus !== "VERIFIED" && (
                          <form action={updateRecyclerStatusAction.bind(null, r.id, "VERIFIED", "Approved by admin")}>
                            <button type="submit" className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                              Approve
                            </button>
                          </form>
                        )}
                        {r.authorizationStatus !== "SUSPENDED" && (
                          <form action={updateRecyclerStatusAction.bind(null, r.id, "SUSPENDED", "Suspended by admin")}>
                            <button type="submit" className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                              Suspend
                            </button>
                          </form>
                        )}
                        {r.authorizationStatus !== "EXPIRED" && isPastExpiry && (
                          <form action={updateRecyclerStatusAction.bind(null, r.id, "EXPIRED", "Flagged expired by admin")}>
                            <button type="submit" className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                              Expire
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Recycler Facility Form */}
      <div className="card" style={{ maxWidth: "700px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Add New Authorized Recycler</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Registers a verified formal recycling partner and creates their initial staff portal sign-in credentials.
        </p>

        <form action={createRecyclerAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Facility Name</label>
            <input id="name" name="name" type="text" className="form-control" placeholder="e.g. EcoMetals Recycling Pvt Ltd" required />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="authorizationNo">CPCB/SPCB Auth No</label>
              <input id="authorizationNo" name="authorizationNo" type="text" className="form-control" placeholder="EW-MH-2026-..." required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="validTill">Validity Till Date</label>
              <input id="validTill" name="validTill" type="date" className="form-control" required />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="contactPhone">Facility Contact Phone</label>
              <input id="contactPhone" name="contactPhone" type="text" className="form-control" placeholder="e.g. 9876543210" required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="serviceRadiusKm">Service Radius (km)</label>
              <input id="serviceRadiusKm" name="serviceRadiusKm" type="number" defaultValue="15" className="form-control" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">Full Address</label>
            <input id="address" name="address" type="text" className="form-control" placeholder="Plot 42, Industrial Area..." required />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="area">Area / Locality</label>
              <input id="area" name="area" type="text" className="form-control" placeholder="e.g. Andheri East" required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="district">District</label>
              <input id="district" name="district" type="text" defaultValue="Mumbai" className="form-control" required />
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "6px", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>Recycler Portal Login Credentials</h3>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" htmlFor="staffPhone">Staff Phone / Username</label>
                <input id="staffPhone" name="staffPhone" type="text" className="form-control" placeholder="e.g. 9876543210" required />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" htmlFor="staffPassword">Staff Password</label>
                <input id="staffPassword" name="staffPassword" type="password" defaultValue="password123" className="form-control" required />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            Create Recycler &amp; Staff Account
          </button>
        </form>
      </div>
    </div>
  );
}

