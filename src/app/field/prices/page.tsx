import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logMarketPriceAction } from "../actions";
import { CoordinateInputs } from "../../admin/recyclers/CoordinateInputs";
import { rupees } from "@/lib/format";

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
    take: 8,
    include: {
      category: true,
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          href="/field"
          className="btn btn-secondary btn-sm"
          style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
        >
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
            F2: Log Scrap Dealer Market Price &bull; Spot Intelligence
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
            कबाड़ी दुकान ग्राउंड मार्केट भाव &bull; Ground Observation Feed for Valuation Engine
          </div>
        </div>
      </div>

      {searchParams.success && (
        <div className="alert alert-success">
          ✓ {searchParams.success}
        </div>
      )}

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Price Entry Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <form
            action={logMarketPriceAction}
            className="card"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--slate-900)" }}>
              Record Local Scrap Yard Rate
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Material Category *
                </label>
                <select name="categoryId" className="form-control" style={{ padding: "0.75rem" }} required>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameHi} ({cat.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
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
                  className="form-control"
                  style={{ padding: "0.75rem", fontSize: "1.2rem", fontWeight: 800, color: "var(--slate-900)" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Scrap Yard / Ward Area *
                </label>
                <input
                  type="text"
                  name="area"
                  defaultValue="Dharavi 13th Compound"
                  required
                  className="form-control"
                  style={{ padding: "0.75rem" }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  District *
                </label>
                <input
                  type="text"
                  name="district"
                  defaultValue="Mumbai"
                  required
                  className="form-control"
                  style={{ padding: "0.75rem" }}
                />
              </div>
            </div>

            <CoordinateInputs
              defaultLatitude="19.0434"
              defaultLongitude="72.8567"
              label="Spot Observation GPS (Latitude, Longitude)"
              helpText="Tap 'Use my location' on-site to auto-tag dealer coordinates for accurate valuation analytics."
              required={false}
            />

            <input type="hidden" name="buyerType" value="SCRAP_DEALER" />

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ padding: "0.85rem", backgroundColor: "#4f46e5" }}
            >
              ✓ Log Spot Rate to Price Engine &rarr;
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Recent Market Logs Table & Audit Impact (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Recent Ground Spot Prices Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)" }}>
                🕒 Recent Ground Spot Rates
              </h3>
              <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>Field Feeds</span>
            </div>

            {recentSpotPrices.length === 0 ? (
              <div style={{ color: "var(--slate-500)", fontSize: "0.825rem", textAlign: "center", padding: "1.5rem" }}>
                No spot prices logged yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Rate (₹/kg)</th>
                      <th>Area</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSpotPrices.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.category.nameHi}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>{p.category.nameEn}</div>
                        </td>
                        <td>
                          <strong style={{ color: "var(--primary-800)", fontSize: "0.95rem" }}>
                            ₹{rupees(p.buyingPricePaise)}
                          </strong>
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>{p.area}</td>
                        <td style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                          {new Date(p.recordedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pricing Engine Rule Notice */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              📊 How Ground Data Protects Pickers
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              Your field survey logs compute the real-time median price baseline. If an authorized recycler sets a quote below 35% of this ground median, Module M3 alerts administrators immediately to prevent predatory margin clipping.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
