import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { agentUpdatePickupStatusAction, agentCompleteDoorstepHandoverAction } from "../actions";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { kg, rupees } from "@/lib/format";
import { firstPositiveRate } from "@/lib/domain/money";

export default async function FieldPickupsPage(props: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  const pickups = await prisma.pickupRequest.findMany({
    orderBy: { slot: "desc" },
    include: {
      lot: {
        include: {
          category: true,
          collector: { select: { shortCode: true, operatingArea: true, district: true } },
          transaction: true,
        },
      },
      collector: { select: { phone: true } },
      recycler: { select: { name: true, contactPhone: true, address: true } },
    },
  });

  const activePickups = pickups.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
  const completedPickups = pickups.filter((p) => p.status === "COMPLETED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/field" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
            &larr;
          </Link>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
              🚚 Doorstep Pickups &amp; Cash Handover (घर से उठाव व नकद भुगतान)
            </h1>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Visit collectors with portable scale, weigh on-site, disburse cash, and transport scrap back to recycler.
            </div>
          </div>
        </div>

        {/* F4 Audio Speaker */}
        <VoiceSpeaker screenKey="F4_PICKUPS" size="md" />
      </div>

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

      {/* Workflow Explanation Banner */}
      <div
        style={{
          padding: "1rem 1.25rem",
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          fontSize: "0.85rem",
          color: "#1e40af",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <strong>🛵 How Doorstep Collection Works:</strong>
        <div>1. Tap <strong>&quot;Start Trip&quot;</strong> when departing with vehicle &amp; scale &rarr; Collector gets SMS alert.</div>
        <div>2. Tap <strong>&quot;I Have Reached&quot;</strong> upon arrival at collector&apos;s shack/location.</div>
        <div>3. Weigh on portable scale, verify 4-digit code, hand over cash immediately.</div>
        <div>4. Load e-waste onto your vehicle and transport it back to the authorized recycling facility!</div>
      </div>

      {/* Active Pickups */}
      <div className="card">
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem", color: "#0f172a" }}>
          Active Doorstep Pickup Requests ({activePickups.length})
        </h2>

        {activePickups.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ fontWeight: 600 }}>No pending pickup tasks right now.</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              New collection requests from nearby collectors will appear here automatically.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {activePickups.map((p) => {
              const lot = p.lot;
              const ratePaise = firstPositiveRate(lot.transaction?.agreedRatePaise, lot.transaction?.quotedRatePerKgPaise, lot.quotedRatePaise);
              const rateRupees = ratePaise === null ? "not available" : rupees(ratePaise);

              return (
                <div
                  key={p.id}
                  style={{
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "2px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>
                          Lot {lot.lotRef}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              p.status === "ARRIVED" ? "#fef08a" : p.status === "ON_THE_WAY" ? "#bfdbfe" : "#e2e8f0",
                            color:
                              p.status === "ARRIVED" ? "#854d0e" : p.status === "ON_THE_WAY" ? "#1e40af" : "#334155",
                            fontWeight: 700,
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "0.2rem" }}>
                        <strong>Material:</strong> {lot.category.nameEn} &bull; <strong>Est. Weight:</strong> {kg(lot.approxWeightGrams)} kg &bull; <strong>Rate:</strong> {ratePaise === null ? "price not available" : `₹${rateRupees}/kg`}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Delivering to:</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#047857" }}>🏭 {p.recycler.name}</div>
                    </div>
                  </div>

                  {/* Collector Info Box */}
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      📍 <strong>Location:</strong> {lot.collector.operatingArea || "Dharavi"}, {lot.collector.district || "Mumbai"}
                    </div>
                    <div>
                      📞 <strong>Collector Phone:</strong> <a href={`tel:${p.collector.phone}`} style={{ fontWeight: 700, color: "#2563eb" }}>{p.collector.phone}</a> (#{lot.collector.shortCode})
                    </div>
                  </div>

                  {/* Step Actions */}
                  <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.75rem" }}>
                    {p.status === "REQUESTED" || p.status === "ACCEPTED" ? (
                      <form action={agentUpdatePickupStatusAction} style={{ display: "inline-block" }}>
                        <input type="hidden" name="requestId" value={p.id} />
                        <input type="hidden" name="status" value="ON_THE_WAY" />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ backgroundColor: "#2563eb", padding: "0.6rem 1.2rem", fontWeight: 700 }}
                        >
                          🚚 Start Trip to Collector (रास्ते में है) &rarr;
                        </button>
                      </form>
                    ) : p.status === "ON_THE_WAY" ? (
                      <form action={agentUpdatePickupStatusAction} style={{ display: "inline-block" }}>
                        <input type="hidden" name="requestId" value={p.id} />
                        <input type="hidden" name="status" value="ARRIVED" />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ backgroundColor: "#d97706", padding: "0.6rem 1.2rem", fontWeight: 700 }}
                        >
                          📍 I Have Reached Collector (पहुंच गया) &rarr;
                        </button>
                      </form>
                    ) : (
                      /* Status is ARRIVED: Scale Weighing & Cash Handover Form */
                      <form
                        action={agentCompleteDoorstepHandoverAction}
                        style={{
                          backgroundColor: "#f0fdf4",
                          padding: "1rem",
                          borderRadius: "10px",
                          border: "1px solid #bbf7d0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        <input type="hidden" name="requestId" value={p.id} />

                        <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.95rem" }}>
                          ⚖️ On-Site Scale Weighing &amp; Cash Handover:
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>
                              Portable Scale Weight (kg) *
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              name="scaleWeightKg"
                              defaultValue={kg(lot.approxWeightGrams)}
                              required
                              className="input"
                              style={{ padding: "0.5rem", fontSize: "0.95rem", fontWeight: 700 }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>
                              Collector 4-Digit Code
                            </label>
                            <input
                              type="text"
                              name="verificationCode"
                              maxLength={4}
                              placeholder="e.g. 1234"
                              className="input"
                              style={{ padding: "0.5rem", fontSize: "0.95rem", textAlign: "center", letterSpacing: "0.15rem" }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>
                              Payment Mode
                            </label>
                            <select name="paymentMode" className="input" defaultValue="CASH" style={{ padding: "0.5rem" }}>
                              <option value="CASH">💵 Cash (नकद)</option>
                              <option value="UPI">📱 UPI QR</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{
                            backgroundColor: "#059669",
                            padding: "0.75rem",
                            fontSize: "1rem",
                            fontWeight: 800,
                            width: "100%",
                            marginTop: "0.25rem",
                          }}
                        >
                          💰 Disburse Cash &amp; Load Scrap to Vehicle &rarr;
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Pickups Archive */}
      {completedPickups.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", color: "#475569" }}>
            Completed &amp; Transported Lots ({completedPickups.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {completedPickups.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <strong>{p.lot.lotRef}</strong> &bull; {p.lot.category.nameEn} ({kg(p.lot.approxWeightGrams)} kg)
                </div>
                <div style={{ color: "#059669", fontWeight: 700 }}>
                  ✓ Paid &amp; Delivered to {p.recycler.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

