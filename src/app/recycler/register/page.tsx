import Link from "next/link";
import { recyclerRegisterAction } from "../actions";

export default async function RecyclerRegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: Enterprise Recycler Showcase (Fills Wide Desktop Screen!) */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 40%, #0369a1 100%)",
        }}
      >
        <div>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#ffffff", fontWeight: 800, fontSize: "1.2rem", textDecoration: "none" }}>
            <span>♻️</span>
            <span>KABADI WALA</span>
          </Link>

          <div style={{ marginTop: "3rem" }}>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Enterprise Recycler Network
            </span>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "1rem", lineHeight: 1.2 }}>
              Authorized E-Waste Supply Chain Governance &amp; Traceability
            </h1>
            <p style={{ color: "#bae6fd", fontSize: "1rem", lineHeight: 1.6, marginTop: "1rem", maxWidth: "480px" }}>
              Connect your state-authorized recycling plant directly to thousands of street-level aggregators and informal collectors.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "2.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                ⚖️
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>Precision Scale Verification (&plusmn;5%)</strong>
                <div style={{ fontSize: "0.825rem", color: "#bae6fd", marginTop: "0.15rem" }}>
                  Automate gate weighing with auto-acceptance rules, mutual 4-digit PIN verification, and instant settlement.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                🏷️
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>Dynamic Spot Rate Control</strong>
                <div style={{ fontSize: "0.825rem", color: "#bae6fd", marginTop: "0.15rem" }}>
                  Publish buying rates per kg in integer paise. Adjust daily margins to attract high-grade copper and circuit boards.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                📜
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>EPR Proof &amp; Regulatory Audit Trail</strong>
                <div style={{ fontSize: "0.825rem", color: "#bae6fd", marginTop: "0.15rem" }}>
                  Generate audit-proof digital receipts with Zero-PII masking, fully compliant with CPCB EPR credit targets.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", paddingTop: "1.5rem", marginTop: "3rem", fontSize: "0.8rem", color: "#7dd3fc" }}>
          Registered with State Pollution Control Board &bull; Environmental Protection Act Compliant
        </div>
      </div>

      {/* RIGHT PANEL: Focused Facility Form */}
      <div className="auth-form-pane">
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "2.25rem 2rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--slate-200)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                backgroundColor: "#f0f9ff",
                color: "#0284c7",
                fontSize: "1.75rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              🏭
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Facility Registration
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Register state-authorized recycling plant or collection hub
            </p>
          </div>

          {searchParams.error && (
            <div className="alert alert-danger" style={{ textAlign: "center", justifyContent: "center" }}>
              ⚠️ {searchParams.error}
            </div>
          )}

          <form action={recyclerRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Facility Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. EcoGreen Recyclers Pvt Ltd"
                className="form-control"
                style={{ fontSize: "0.95rem", padding: "0.7rem" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  SPCB Authorization No. <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  name="authorizationNo"
                  required
                  placeholder="e.g. EW-MH-2026-0042"
                  className="form-control"
                  style={{ fontSize: "0.95rem", padding: "0.7rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Contact Phone <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  pattern="\d{10}"
                  required
                  placeholder="10-digit phone"
                  className="form-control"
                  style={{ fontSize: "0.95rem", padding: "0.7rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Password <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  minLength={6}
                  required
                  placeholder="••••••••"
                  className="form-control"
                  style={{ fontSize: "0.95rem", padding: "0.7rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Confirm Password <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  minLength={6}
                  required
                  placeholder="••••••••"
                  className="form-control"
                  style={{ fontSize: "0.95rem", padding: "0.7rem" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Facility Address <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="address"
                required
                placeholder="e.g. Plot 42, MIDC Industrial Area, Taloja"
                className="form-control"
                style={{ fontSize: "0.95rem", padding: "0.7rem" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Area / Hub</label>
                <input
                  type="text"
                  name="area"
                  defaultValue="Dharavi"
                  className="form-control"
                  style={{ fontSize: "0.9rem", padding: "0.6rem" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">District</label>
                <input
                  type="text"
                  name="district"
                  defaultValue="Mumbai"
                  className="form-control"
                  style={{ fontSize: "0.9rem", padding: "0.6rem" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">State</label>
                <input
                  type="text"
                  name="state"
                  defaultValue="Maharashtra"
                  className="form-control"
                  style={{ fontSize: "0.9rem", padding: "0.6rem" }}
                />
              </div>
            </div>

            {/* Doorstep Pickup Settings */}
            <div
              style={{
                padding: "0.85rem 1rem",
                backgroundColor: "var(--slate-50)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--slate-200)",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="pickupAvailable"
                  defaultChecked
                  style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--slate-800)" }}>
                  Offer Doorstep Vehicle Pickup to Collectors (C22)
                </span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 }}>Radius (km)</label>
                  <input
                    type="number"
                    name="serviceRadiusKm"
                    defaultValue="20"
                    className="form-control"
                    style={{ fontSize: "0.85rem", padding: "0.45rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 }}>Min Wt (kg)</label>
                  <input
                    type="number"
                    name="minimumWeightKg"
                    defaultValue="15"
                    className="form-control"
                    style={{ fontSize: "0.85rem", padding: "0.45rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 }}>Fee (₹)</label>
                  <input
                    type="number"
                    name="pickupChargeRupees"
                    defaultValue="0"
                    className="form-control"
                    style={{ fontSize: "0.85rem", padding: "0.45rem" }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: "0.5rem", backgroundColor: "#0284c7", borderColor: "#0284c7" }}
            >
              Complete Facility Registration &rarr;
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--slate-600)" }}>
            Already have facility staff access?{" "}
            <Link href="/recycler/login" style={{ color: "#0284c7", fontWeight: 700 }}>
              Sign In Here &rarr;
            </Link>
          </div>

          <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.825rem" }}>
            <Link href="/" style={{ color: "var(--slate-500)", textDecoration: "none" }}>
              &larr; Back to Platform Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
