import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logMarketPriceAction } from "../actions";

export default async function LogMarketPricePage(props: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  const recentSpotPrices = await prisma.pricePoint.findMany({
    where: { source: "FIELD_AGENT" },
    orderBy: { recordedAt: "desc" },
    take: 10,
    include: {
      category: true,
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/field" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            F2: Log Scrap Dealer Market Price
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>कबाड़ी दुकान ग्राउंड मार्केट भाव</div>
        </div>
      </div>

      {searchParams.success && (
        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            borderRadius: "10px",
            border: "1px solid #a7f3d0",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontSize: "0.85rem",
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* Form */}
      <form
        action={logMarketPriceAction}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Material Category *
            </label>
            <select name="categoryId" className="input" style={{ padding: "0.75rem" }} required>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameHi} ({cat.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Buying Price (₹ / kg) *
            </label>
            <input
              type="number"
              step="1"
              min="1"
              name="buyingPriceRupees"
              defaultValue="340"
              required
              placeholder="e.g. 340"
              className="input"
              style={{ padding: "0.75rem", fontSize: "1.1rem", fontWeight: 700 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Scrap Yard / Area *
            </label>
            <input
              type="text"
              name="area"
              defaultValue="Dharavi 13th Compound"
              required
              className="input"
              style={{ padding: "0.75rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              District *
            </label>
            <input
              type="text"
              name="district"
              defaultValue="Mumbai"
              required
              className="input"
              style={{ padding: "0.75rem" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              GPS Latitude
            </label>
            <input
              type="number"
              step="any"
              name="latitude"
              defaultValue="19.0434"
              className="input"
              style={{ padding: "0.75rem", color: "#64748b" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              GPS Longitude
            </label>
            <input
              type="number"
              step="any"
              name="longitude"
              defaultValue="72.8567"
              className="input"
              style={{ padding: "0.75rem", color: "#64748b" }}
            />
          </div>
        </div>

        <input type="hidden" name="buyerType" value="SCRAP_DEALER" />

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: "0.875rem",
            fontSize: "1.05rem",
            fontWeight: 800,
            borderRadius: "10px",
            backgroundColor: "#2563eb",
          }}
        >
          Log Spot Rate to Pricing Engine &rarr;
        </button>
      </form>

      {/* Recent Logged Spot Prices */}
      <div className="card">
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          हाल के ग्राउंड मार्केट भाव / Recently Logged Spot Rates
        </h2>

        {recentSpotPrices.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
            No spot prices logged yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Rate (₹/kg)</th>
                  <th>Area</th>
                  <th>District</th>
                  <th>Logged Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSpotPrices.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.category.nameHi} ({p.category.nameEn})</td>
                    <td style={{ fontWeight: 800, color: "#065f46", fontSize: "0.95rem" }}>
                      ₹{(p.buyingPricePaise / 100).toFixed(0)}
                    </td>
                    <td>{p.area}</td>
                    <td>{p.district}</td>
                    <td>{new Date(p.recordedAt).toLocaleDateString()}</td>
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

