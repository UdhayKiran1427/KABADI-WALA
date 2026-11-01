import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateProfileAction } from "../actions";

export default async function RecyclerProfilePage() {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return <div>No facility assigned</div>;
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
    include: {
      rates: {
        where: { isCurrent: true },
        include: { category: true },
      },
    },
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const validTillStr = facility.authorizationValidTill
    ? facility.authorizationValidTill.toISOString().split("T")[0]
    : "";

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>R4 Facility Profile &amp; Authorization</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Maintain authorized recycling facility credentials, contact, and service coverage.
            </p>
          </div>
          <div>
            {facility.authorizationStatus === "VERIFIED" ? (
              <span className="badge badge-success">✓ Verified</span>
            ) : facility.authorizationStatus === "EXPIRED" ? (
              <span className="badge badge-danger">⚠️ Expired</span>
            ) : (
              <span className="badge badge-warning">⏳ Pending Approval</span>
            )}
          </div>
        </div>

        <form action={updateProfileAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Facility Name</label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={facility.name}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="contactPhone">Contact Phone Number</label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="text"
                defaultValue={facility.contactPhone}
                className="form-control"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="serviceRadiusKm">Service Radius (km)</label>
              <input
                id="serviceRadiusKm"
                name="serviceRadiusKm"
                type="number"
                step="1"
                defaultValue={facility.serviceRadiusKm}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">Physical Facility Address</label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={facility.address}
              className="form-control"
              required
            />
          </div>

          <div style={{ border: "1px solid var(--border)", padding: "1.25rem", borderRadius: "8px", background: "#f8fafc", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>Government Authorization (CPCB/SPCB)</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              ⚠️ Important: Modifying the authorization number or valid-till date will automatically transition your facility status to <strong>PENDING</strong> until admin verifies the updated documentation.
            </p>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" htmlFor="authorizationNo">Authorization Number</label>
                <input
                  id="authorizationNo"
                  name="authorizationNo"
                  type="text"
                  defaultValue={facility.authorizationNo}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" htmlFor="validTill">Valid Till Date</label>
                <input
                  id="validTill"
                  name="validTill"
                  type="date"
                  defaultValue={validTillStr}
                  className="form-control"
                  required
                />
              </div>
            </div>
          </div>

          {/* Accepted Materials List */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label className="form-label">Accepted Materials</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {facility.rates.map((rate) => (
                <span key={rate.id} className="badge badge-neutral" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8125rem" }}>
                  {rate.category.nameEn} (₹{(rate.ratePerKgPaise / 100).toFixed(0)}/kg)
                </span>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            Save Profile &amp; Update Authorization
          </button>
        </form>
      </div>
    </div>
  );
}

