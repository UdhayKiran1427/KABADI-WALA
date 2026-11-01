import Link from "next/link";
import { ArrowLeft, ShieldCheck, TriangleAlert } from "lucide-react";
import { adminLoginAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 0" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="r-role-icon" style={{ width: 56, height: 56, borderRadius: 16 }}>
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <h1 className="r-page-title">Admin sign in</h1>
        </div>

        {error && (
          <div className="alert alert-danger">
            <TriangleAlert size={18} aria-hidden="true" /> {error}
          </div>
        )}

        <div className="card">
          <form action={adminLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-control"
                placeholder="10-digit phone number"
                autoComplete="tel"
                required
                style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                autoComplete="current-password"
                required
                style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign in
            </button>
          </form>
        </div>

        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <Link href="/" className="r-inline r-muted">
            <ArrowLeft size={15} aria-hidden="true" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
