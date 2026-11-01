import Link from "next/link";

export default function HomePage() {
  const categories = [
    { name: "Copper Cables & Wires", hindi: "तार और केबल", rate: "₹580 / kg", code: "CABLE", hazard: false },
    { name: "Printed Circuit Boards", hindi: "सर्किट बोर्ड (PCB)", rate: "₹340 / kg", code: "PCB", hazard: false },
    { name: "Electric Motors & Magnets", hindi: "मोटर और कंप्रेसर", rate: "₹140 / kg", code: "MOTOR", hazard: false },
    { name: "Batteries (Li-Ion / Lead)", hindi: "बैटरी (खतरनाक)", rate: "₹90 / kg", code: "BATTERY", hazard: true },
    { name: "LCD & LED Panels", hindi: "एलसीडी स्क्रीन", rate: "₹45 / kg", code: "LCD", hazard: false },
    { name: "CRT Monitors & Glass", hindi: "सीआरटी स्क्रीन", rate: "₹12 / kg", code: "CRT", hazard: true },
    { name: "Casing Plastics", hindi: "प्लास्टिक केसिंग", rate: "₹8 / kg", code: "PLASTIC", hazard: false },
  ];

  const safetyDirectives = [
    {
      title: "तार न जलाएं",
      subtitle: "Do Not Burn Cables",
      desc: "Burning PVC cables emits carcinogenic dioxins and poisonous smoke. Sell unburnt cables for higher value.",
      badge: "Toxic Fumes",
    },
    {
      title: "एसिड से बोर्ड न धोएं",
      subtitle: "No Acid Leaching",
      desc: "Acid extraction burns skin, releases cyanide gas, and permanently destroys local groundwater.",
      badge: "Chemical Hazard",
    },
    {
      title: "बैटरी न खोलें",
      subtitle: "Do Not Puncture Batteries",
      desc: "Damaging lithium or lead-acid cells triggers chemical fires and violent thermal explosions.",
      badge: "Explosion Risk",
    },
    {
      title: "सीआरटी स्क्रीन न तोड़ें",
      subtitle: "Do Not Smash CRT Monitors",
      desc: "CRT glass contains toxic lead and phosphor powder that implodes into eyes and lungs when smashed.",
      badge: "Poisonous Dust",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Application Navbar */}
      <header className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="brand">
            <span style={{ fontSize: "1.35rem" }}>♻️</span>
            <span>KABADI WALA</span>
          </Link>

          <div className="nav-links">
            <Link href="/collector" className="btn btn-sm btn-primary">
              📱 Collector (कलेक्टर)
            </Link>
            <Link href="/recycler" className="btn btn-sm btn-secondary">
              🏢 Recycler (फैक्ट्री)
            </Link>
            <Link href="/field" className="btn btn-sm btn-secondary">
              📋 Field Agent
            </Link>
            <Link href="/admin" className="btn btn-sm btn-secondary">
              🛡️ Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section style={{ padding: "3.5rem 1rem 3rem", background: "linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)", borderBottom: "1px solid var(--slate-200)" }}>
          <div className="container" style={{ textAlign: "center", maxWidth: "900px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.85rem", borderRadius: "999px", background: "#ffffff", border: "1px solid #bbf7d0", fontSize: "0.8rem", fontWeight: 700, color: "var(--primary-800)", marginBottom: "1.25rem", boxShadow: "var(--shadow-xs)" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "999px", backgroundColor: "var(--primary)" }}></span>
              India E-Waste Management Rules 2022 &bull; Digital Formalization
            </div>

            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--slate-900)", lineHeight: 1.15, marginBottom: "1.25rem" }}>
              Transparent Scrap Pricing &amp; Safe E-Waste Recycling
            </h1>

            <p style={{ fontSize: "clamp(1rem, 1.8vw, 1.15rem)", color: "var(--slate-600)", lineHeight: 1.6, maxWidth: "760px", margin: "0 auto 2rem" }}>
              Bridging informal waste pickers and street-level kabadiwalas with government-authorized recyclers. Real-time daily market rates, mutual 4-digit PIN verification, and tamper-evident digital receipts.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.875rem", flexWrap: "wrap" }}>
              <Link href="/collector" className="btn btn-lg btn-primary">
                📱 Collector Portal (कलेक्टर लॉगिन)
              </Link>
              <Link href="/recycler" className="btn btn-lg btn-secondary">
                🏢 Recycler Facility Portal (अधिकृत प्लांट)
              </Link>
            </div>
          </div>
        </section>

        {/* 4 Multi-Stakeholder Portals */}
        <section style={{ padding: "3.5rem 1rem" }}>
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
                Platform Stakeholder Portals
              </h2>
              <p style={{ color: "var(--slate-500)", fontSize: "0.95rem", marginTop: "0.35rem" }}>
                Select a user role to explore live simulations with pre-seeded demonstration accounts.
              </p>
            </div>

            <div className="grid-4">
              {/* Persona 1: Collector */}
              <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "3px solid var(--primary)" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "1.75rem" }}>📱</span>
                    <span className="badge badge-success">Mobile-First</span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
                    कबाड़ीवाला (Collector)
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--primary-700)", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Hindi / Marathi Voice &amp; Icons
                  </div>
                  <p style={{ fontSize: "0.825rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1rem" }}>
                    Check today's spot scrap rates, bundle items into lots, request doorstep pickup, and verify handovers with a secure 4-digit PIN.
                  </p>
                  <div style={{ padding: "0.5rem 0.65rem", backgroundColor: "var(--slate-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--slate-200)", fontSize: "0.75rem", color: "var(--slate-600)", marginBottom: "1rem" }}>
                    <div><strong>Demo:</strong> <code>9820000001</code></div>
                    <div><strong>PIN:</strong> <code>1234</code> (Short Code: KW01)</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <Link href="/collector" className="btn btn-sm btn-primary btn-block">
                    Collector Portal &rarr;
                  </Link>
                  <Link href="/collector/prices" className="btn btn-sm btn-secondary btn-block">
                    View Today's Rates
                  </Link>
                </div>
              </div>

              {/* Persona 2: Recycler */}
              <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "3px solid #0284c7" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "1.75rem" }}>🏢</span>
                    <span className="badge badge-info">SPCB Authorized</span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
                    Recycler Facility
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#0369a1", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Facility Gate &amp; Weighing System
                  </div>
                  <p style={{ fontSize: "0.825rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1rem" }}>
                    Manage buying rates in paise/kg, accept incoming lots, verify scale weights within &plusmn;5% tolerance, and issue digital payouts.
                  </p>
                  <div style={{ padding: "0.5rem 0.65rem", backgroundColor: "var(--slate-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--slate-200)", fontSize: "0.75rem", color: "var(--slate-600)", marginBottom: "1rem" }}>
                    <div><strong>Demo:</strong> <code>9876543210</code></div>
                    <div><strong>Pass:</strong> <code>password123</code></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <Link href="/recycler" className="btn btn-sm btn-secondary btn-block" style={{ borderColor: "#0284c7", color: "#0284c7" }}>
                    Recycler Gate Portal &rarr;
                  </Link>
                  <Link href="/recycler/verify" className="btn btn-sm btn-secondary btn-block">
                    R2: Verify Handover
                  </Link>
                </div>
              </div>

              {/* Persona 3: Field Agent */}
              <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "3px solid #7c3aed" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "1.75rem" }}>📋</span>
                    <span className="badge badge-neutral">Ground Ops</span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
                    Field Agent (फील्ड साथी)
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#6d28d9", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Surveys &amp; Onboarding
                  </div>
                  <p style={{ fontSize: "0.825rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1rem" }}>
                    Onboard informal workers without ID hurdles, record weekly scrap market buying rates, and capture photos for AI models.
                  </p>
                  <div style={{ padding: "0.5rem 0.65rem", backgroundColor: "var(--slate-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--slate-200)", fontSize: "0.75rem", color: "var(--slate-600)", marginBottom: "1rem" }}>
                    <div><strong>Demo:</strong> <code>9830000001</code></div>
                    <div><strong>Pass:</strong> <code>agent123</code></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <Link href="/field" className="btn btn-sm btn-secondary btn-block" style={{ borderColor: "#7c3aed", color: "#7c3aed" }}>
                    Field Agent Hub &rarr;
                  </Link>
                  <Link href="/field/onboard" className="btn btn-sm btn-secondary btn-block">
                    F1: Quick Onboard
                  </Link>
                </div>
              </div>

              {/* Persona 4: Platform Admin */}
              <div className="card card-interactive" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderTop: "3px solid #0f172a" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "1.75rem" }}>🛡️</span>
                    <span className="badge badge-neutral">Governance</span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.25rem" }}>
                    Platform Admin
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--slate-700)", fontWeight: 600, marginBottom: "0.75rem" }}>
                    EPR &amp; Anomaly Engine
                  </div>
                  <p style={{ fontSize: "0.825rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "1rem" }}>
                    Audit recycler environmental permits, flag 2x/3x price disparities, investigate 40% weight mismatches, and export datasets.
                  </p>
                  <div style={{ padding: "0.5rem 0.65rem", backgroundColor: "var(--slate-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--slate-200)", fontSize: "0.75rem", color: "var(--slate-600)", marginBottom: "1rem" }}>
                    <div><strong>Demo:</strong> <code>9999999999</code></div>
                    <div><strong>Pass:</strong> <code>admin123</code></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <Link href="/admin" className="btn btn-sm btn-secondary btn-block">
                    Admin Dashboard &rarr;
                  </Link>
                  <Link href="/admin/anomalies" className="btn btn-sm btn-secondary btn-block">
                    M3: Anomaly Alerts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Spot Scrap Rates Table */}
        <section style={{ padding: "3rem 1rem", backgroundColor: "#ffffff", borderTop: "1px solid var(--slate-200)", borderBottom: "1px solid var(--slate-200)" }}>
          <div className="container" style={{ maxWidth: "1000px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: "0.4rem" }}>Live Reference</span>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)" }}>
                  आज के भाव &bull; Standard E-Waste Spot Rates
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--slate-500)" }}>
                  Ground-truthed buying prices per kilogram in Mumbai metropolitan scrap yards.
                </p>
              </div>
              <Link href="/collector/prices" className="btn btn-sm btn-primary">
                Open Price Calculator &rarr;
              </Link>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Material Category</th>
                    <th>Code</th>
                    <th>Hindi / Marathi</th>
                    <th>Reference Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.code}>
                      <td>
                        <strong style={{ color: "var(--slate-900)" }}>{cat.name}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: "0.8rem", padding: "0.15rem 0.35rem", backgroundColor: "var(--slate-100)", borderRadius: "4px" }}>
                          {cat.code}
                        </code>
                      </td>
                      <td style={{ color: "var(--slate-600)" }}>{cat.hindi}</td>
                      <td>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary-800)" }}>
                          {cat.rate}
                        </span>
                      </td>
                      <td>
                        {cat.hazard ? (
                          <span className="badge badge-danger">⚠️ Hazardous Waste</span>
                        ) : (
                          <span className="badge badge-success">✓ Non-Hazardous</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4 Core Health & Safety Directives */}
        <section style={{ padding: "3.5rem 1rem" }}>
          <div className="container" style={{ maxWidth: "1000px" }}>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <span className="badge badge-danger" style={{ marginBottom: "0.4rem" }}>Worker Health</span>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)" }}>
                4 Core Safety Directives (सुरक्षा नियम)
              </h2>
              <p style={{ color: "var(--slate-500)", fontSize: "0.95rem", marginTop: "0.35rem" }}>
                Mandatory informal sector health warnings in Hindi, Marathi, and English.
              </p>
            </div>

            <div className="grid-2">
              {safetyDirectives.map((sd) => (
                <div key={sd.subtitle} className="card" style={{ borderLeft: "4px solid var(--danger)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--slate-900)" }}>
                        {sd.title}
                      </h3>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--slate-500)" }}>
                        {sd.subtitle}
                      </div>
                    </div>
                    <span className="badge badge-danger">{sd.badge}</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--slate-600)", lineHeight: 1.55 }}>
                    {sd.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Professional Civic-Tech Footer */}
      <footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid var(--slate-200)", padding: "2.5rem 1rem 2rem", fontSize: "0.825rem", color: "var(--slate-500)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--slate-800)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>♻️</span> KABADI WALA PLATFORM
            </div>
            <div>
              Digital formalization for circular e-waste supply chains &bull; Built in accordance with EPR Regulations.
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            <Link href="/collector" className="nav-link">Collector</Link>
            <Link href="/recycler" className="nav-link">Recycler</Link>
            <Link href="/field" className="nav-link">Field Agent</Link>
            <Link href="/admin" className="nav-link">Admin</Link>
            <Link href="/api/v1/health" className="nav-link" target="_blank">API Health</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
