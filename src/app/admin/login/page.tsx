import Link from "next/link";
import { adminLoginAction } from "../actions";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: Executive Governance Hero */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 45%, #334155 100%)",
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
            <span style={{ fontSize: "1.3rem" }}>🛡️</span>
            <span>KABADI WALA &bull; Governance Control</span>
          </Link>

          <div style={{ marginTop: "3.5rem" }}>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                border: "1px solid rgba(255, 255, 255, 0.22)",
              }}
            >
              Executive Administration &bull; M1–M5
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
              End-to-End E-Waste Supply Chain Governance &amp; EPR Audit
            </h1>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                marginTop: "1.25rem",
                maxWidth: "500px",
              }}
            >
              Real-time surveillance across facility authorizations, automated price floor and ceiling regulation, AI fraud/anomaly flags, and formal sector transition KPIs.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "3rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                🏢
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>M1: Recycler Authorization Vetting</strong>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Verify SPCB consent-to-operate permits, capacity quotas, and operating radii.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>M3: Algorithmic Anomaly Detection</strong>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Instant alerts on weight variance &gt;15%, GPS spoofing &gt;200m, and predatory price clipping.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                📈
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>M5: Circular Impact &amp; EPR Accounting</strong>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Trace circular kilograms, hazardous fractions neutralized, and direct payments routed to pickers.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: "2rem", borderTop: "1px solid rgba(255, 255, 255, 0.14)", marginTop: "2.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            E-Waste Management Rules 2022 &bull; Central Pollution Control Board Compliance
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
                backgroundColor: "var(--slate-200)",
                color: "var(--slate-800)",
                fontSize: "1.85rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              🛡️
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Admin Control Center
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              Executive system administration &bull; Modules M1–M5
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <span className="badge badge-neutral">Role: System Administrator</span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <LanguageSwitcher />
              <Link href="/admin/language" style={{ fontSize: "0.75rem", color: "var(--primary-700)", fontWeight: 700, textDecoration: "none" }}>
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
            <form action={adminLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="phone" style={{ fontWeight: 700 }}>
                  Administrator Phone *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  defaultValue="9999999999"
                  placeholder="e.g. 9999999999"
                  required
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem" }}>
                  Demo Admin Phone: <code>9999999999</code>
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
                  defaultValue="admin123"
                  placeholder="••••••••"
                  required
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem" }}>
                  Demo Default: <code>admin123</code>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: "0.5rem", padding: "0.85rem", backgroundColor: "var(--slate-900)" }}
              >
                Access Control Center &rarr;
              </button>
            </form>
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
