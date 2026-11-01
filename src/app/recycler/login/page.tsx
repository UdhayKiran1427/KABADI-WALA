import Link from "next/link";
import { recyclerLoginAction } from "../actions";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default async function RecyclerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: Recycler Enterprise Showcase */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #0c4a6e 0%, #0369a1 45%, #0284c7 100%)",
        }}
      >
        <div>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "1.2rem",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>♻️</span>
            <span>KABADI WALA &bull; Recycler Hub</span>
          </Link>

          <div style={{ marginTop: "3.5rem" }}>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.18)",
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              Enterprise Recycler Gateway
            </span>
            <h1
              style={{
                fontSize: "2.4rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: "1.25rem",
                lineHeight: 1.2,
                color: "#ffffff",
              }}
            >
              Streamlined E-Waste Gate Inwarding &amp; CPCB Compliance
            </h1>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                marginTop: "1.25rem",
                maxWidth: "500px",
              }}
            >
              Connect directly with verified informal collection networks, verify weighbridge scale weights with 4-digit PINs, and maintain automated SPCB Form 6 records.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "3rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                ⚖️
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>R2: 4-Digit Handover Verification</strong>
                <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.2rem" }}>
                  Instant match verification against collector offline passes with automated weight variance checks.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                🏷️
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>R3: Dynamic Material Rate Publishing</strong>
                <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.2rem" }}>
                  Set daily buying rates per scrap category and doorstep collection parameters live to the picker community.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                📜
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>Audit-Ready SPCB / CPCB Traceability</strong>
                <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.2rem" }}>
                  Tamper-evident digital receipts, GPS audit trails, and automated annual return data exports.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: "2rem", borderTop: "1px solid rgba(255, 255, 255, 0.18)", marginTop: "2.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)" }}>
            Authorized E-Waste Recycler Operations &bull; Modules R1–R4
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Sign In Form */}
      <div className="auth-form-pane">
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "1.85rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              🏢
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Recycler Gate Portal
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              Facility staff sign in &bull; Modules R1–R4
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <span className="badge badge-info">SPCB / CPCB Compliance</span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <LanguageSwitcher />
              <Link href="/recycler/language" style={{ fontSize: "0.75rem", color: "var(--primary-700)", fontWeight: 700, textDecoration: "none" }}>
                🌐 Select Language
              </Link>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
              ⚠️ {error}
            </div>
          )}

          <div
            className="card"
            style={{
              padding: "2rem 1.75rem",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--slate-200)",
            }}
          >
            <form action={recyclerLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="phone" style={{ fontWeight: 700 }}>
                  Facility Contact Phone *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  defaultValue="9876543210"
                  placeholder="e.g. 9876543210"
                  required
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem" }}>
                  Demo Facility Account: <code>9876543210</code>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="password" style={{ fontWeight: 700 }}>
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control"
                  defaultValue="password123"
                  placeholder="••••••••"
                  required
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem" }}>
                  Demo Default: <code>password123</code>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: "0.5rem", padding: "0.85rem", backgroundColor: "#0284c7" }}
              >
                Sign In to Facility &rarr;
              </button>
            </form>

            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--slate-200)",
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--slate-600)",
              }}
            >
              Need to register a new recycling unit?{" "}
              <Link href="/recycler/register" style={{ color: "#0284c7", fontWeight: 700 }}>
                Onboard Facility &rarr;
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link href="/" style={{ color: "var(--slate-500)", fontSize: "0.85rem", textDecoration: "none" }}>
              &larr; Back to Platform Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
