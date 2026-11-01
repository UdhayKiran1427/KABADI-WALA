import { adminLoginAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div style={{ maxWidth: "400px", margin: "4rem auto" }}>
      <div className="card">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Platform Admin Sign In</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Superuser portal for compliance verification, price dataset, anomaly alerts, and dataset health.
        </p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form action={adminLoginAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Admin Phone / Username</label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="form-control"
              placeholder="e.g. 9999999999"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem", background: "#0284c7" }}>
            Sign In to Dashboard &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Demo Admin Account: <code>9999999999</code> / <code>admin123</code> (available once seeded)
        </div>
      </div>
    </div>
  );
}

