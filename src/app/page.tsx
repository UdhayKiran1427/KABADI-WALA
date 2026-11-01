import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            ♻️ E-Waste Collector Platform
          </div>
          <div className="nav-links">
            <Link href="/collector" className="btn btn-primary" style={{ backgroundColor: "#059669" }}>📱 Collector App (C1–C12)</Link>
            <Link href="/recycler" className="btn btn-secondary">🏢 Recycler (R1–R4)</Link>
            <Link href="/admin" className="btn btn-secondary">🛡️ Admin (M1–M5)</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: "3rem 1rem", maxWidth: "1000px" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem", color: "var(--secondary)" }}>
            Digital Formalization for Informal E-Waste Recyclers
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-muted)", maxWidth: "750px", margin: "0 auto" }}>
            Connecting informal waste-pickers and kabadiwalas (Android app, Hindi/Marathi, offline-first) with government-authorized formal recyclers with full traceability.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          <div className="card" style={{ border: "2px solid #10b981", backgroundColor: "#f0fdf4" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "#065f46" }}>
              📱 Collector Portal
            </h2>
            <p style={{ color: "#334155", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Low-literacy, voice/icon-forward simulator: View today's rates in Hindi/Marathi, create e-waste lots, get instant valuation, match verified recyclers, and show 4-digit handover codes.
            </p>
            <div style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
              Demo: <code>9820000001</code> / PIN <code>1234</code>
            </div>
            <Link href="/collector" className="btn btn-primary" style={{ backgroundColor: "#059669", width: "100%", textAlign: "center" }}>
              Open Collector Portal &rarr;
            </Link>
          </div>

          <div className="card">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🏢 Recycler Portal</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Authorized e-waste recyclers: Manage buying rates, view incoming lots, verify handovers with camera QR and 4-digit code, record scale weights, and mark cash/UPI payouts.
            </p>
            <div style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
              Demo: <code>9876543210</code> / <code>password123</code>
            </div>
            <Link href="/recycler" className="btn btn-secondary" style={{ width: "100%", textAlign: "center" }}>
              Enter Recycler Portal &rarr;
            </Link>
          </div>

          <div className="card">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🛡️ Admin Dashboard</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Platform governance: Recycler verification queue (M1), price dataset & weekly SVG trends (M2), anomaly alerts (M3), dataset and AI health (M4), and impact analytics (M5).
            </p>
            <div style={{ marginBottom: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
              Demo: <code>9999999999</code> / <code>admin123</code>
            </div>
            <Link href="/admin" className="btn btn-secondary" style={{ width: "100%", textAlign: "center" }}>
              Enter Admin Dashboard &rarr;
            </Link>
          </div>
        </div>

        <div className="card" style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>📱 Mobile App & Backend Contract</h3>
          <ul style={{ paddingLeft: "1.25rem", color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: "1.8" }}>
            <li><strong>Offline Sync</strong>: <code>POST /api/v1/sync/push</code> and <code>GET /api/v1/sync/pull</code> with client-generated UUIDs and idempotency.</li>
            <li><strong>Strict Integer Units</strong>: Currency in integer <strong>PAISE</strong> (₹1 = 100 paise) and weights in integer <strong>GRAMS</strong> (1 kg = 1000 g).</li>
            <li><strong>Privacy Guaranteed</strong>: Zero collector PII stored; analytics locations rounded to ~100m.</li>
            <li><strong>Health Check</strong>: <Link href="/api/v1/health" style={{ textDecoration: "underline", color: "var(--primary)" }}>/api/v1/health</Link> (MongoDB replica set verification).</li>
          </ul>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
        E-Waste Collector Platform &bull; Built with Next.js 15, Prisma 6 &amp; MongoDB
      </footer>
    </div>
  );
}

