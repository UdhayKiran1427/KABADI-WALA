import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { confirmHandoverAction } from "../actions";
import { kg } from "@/lib/format";
import { verifyEnteredHandoverCode } from "@/lib/domain/handover";

export default async function VerifyHandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; error?: string }>;
}) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;
  const { query, error } = await searchParams;

  let lot: any = null;
  let handover: any = null;

  if (query) {
    const cleanQuery = query.trim();
    const include = { category: true, images: true, handovers: true, collector: true, transaction: true } as const;
    // A recycler only ever sees lots that were handed to its own facility.
    lot = await prisma.lot.findFirst({
      where: {
        chosenRecyclerId: recyclerId,
        OR: [{ id: cleanQuery }, { lotRef: cleanQuery }, { handovers: { some: { handoverRef: cleanQuery } } }],
      },
      include,
    });

    if (!lot && /^\d{4}$/.test(cleanQuery)) {
      // Phone handovers store only a salted hash of the code, so a bare 4-digit code is matched by hashing it
      // against this facility's open handovers (legacy plain codes are still honoured).
      const open = await prisma.handover.findMany({
        where: { status: "PENDING", lot: { chosenRecyclerId: recyclerId } },
        orderBy: { capturedAt: "desc" },
        take: 200,
      });
      const match = open.find((h) => verifyEnteredHandoverCode(h, cleanQuery));
      if (match) {
        lot = await prisma.lot.findFirst({ where: { id: match.lotId, chosenRecyclerId: recyclerId }, include });
        handover = lot?.handovers.find((h: any) => h.id === match.id) ?? null;
      }
    }

    if (lot && !handover && lot.handovers.length > 0) {
      handover = lot.handovers.find((h: any) => h.handoverRef === cleanQuery) ?? lot.handovers[0];
    }
  }

  // Fetch recent confirmed handovers for facility right sidebar
  const recentHandovers = await prisma.handover.findMany({
    where: {
      confirmedById: dbUser.id,
      status: "CONFIRMED",
    },
    take: 4,
    orderBy: { recyclerConfirmedAt: "desc" },
    include: {
      lot: { include: { category: true, collector: true } },
    },
  });

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
              Verify Handover
            </h1>
          </div>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Scan collector QR code, verify 4-digit code, confirm scale weight, and record instant settlement.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className="badge badge-success">SPCB Form 6 Automated</span>
        </div>
      </div>

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Main Verification Console */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Quick Search Card */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--slate-900)" }}>
              Lookup Handover Lot
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.825rem", marginBottom: "1rem" }}>
              Enter the 4-digit collector code (e.g. <code>4821</code>), Lot Reference (e.g. <code>LOT-KW01-...</code>), or scan the digital pass QR.
            </p>

            <form method="GET" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="text"
                name="query"
                defaultValue={query || ""}
                placeholder="Enter 4-digit code or Lot Ref"
                className="form-control"
                style={{ flex: 1, minWidth: "220px", fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                required
              />
              <button type="submit" className="btn btn-primary btn-lg" style={{ whiteSpace: "nowrap" }}>
                Search Gate Lot
              </button>
            </form>

            {query && !lot && (
              <div className="alert alert-danger" style={{ marginTop: "1rem" }}>
                No scrap lot found matching &ldquo;{query}&rdquo;. Confirm the collector has selected your facility and generated a handover pass.
              </div>
            )}
          </div>

          {/* Active Lot Inwarding Card */}
          {lot && (
            <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid var(--primary)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--slate-200)",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)" }}>
                      {lot.lotRef}
                    </h2>
                    <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                      Status: {lot.status}
                    </span>
                  </div>
                  <div style={{ color: "var(--slate-600)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    Category: <strong>{lot.category.nameEn} ({lot.category.nameHi})</strong> &bull; Condition: <strong>{lot.condition}</strong>
                  </div>
                  <div style={{ color: "var(--slate-500)", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                    Collector: #{lot.collector.shortCode} &bull; Area: {lot.collector.operatingArea} &bull; Phone: {lot.collector.userId ? "Registered" : "Anonymous"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", maxWidth: "14rem" }}>
                    Ask the collector to read out the 4-digit code. It is checked when you confirm.
                  </div>
                  <div style={{ marginTop: "0.35rem" }}>
                    <span className={`badge ${handover?.locationClass === "MATCH" ? "badge-success" : handover?.locationClass === "NEAR" ? "badge-warning" : "badge-neutral"}`} style={{ fontSize: "0.7rem" }}>
                      GPS: {handover?.locationClass || "VERIFIED"} ({handover?.distanceToRecyclerMeters !== null && handover?.distanceToRecyclerMeters !== undefined ? `${handover.distanceToRecyclerMeters}m` : "Gate Proximity"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Photos Preview */}
              {lot.images && lot.images.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Ground Collection Photos ({lot.images.length})
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                    {lot.images.map((img: any) => (
                      <div
                        key={img.id}
                        style={{
                          border: "1px solid var(--slate-200)",
                          borderRadius: "10px",
                          overflow: "hidden",
                          minWidth: "120px",
                          height: "120px",
                          background: "var(--slate-100)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {img.storageKey ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={`/api/v1/uploads/local?key=${encodeURIComponent(img.storageKey)}`}
                            alt="Lot sample"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>Photo</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scale Weighing & Confirmation Form */}
              <form action={confirmHandoverAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <input type="hidden" name="lotId" value={lot.id} />
                <input type="hidden" name="handoverId" value={handover?.id || ""} />
                <input type="hidden" name="query" value={query || ""} />

                {error === "no_rate" && (
                  <div className="alert alert-danger">No rate was locked for this lot, so the amount cannot be calculated. Ask the collector to choose the recycler again.</div>
                )}
                {error === "code" && (
                  <div className="alert alert-danger">That code does not match this handover. Ask the collector to read it again.</div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="verificationCode" style={{ fontWeight: 700 }}>
                    Collector&apos;s 4-digit code
                  </label>
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    autoComplete="off"
                    className="form-control"
                    placeholder="4821"
                    required
                  />
                </div>

                <div
                  style={{
                    backgroundColor: "var(--slate-50)",
                    border: "1px solid var(--slate-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>Collector Declared Weight:</span>
                    <strong style={{ fontSize: "1rem", color: "var(--slate-800)" }}>
                      {kg(lot.approxWeightGrams, 2)} kg
                    </strong>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="confirmedWeightKg" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      Weighbridge Scale Confirmed Weight (kg) *
                    </label>
                    <input
                      id="confirmedWeightKg"
                      name="confirmedWeightKg"
                      type="number"
                      step="0.01"
                      defaultValue={kg(lot.approxWeightGrams, 2)}
                      className="form-control"
                      style={{ fontSize: "1.35rem", fontWeight: 800, padding: "0.6rem 0.85rem", color: "var(--slate-900)" }}
                      required
                    />
                    <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem" }}>
                      Rule: Variance within &plusmn;5% auto-accepted. Variance &ge;25% is flagged for review.
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="downstreamStatus" style={{ fontWeight: 700 }}>
                    Traceability Downstream Status *
                  </label>
                  <select id="downstreamStatus" name="downstreamStatus" className="form-control" defaultValue="RECEIVED">
                    <option value="RECEIVED">RECEIVED (In facility warehouse / quarantine)</option>
                    <option value="SENT_TO_PROCESSING">SENT_TO_PROCESSING (Dispatched to sorting &amp; dismantling line)</option>
                    <option value="PROCESSED">PROCESSED (Recovered secondary raw materials sent to certified smelter)</option>
                  </select>
                </div>

                {/* Instant Settlement Section */}
                <div
                  style={{
                    border: "1.5px solid var(--primary-border)",
                    backgroundColor: "var(--primary-50)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
                    <input
                      type="checkbox"
                      id="markPaid"
                      name="markPaid"
                      value="true"
                      defaultChecked
                      style={{ width: "18px", height: "18px" }}
                    />
                    <label htmlFor="markPaid" style={{ fontWeight: 700, color: "var(--primary-900)", cursor: "pointer", fontSize: "0.95rem" }}>
                      Mark lot as Paid immediately at counter
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label className="form-label" htmlFor="paymentMethod" style={{ fontSize: "0.825rem", fontWeight: 600 }}>
                        Payment Method
                      </label>
                      <select id="paymentMethod" name="paymentMethod" className="form-control" defaultValue="CASH">
                        <option value="CASH">Cash (Handed over at counter)</option>
                        <option value="UPI">UPI Transfer / Scan QR</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="upiRef" style={{ fontSize: "0.825rem", fontWeight: 600 }}>
                        Transaction Ref / UTR (optional)
                      </label>
                      <input id="upiRef" name="upiRef" type="text" className="form-control" placeholder="e.g. UTR-98214" />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="disputeReason" style={{ fontSize: "0.825rem", color: "var(--slate-600)" }}>
                    Dispute Reason (Only if rejecting weight, non-electronic contaminants, or battery hazard)
                  </label>
                  <input
                    id="disputeReason"
                    name="disputeReason"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Non-electronic ballast or mixed hazardous materials detected"
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    name="actionType"
                    value="CONFIRM"
                    className="btn btn-primary btn-lg"
                    style={{ flex: 2, padding: "0.85rem" }}
                  >
                    Confirm Scale Weight &amp; Complete Handover
                  </button>
                  <button
                    type="submit"
                    name="actionType"
                    value="DISPUTE"
                    className="btn btn-danger"
                    style={{ flex: 1, padding: "0.85rem" }}
                  >
                    Dispute Lot
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Facility Gate Operations & Compliance Guide (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Gate Verification SOP Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.75rem" }}>
              Gate Verification SOP
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>1️⃣</span>
                <span><strong>Ask for 4-Digit Code:</strong> Enter collector PIN to pull verified lot reference.</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>2️⃣</span>
                <span><strong>Gross Weighing:</strong> Zero digital scale before placing bags or crates.</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>3️⃣</span>
                <span><strong>Hazard Inspection:</strong> Separate bulging Li-ion cells or broken lead glass.</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>4️⃣</span>
                <span><strong>Handover Settlement:</strong> Hand over exact cash/UPI and issue digital SMS receipt.</span>
              </div>
            </div>
          </div>

          {/* Recent Handovers List */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)" }}>
                Recent Scale Handovers
              </h3>
              <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>Today</span>
            </div>

            {recentHandovers.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", textAlign: "center", padding: "1.25rem 0" }}>
                No completed handovers today yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {recentHandovers.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: "0.6rem 0.75rem",
                      backgroundColor: "var(--slate-50)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--slate-200)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "var(--slate-900)" }}>{h.lot.lotRef}</strong>
                      <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>
                        {((h.confirmedWeightGrams || 0) / 1000).toFixed(1)} kg
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--slate-500)", marginTop: "0.25rem", fontSize: "0.75rem" }}>
                      <span>{h.lot.category.nameEn}</span>
                      <span>{h.recyclerConfirmedAt ? new Date(h.recyclerConfirmedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SPCB Form 6 Regulatory Notice */}
          <div
            className="card"
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--slate-50)",
              border: "1px solid var(--slate-200)",
            }}
          >
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.5rem" }}>
              SPCB Form 6 Audit Record
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              Every completed gate handover automatically generates a signed electronic manifest conforming to E-Waste Management Rules 2022. Weights feed straight to your facility quarterly return log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
