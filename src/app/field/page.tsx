import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function FieldAgentDashboardPage(props: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { user } = await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  // Counts
  const collectorCount = await prisma.collector.count();
  const spotPriceCount = await prisma.pricePoint.count({ where: { source: "FIELD_AGENT" } });
  const trainingSampleCount = await prisma.trainingSample.count();

  // Recent onboarded collectors
  const recentCollectors = await prisma.collector.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { phone: true } },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {searchParams.success && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            borderRadius: "10px",
            border: "1px solid #a7f3d0",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
          color: "#ffffff",
          padding: "1.5rem",
          borderRadius: "16px",
          boxShadow: "0 4px 15px rgba(30, 64, 175, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.05rem" }}>
              Field Operations Console
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.2rem" }}>
              Ground Agent Tools (F1–F3)
            </h1>
            <p style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: "0.25rem", maxWidth: "550px" }}>
              Onboard informal scrap pickers, log scrap dealer spot market rates, and collect labeled photos for the computer vision classifier.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Collectors</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{collectorCount}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Spot Rates</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{spotPriceCount}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "0.5rem 1rem", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>AI Samples</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{trainingSampleCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Tools Grid (F1-F3) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {/* F1 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              F1: Onboard Collector
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1rem" }}>
              Quickly register informal scrap collectors with zero identity documents. Generates instant 4-digit PIN and shortCode.
            </p>
          </div>
          <Link href="/field/onboard" className="btn btn-primary" style={{ textAlign: "center", backgroundColor: "#2563eb" }}>
            Open Onboarding Form &rarr;
          </Link>
        </div>

        {/* F2 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏷️</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              F2: Log Spot Prices
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1rem" }}>
              Record spot buying prices at local kabadi dukaan / scrap dealers. Feeds the 30-day median pricing board.
            </p>
          </div>
          <Link href="/field/prices" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Log Market Price &rarr;
          </Link>
        </div>

        {/* F3 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📷</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              F3: Training Photos
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", marginBottom: "1rem" }}>
              Capture and label e-waste photos (PCBs, batteries, cables, CRT) to train the AI image classifier.
            </p>
          </div>
          <Link href="/field/training" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Capture Labeled Photo &rarr;
          </Link>
        </div>
      </div>

      {/* Recent Onboarded Collectors */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>हाल ही में ऑनबोर्ड किए गए कलेक्टर / Recent Collectors</h2>
          <Link href="/field/onboard" style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>
            + Onboard New
          </Link>
        </div>

        {recentCollectors.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
            No collectors onboarded yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Short Code</th>
                  <th>Mobile Phone</th>
                  <th>Area</th>
                  <th>District</th>
                  <th>Language</th>
                  <th>Onboarded At</th>
                </tr>
              </thead>
              <tbody>
                {recentCollectors.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="badge" style={{ backgroundColor: "#e0f2fe", color: "#0369a1", fontWeight: 700 }}>
                        {c.shortCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.user.phone}</td>
                    <td>{c.operatingArea}</td>
                    <td>{c.district || "Mumbai"}</td>
                    <td>{c.preferredLanguage}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

