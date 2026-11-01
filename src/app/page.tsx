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
            <Link href="/recycler" className="btn btn-secondary">Recycler Portal (R1–R4)</Link>
            <Link href="/admin" className="btn btn-primary">Admin Dashboard (M1–M5)</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: "3rem 1rem", maxWidth: "900px" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem", color: "var(--secondary)" }}>
            Digital Formalization for Informal E-Waste Recyclers
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-muted)", maxWidth: "700px", margin: "0 auto" }}>
            Connecting informal waste-pickers and kabadiwalas (Android app, Hindi/Marathi, offline-first) with government-authorized formal recyclers with full traceability.
          </p>
        </div>

        <div className="grid-2">
          <div className="card">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🏢 Recycler Portal</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Authorized e-waste recyclers: Manage buying rates, view incoming lots, verify handovers with camera QR and 4-digit code, record scale weights, and mark cash/UPI payouts.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/recycler" className="btn btn-primary">Enter Recycler Portal &rarr;</Link>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🛡️ Admin Dashboard</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Platform governance: Recycler verification queue (M1), price dataset & weekly SVG trends (M2), anomaly alerts (M3), dataset and AI health (M4), and impact analytics (M5).
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/admin" className="btn btn-secondary">Enter Admin Dashboard &rarr;</Link>
            </div>
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

