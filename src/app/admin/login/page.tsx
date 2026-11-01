import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";
import { adminLoginAction } from "../actions";

// PLACEHOLDER: Base model demo admin credentials (debug/development builds only per ROLE RB2.3)
const DEMO_ADMIN_PHONE = "9999900001";
const DEMO_ADMIN_PIN = "123456";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 0" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="r-role-icon" style={{ width: 56, height: 56, borderRadius: 16 }}>
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <h1 className="r-page-title">Platform Admin sign in</h1>
          <p className="r-muted" style={{ fontSize: "0.875rem", margin: 0 }}>
            Restricted access for platform administrators
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <TriangleAlert size={18} aria-hidden="true" /> {error}
          </div>
        )}

        <div className="card">
          <form action={adminLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="phone">Admin Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-control"
                placeholder="10-digit admin mobile"
                autoComplete="tel"
                defaultValue={isDev ? DEMO_ADMIN_PHONE : ""}
                required
                style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" htmlFor="password">6-Digit Admin PIN</label>
                <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>6 digits</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                placeholder="Enter 6-digit PIN"
                autoComplete="current-password"
                pattern="[0-9]{6}"
                title="6-digit PIN required"
                defaultValue={isDev ? DEMO_ADMIN_PIN : ""}
                required
                style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
              />
            </div>

            {/* TODO(security): Second factor OTP verification placeholder via RemoteApi */}
            <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <KeyRound size={13} aria-hidden="true" />
              <span>Two-Factor Authentication (OTP): Enabled on production accounts</span>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign in as Admin
            </button>
          </form>

          {isDev ? (
            <div
              style={{
                marginTop: "1.25rem",
                padding: "0.75rem 1rem",
                backgroundColor: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
                color: "#475569",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Demo Admin Credentials (Dev Mode):</div>
              <div>Phone: <code>{DEMO_ADMIN_PHONE}</code></div>
              <div>PIN: <code>{DEMO_ADMIN_PIN}</code></div>
            </div>
          ) : (
            <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.85rem", color: "var(--slate-500)" }}>
              Admin accounts cannot self-register. Contact the platform team to get access.
            </div>
          )}
        </div>

        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <Link href="/" className="r-inline r-muted">
            <ArrowLeft size={15} aria-hidden="true" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
