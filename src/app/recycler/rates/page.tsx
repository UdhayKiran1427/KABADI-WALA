import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
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
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>R3 Rate Manager</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Set your facility&apos;s buying rates per material and doorstep collection parameters.
            </p>
          </div>
          <span className="badge badge-success">Live on Mobile Board</span>
        </div>

        <form action={saveRatesAction}>
          {/* Material Rates Table */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Material Buying Rates (₹/kg)</h2>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Material Code</th>
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
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{cat.nameHi} &bull; {cat.nameMr}</div>
                        </td>
                        <td><code>{cat.code}</code></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <span>₹</span>
                            <input
                              type="number"
                              step="1"
                              name={`rate_${cat.id}`}
                              defaultValue={currentRupees}
                              className="form-control"
                              style={{ width: "100px", fontWeight: 600 }}
                              required
                            />
                            <span>/kg</span>
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
          <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Doorstep Collection Service</h2>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="pickupAvailable"
                  defaultChecked={facility.pickupAvailable}
                />
                Provide doorstep pickup for collectors
              </label>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" htmlFor="minimumWeightKg">Minimum Lot Weight (kg)</label>
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
              <div style={{ flex: 1 }}>
                <label className="form-label" htmlFor="pickupChargeRupees">Pickup Charge (₹, 0 for Free)</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            Save Rates &amp; Service Settings
          </button>
        </form>
      </div>
    </div>
  );
}

