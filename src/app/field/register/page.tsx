import Link from "next/link";
import { fieldRegisterAction } from "../actions";

export default async function FieldAgentRegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: High-Impact Brand Showcase (Fills Desktop Screen!) */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
        }}
      >
        <div>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#ffffff", fontWeight: 800, fontSize: "1.2rem", textDecoration: "none" }}>
            <span>♻️</span>
            <span>E-WASTE SAATHI</span>
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
              Ground Operations Team
            </span>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "1rem", lineHeight: 1.2 }}>
              Empowering Ground Operations in the Informal Sector
            </h1>
            <p style={{ color: "#c7d2fe", fontSize: "1rem", lineHeight: 1.6, marginTop: "1rem", maxWidth: "480px" }}>
              Field agents are the crucial bridge connecting street-level waste pickers with certified formal recycling channels.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "2.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                👤
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>F1: Frictionless Onboarding</strong>
                <div style={{ fontSize: "0.825rem", color: "#c7d2fe", marginTop: "0.15rem" }}>
                  Enroll illiterate collectors without identity documentation barriers using phone and voice consent.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                🏷️
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>F2: Ground Spot Price Audits</strong>
                <div style={{ fontSize: "0.825rem", color: "#c7d2fe", marginTop: "0.15rem" }}>
                  Record weekly buying rates at local scrap dealers to detect price cartels and underpayment.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                📷
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>F3: AI Dataset Collection</strong>
                <div style={{ fontSize: "0.825rem", color: "#c7d2fe", marginTop: "0.15rem" }}>
                  Capture labeled scrap photography to train lightweight MobileNet classifiers for waste identification.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", paddingTop: "1.5rem", marginTop: "3rem", fontSize: "0.8rem", color: "#a5b4fc" }}>
          Active Across Mumbai &bull; Dharavi, Kurla, Andheri &amp; Thane Hubs
        </div>
      </div>

      {/* RIGHT PANEL: Focused Clean Registration Form */}
      <div className="auth-form-pane">
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "460px",
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
                backgroundColor: "#eef2ff",
                color: "#4338ca",
                fontSize: "1.75rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              📋
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Field Agent Registration
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Create your account to start ground surveys &amp; onboarding
            </p>
          </div>

          {searchParams.error && (
            <div className="alert alert-danger" style={{ textAlign: "center", justifyContent: "center" }}>
              ⚠️ {searchParams.error}
            </div>
          )}

          <form action={fieldRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Mobile Phone <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                pattern="\d{10}"
                required
                placeholder="10-digit mobile number"
                className="form-control"
                style={{ fontSize: "1rem", padding: "0.75rem" }}
              />
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
                  Confirm <span style={{ color: "var(--danger)" }}>*</span>
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
                Assigned Hub / Operating Area
              </label>
              <input
                type="text"
                name="assignedArea"
                defaultValue="Dharavi - Kurla Sector"
                className="form-control"
                style={{ fontSize: "0.95rem", padding: "0.65rem" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Preferred Working Language
              </label>
              <select
                name="language"
                defaultValue="HI"
                className="form-control"
                style={{ padding: "0.65rem", backgroundColor: "white" }}
              >
                <option value="HI">हिंदी (Hindi)</option>
                <option value="MR">मराठी (Marathi)</option>
                <option value="EN">English</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: "0.5rem", backgroundColor: "#4338ca", borderColor: "#4338ca" }}
            >
              Register as Field Agent &rarr;
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--slate-600)" }}>
            Already registered as an agent?{" "}
            <Link href="/field/login" style={{ color: "#4338ca", fontWeight: 700 }}>
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
