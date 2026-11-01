import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { confirmHandoverAction } from "../actions";

export default async function VerifyHandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId;
  const { query } = await searchParams;

  let lot: any = null;
  let handover: any = null;

  if (query) {
    const cleanQuery = query.trim();
    // Search by lotRef, lot ID, handoverRef, or 4-digit verificationCode
    lot = await prisma.lot.findFirst({
      where: {
        OR: [
          { id: cleanQuery },
          { lotRef: cleanQuery },
          { handovers: { some: { handoverRef: cleanQuery } } },
          { handovers: { some: { verificationCode: cleanQuery } } },
        ],
      },
      include: {
        category: true,
        images: true,
        handovers: true,
        collector: true,
        transaction: true,
      },
    });

    if (lot && lot.handovers.length > 0) {
      handover = lot.handovers[0];
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>R2 Verify Handover</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          Scan collector QR code, enter 4-digit verification PIN, or search by Lot ID.
        </p>

        {/* Search Bar */}
        <form method="GET" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <input
            type="text"
            name="query"
            defaultValue={query || ""}
            placeholder="Scan QR, enter Lot ID (e.g. LOT-AB12-...), or 4-digit code"
            className="form-control"
            required
          />
          <button type="submit" className="btn btn-primary">
            Lookup
          </button>
        </form>

        {query && !lot && (
          <div className="alert alert-danger">
            No lot found matching &ldquo;{query}&rdquo;. Ensure the collector has synced their offline handover record.
          </div>
        )}

        {lot && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "1rem", borderBottom: "1px solid var(--border)", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{lot.lotRef}</h2>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Material: <strong>{lot.category.nameEn} ({lot.category.nameHi})</strong> &bull; Condition: {lot.condition}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Collector Area: {lot.collector.operatingArea} &bull; Collected: {new Date(lot.collectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`badge ${handover?.locationClass === "MATCH" ? "badge-success" : handover?.locationClass === "NEAR" ? "badge-warning" : "badge-danger"}`}>
                  GPS: {handover?.locationClass || "PENDING"} ({handover?.distanceToRecyclerMeters !== null && handover?.distanceToRecyclerMeters !== undefined ? `${handover.distanceToRecyclerMeters}m` : "No GPS"})
                </span>
                <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  4-Digit Code: <strong>{handover?.verificationCode || "----"}</strong>
                </div>
              </div>
            </div>

            {/* Photos Preview */}
            {lot.images.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Collection &amp; Handover Photos</label>
                <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto" }}>
                  {lot.images.map((img: any) => (
                    <div key={img.id} style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", minWidth: "120px", height: "120px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>📷 Photo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Form */}
            <form action={confirmHandoverAction}>
              <input type="hidden" name="lotId" value={lot.id} />
              <input type="hidden" name="handoverId" value={handover?.id || ""} />

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span>Declared Weight (Collector):</span>
                  <strong>{(lot.approxWeightGrams / 1000).toFixed(2)} kg</strong>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="confirmedWeightKg">Scale Weight (Confirmed kg)</label>
                  <input
                    id="confirmedWeightKg"
                    name="confirmedWeightKg"
                    type="number"
                    step="0.01"
                    defaultValue={(lot.approxWeightGrams / 1000).toFixed(2)}
                    className="form-control"
                    style={{ fontSize: "1.125rem", fontWeight: 700 }}
                    required
                  />
                  <small style={{ color: "var(--text-muted)", display: "block", marginTop: "0.25rem" }}>
                    Tolerance rule: Within &plusmn;5% is auto-accepted. Beyond 5% triggers confirmation prompt; &ge;25% raises anomaly flag.
                  </small>
                </div>
              </div>

              {/* Traceability Downstream Status */}
              <div className="form-group">
                <label className="form-label" htmlFor="downstreamStatus">Traceability Downstream Status</label>
                <select id="downstreamStatus" name="downstreamStatus" className="form-control" defaultValue="RECEIVED">
                  <option value="RECEIVED">RECEIVED (In facility warehouse)</option>
                  <option value="SENT_TO_PROCESSING">SENT_TO_PROCESSING (Dispatched to sorting/dismantling)</option>
                  <option value="PROCESSED">PROCESSED (Recovered materials sent to smelter)</option>
                </select>
              </div>

              {/* Instant Payment Section */}
              <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input type="checkbox" id="markPaid" name="markPaid" value="true" defaultChecked />
                  <label htmlFor="markPaid" style={{ fontWeight: 600, cursor: "pointer" }}>Mark lot as Paid immediately</label>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="paymentMethod">Payment Method</label>
                    <select id="paymentMethod" name="paymentMethod" className="form-control" defaultValue="CASH">
                      <option value="CASH">Cash (Handed over at counter)</option>
                      <option value="UPI">UPI Transfer</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="upiRef">UPI Ref / UTR (optional)</label>
                    <input id="upiRef" name="upiRef" type="text" className="form-control" placeholder="e.g. 123456789012" />
                  </div>
                </div>
              </div>

              {/* Dispute Section */}
              <div className="form-group">
                <label className="form-label" htmlFor="disputeReason">Dispute Reason (Only if disputing weight or material)</label>
                <input
                  id="disputeReason"
                  name="disputeReason"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Material contains heavy non-electronic stone ballast"
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="submit"
                  name="actionType"
                  value="CONFIRM"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: "0.75rem" }}
                >
                  ✓ Confirm &amp; Finalize Handover
                </button>
                <button
                  type="submit"
                  name="actionType"
                  value="DISPUTE"
                  className="btn btn-danger"
                  style={{ flex: 1, padding: "0.75rem" }}
                >
                  ⚠️ Dispute Lot
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

