import Link from "next/link";
import { recyclerLoginAction } from "../actions";

export default async function RecyclerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "1.5rem 1rem",
        backgroundColor: "var(--bg)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2rem 1.75rem",
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
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              fontSize: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "0.75rem",
            }}
          >
            🏢
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
            Recycler Gate Portal
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Authorized Facility Staff &bull; R1–R4 Access
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <span className="badge badge-info">SPCB / CPCB Compliance</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ textAlign: "center", justifyContent: "center" }}>
            ⚠️ {error}
          </div>
        )}

        <form action={recyclerLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="form-control"
              defaultValue="9876543210"
              placeholder="e.g. 9876543210"
              required
              style={{ fontSize: "1rem", padding: "0.75rem" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              defaultValue="password123"
              placeholder="••••••••"
              required
              style={{ fontSize: "1rem", padding: "0.75rem" }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: "0.5rem", backgroundColor: "#0284c7" }}>
            Sign In to Facility &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--slate-600)" }}>
          New Recycling Facility?{" "}
          <Link href="/recycler/register" style={{ color: "#0284c7", fontWeight: 700 }}>
            Register Facility &rarr;
          </Link>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.875rem",
            backgroundColor: "var(--slate-50)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--slate-200)",
            fontSize: "0.775rem",
            color: "var(--slate-600)",
            lineHeight: 1.5,
          }}
        >
          <strong>Demo Recycler:</strong> <code>9876543210</code> / <code>password123</code><br />
          Facility: EcoRecycle Mumbai Central Hub (EW-MH-2026-0042)
        </div>

        <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.825rem" }}>
          <Link href="/" style={{ color: "var(--slate-500)", textDecoration: "none" }}>
            &larr; Back to Platform Home
          </Link>
        </div>
      </div>
    </div>
  );
}
