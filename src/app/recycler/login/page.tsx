import { recyclerLoginAction } from "../actions";

export default async function RecyclerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div style={{ maxWidth: "400px", margin: "4rem auto" }}>
      <div className="card">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Recycler Staff Sign In</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Access facility dashboard R1–R4 with phone and password.
        </p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form action={recyclerLoginAction}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="form-control"
              placeholder="e.g. 9876543210"
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

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
            Sign In &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.9rem" }}>
          New Recycler Facility?{" "}
          <a href="/recycler/register" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}>
            Register Your Facility &rarr;
          </a>
        </div>

        <div style={{ marginTop: "1.5rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Demo Recycler Login: <code>9876543210</code> / <code>password123</code> (available once seeded)
        </div>

        <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem" }}>
          <a href="/" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
            &larr; Back to Platform Home
          </a>
        </div>
      </div>
    </div>
  );
}
