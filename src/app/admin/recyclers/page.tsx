import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateRecyclerStatusFormAction, createRecyclerAction } from "../actions";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
            M1 Recycler Verification &amp; Authorization Control
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Review CPCB/SPCB statutory authorizations, approve facilities, or suspend non-compliant recyclers.
          </p>
        </div>
        <span className="badge badge-success">✓ Statutory Audit Active</span>
      </div>

      {/* Recyclers Table Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--slate-900)" }}>
            Authorized Recycling Facilities ({recyclers.length})
          </h2>
          <span className="badge badge-neutral">CPCB Registered</span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Facility Name</th>
                <th>Permit No</th>
                <th>Expiry Date</th>
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
                      <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                        {r.area}, {r.district} &bull; {r.serviceRadiusKm} km radius
                      </div>
                    </td>
                    <td><code>{r.authorizationNo}</code></td>
                    <td>
                      {r.authorizationValidTill ? (
                        <span style={{ color: isPastExpiry ? "var(--danger)" : "inherit", fontWeight: isPastExpiry ? 700 : 500 }}>
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
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {r.authorizationStatus !== "VERIFIED" && (
                          <form action={updateRecyclerStatusFormAction}>
                            <input type="hidden" name="recyclerId" value={r.id} />
                            <input type="hidden" name="status" value="VERIFIED" />
                            <input type="hidden" name="notes" value="Approved by admin" />
                            <button type="submit" className="btn btn-sm btn-primary">
                              Approve
                            </button>
                          </form>
                        )}
                        {r.authorizationStatus !== "SUSPENDED" && (
                          <form action={updateRecyclerStatusFormAction}>
                            <input type="hidden" name="recyclerId" value={r.id} />
                            <input type="hidden" name="status" value="SUSPENDED" />
                            <input type="hidden" name="notes" value="Suspended by admin" />
                            <button type="submit" className="btn btn-sm btn-danger">
                              Suspend
                            </button>
                          </form>
                        )}
                        {r.authorizationStatus !== "EXPIRED" && isPastExpiry && (
                          <form action={updateRecyclerStatusFormAction}>
                            <input type="hidden" name="recyclerId" value={r.id} />
                            <input type="hidden" name="status" value="EXPIRED" />
                            <input type="hidden" name="notes" value="Flagged expired by admin" />
                            <button type="submit" className="btn btn-sm btn-secondary">
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

      {/* Add New Recycler Facility Form (Responsive full-width or split) */}
      <div className="card">
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.35rem" }}>
          Onboard New Authorized Recycler Facility
        </h2>
        <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Registers a verified formal recycling partner and creates their initial staff portal sign-in credentials.
        </p>

        <form action={createRecyclerAction}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name" style={{ fontWeight: 700 }}>Facility Legal Name *</label>
              <input id="name" name="name" type="text" className="form-control" placeholder="e.g. EcoMetals Recycling Pvt Ltd" required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contactPhone" style={{ fontWeight: 700 }}>Facility Contact Phone *</label>
              <input id="contactPhone" name="contactPhone" type="text" className="form-control" placeholder="e.g. 9876543210" required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="authorizationNo" style={{ fontWeight: 700 }}>CPCB/SPCB Auth No *</label>
              <input id="authorizationNo" name="authorizationNo" type="text" className="form-control" placeholder="EW-MH-2026-..." required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="validTill" style={{ fontWeight: 700 }}>Validity Till Date *</label>
              <input id="validTill" name="validTill" type="date" className="form-control" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="serviceRadiusKm" style={{ fontWeight: 700 }}>Service Radius (km) *</label>
              <input id="serviceRadiusKm" name="serviceRadiusKm" type="number" defaultValue="15" className="form-control" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address" style={{ fontWeight: 700 }}>Full Physical Address *</label>
            <input id="address" name="address" type="text" className="form-control" placeholder="Plot 42, Industrial Area, Dharavi Cross Road..." required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="area" style={{ fontWeight: 700 }}>Area / Locality *</label>
              <input id="area" name="area" type="text" className="form-control" placeholder="e.g. Dharavi Central" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="district" style={{ fontWeight: 700 }}>District *</label>
              <input id="district" name="district" type="text" defaultValue="Mumbai" className="form-control" required />
            </div>
          </div>

          <div style={{ background: "var(--slate-50)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--slate-200)", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.75rem" }}>
              🔐 Recycler Staff Login Credentials
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="staffPhone" style={{ fontWeight: 600 }}>Staff Phone Number *</label>
                <input id="staffPhone" name="staffPhone" type="text" className="form-control" placeholder="e.g. 9876543210" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="staffPassword" style={{ fontWeight: 600 }}>Staff Password *</label>
                <input id="staffPassword" name="staffPassword" type="password" defaultValue="password123" className="form-control" required />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ padding: "0.85rem 2rem" }}>
            ✓ Create Authorized Recycler &amp; Staff Account &rarr;
          </button>
        </form>
      </div>
    </div>
  );
}
