import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header */}
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
            <Link href="/recycler" style={{ color: "var(--slate-500)", textDecoration: "none" }}>
              &larr; R1 Dashboard
            </Link>
            <span style={{ color: "var(--slate-300)" }}>/</span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              R4 Facility Profile &amp; Government Authorization
            </h1>
          </div>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Maintain authorized recycling facility credentials, contact information, and service radius.
          </p>
        </div>

        <div>
          {facility.authorizationStatus === "VERIFIED" ? (
            <span className="badge badge-success" style={{ padding: "0.4rem 0.8rem" }}>✓ SPCB Verified Active</span>
          ) : facility.authorizationStatus === "EXPIRED" ? (
            <span className="badge badge-danger">⚠️ Permit Expired</span>
          ) : (
            <span className="badge badge-warning">⏳ Pending Admin Verification</span>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Profile Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <form action={updateProfileAction} className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "1.25rem" }}>
              Facility Profile Details
            </h2>

            <div className="form-group">
              <label className="form-label" htmlFor="name" style={{ fontWeight: 700 }}>
                Facility Legal Entity Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={facility.name}
                className="form-control"
                style={{ fontSize: "1rem" }}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="contactPhone" style={{ fontWeight: 700 }}>
                  Contact Phone Number *
                </label>
                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="text"
                  defaultValue={facility.contactPhone}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="serviceRadiusKm" style={{ fontWeight: 700 }}>
                  Service Radius (km) *
                </label>
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
              <label className="form-label" htmlFor="address" style={{ fontWeight: 700 }}>
                Physical Facility Address &bull; Gate Location *
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={facility.address}
                className="form-control"
                required
              />
            </div>

            <div
              style={{
                border: "1px solid var(--slate-200)",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                background: "var(--slate-50)",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.35rem" }}>
                📜 State Pollution Control Board (SPCB / CPCB) Permit
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--slate-500)", marginBottom: "1rem" }}>
                ⚠️ Modifying the authorization permit or expiry date will automatically transition status to <strong>PENDING</strong> for administrator audit verification.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="authorizationNo" style={{ fontWeight: 600 }}>
                    SPCB Consent / Authorization No *
                  </label>
                  <input
                    id="authorizationNo"
                    name="authorizationNo"
                    type="text"
                    defaultValue={facility.authorizationNo}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="validTill" style={{ fontWeight: 600 }}>
                    Valid Till Date *
                  </label>
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

            <div style={{ marginBottom: "1.5rem" }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Currently Configured Scrap Categories ({facility.rates.length})
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {facility.rates.map((rate) => (
                  <span
                    key={rate.id}
                    className="badge badge-neutral"
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    {rate.category.nameEn}: ₹{(rate.ratePerKgPaise / 100).toFixed(0)}/kg
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ padding: "0.85rem" }}>
              💾 Save Facility Profile &amp; Update Authorization
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Facility Metadata & Audit Readiness (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* SPCB Compliance Card */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid #0284c7" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.75rem" }}>
              🏢 Operational Credentials
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Facility ID:</span>
                <code>{facility.id.substring(0, 12)}...</code>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Operating State:</span>
                <strong>{facility.state}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>District / Cluster:</span>
                <strong>{facility.district}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Collection Coverage:</span>
                <strong>{facility.serviceRadiusKm} km radius</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Doorstep Pickup Fleet:</span>
                <span className={facility.pickupAvailable ? "badge badge-success" : "badge badge-neutral"}>
                  {facility.pickupAvailable ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Verification Checklist */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.6rem" }}>
              ✅ SPCB Compliance Checklist
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "var(--slate-600)" }}>
              <div>✓ Calibrated digital weighbridge connected</div>
              <div>✓ Fire safety &amp; PPE gear available for handling team</div>
              <div>✓ Dedicated hazardous fraction storage (Lead, Mercury, CRT)</div>
              <div>✓ Electronic Form 6 manifests logged for each handover</div>
            </div>
          </div>

          {/* Assistance Contact */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              Need Help with Verification?
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              For queries regarding state pollution control renewals or weighbridge integration, contact the platform regulatory compliance desk at <code>compliance@kabadiwala.org</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
