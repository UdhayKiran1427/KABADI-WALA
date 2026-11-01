import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { saveRatesAction } from "../actions";

export default async function RateManagerPage() {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;

  if (!recyclerId) {
    return <div>No facility assigned</div>;
  }

  const facility = await prisma.recycler.findUnique({
    where: { id: recyclerId },
    include: {
      rates: { where: { isCurrent: true } },
    },
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const categories = await prisma.materialCategory.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  const rateMap = new Map<number, number>();
  for (const r of facility.rates) {
    rateMap.set(r.categoryId, r.ratePerKgPaise);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--slate-200)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link href="/recycler" style={{ color: "var(--slate-500)", textDecoration: "none" }}>
              &larr; Dashboard
            </Link>
            <span style={{ color: "var(--slate-300)" }}>/</span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Buying Rates
            </h1>
          </div>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Set your facility&apos;s buying rates per material and doorstep collection parameters. Published live to collectors.
          </p>
        </div>

        <span className="badge badge-success">Live on Picker Mobile App</span>
      </div>

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Rates Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <form action={saveRatesAction} className="card" style={{ padding: "1.5rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--slate-900)" }}>
                    Material Buying Rates (₹ / kg)
                  </h2>
                  <div style={{ fontSize: "0.775rem", color: "var(--slate-500)" }}>
                    Updated prices take effect immediately for new incoming collector lots
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Material Category</th>
                      <th>Material Code</th>
                      <th>Hazard Level</th>
                      <th style={{ width: "160px" }}>Your Rate (₹/kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const currentPaise = rateMap.get(cat.id) || 0;
                      const currentRupees = (currentPaise / 100).toFixed(0);
                      return (
                        <tr key={cat.id}>
                          <td>
                            <strong>{cat.nameEn}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                              {cat.nameHi} &bull; {cat.nameMr}
                            </div>
                          </td>
                          <td><code>{cat.code}</code></td>
                          <td>
                            {cat.isHazardous ? (
                              <span className="badge badge-danger" style={{ fontSize: "0.7rem" }}>Hazardous</span>
                            ) : (
                              <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>General</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <span style={{ fontWeight: 700, color: "var(--slate-600)" }}>₹</span>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                name={`rate_${cat.id}`}
                                defaultValue={currentRupees}
                                className="form-control"
                                style={{ width: "95px", fontWeight: 800, padding: "0.4rem 0.5rem" }}
                                required
                              />
                              <span style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>/kg</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Doorstep Pickup Settings */}
            <div
              style={{
                background: "var(--slate-50)",
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--slate-200)",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.75rem" }}>
                Doorstep Collection Service Settings
              </h2>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    name="pickupAvailable"
                    defaultChecked={facility.pickupAvailable}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Provide doorstep vehicle pickup for bulky collector lots</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label" htmlFor="minimumWeightKg" style={{ fontSize: "0.825rem", fontWeight: 600 }}>
                    Minimum Lot Weight for Pickup (kg)
                  </label>
                  <input
                    id="minimumWeightKg"
                    name="minimumWeightKg"
                    type="number"
                    step="0.5"
                    defaultValue={(facility.minimumWeightGrams / 1000).toFixed(1)}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="pickupChargeRupees" style={{ fontSize: "0.825rem", fontWeight: 600 }}>
                    Pickup Charge (₹, 0 for Free Collection)
                  </label>
                  <input
                    id="pickupChargeRupees"
                    name="pickupChargeRupees"
                    type="number"
                    step="1"
                    defaultValue={(facility.pickupChargePaise / 100).toFixed(0)}
                    className="form-control"
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ padding: "0.85rem" }}>
              Save Rates &amp; Publish to Picker App
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Market Intelligence & Pricing Strategy (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Rate Publishing Policy Card */}
          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.5rem" }}>
              Pricing Strategy &amp; Picker Trust
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--slate-600)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
              Scrap pickers prefer facilities offering transparent, guaranteed rates over volatile informal middlemen. Offering &plusmn;5% above local middleman rates increases your direct facility volume by over 40%.
            </p>
            <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
              Rates set here are guaranteed for matched lots at gate arrival within 24 hours.
            </div>
          </div>

          {/* Pricing Bands Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.75rem" }}>
              Mumbai Regional Benchmark Bands
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--slate-100)" }}>
                <span>Printed Circuit Boards (PCB)</span>
                <strong>₹280 – ₹420 /kg</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--slate-100)" }}>
                <span>Mobile Phones &amp; Telecom</span>
                <strong>₹350 – ₹550 /kg</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--slate-100)" }}>
                <span>Copper Cable Scrap</span>
                <strong>₹600 – ₹780 /kg</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--slate-100)" }}>
                <span>Lithium-ion Batteries</span>
                <strong>₹120 – ₹200 /kg</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0" }}>
                <span>CRTs &amp; Display Glass</span>
                <strong>₹15 – ₹35 /kg</strong>
              </div>
            </div>
          </div>

          {/* CPCB Price Floor Compliance */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              CPCB Floor Price Governance
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              Rate submissions below 35% of the 7-day municipal median are flagged for predatory pricing review to safeguard informal waste picker livelihoods.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
