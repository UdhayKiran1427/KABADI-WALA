import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { inr, kg } from "@/lib/format";
import { resolveDisputeFormAction } from "../actions";

/** M6: disputes between collector and recycler. Admin reads the evidence and resolves with a note. */
export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; error?: string; success?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { view = "open", error, success } = await searchParams;

  const disputes = await prisma.dispute.findMany({
    where: view === "resolved" ? { resolvedAt: { not: null } } : { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      lot: { include: { category: true, transaction: true } },
      handover: true,
    },
  });

  return (
    <div>
      <h1 className="r-page-title" style={{ marginBottom: "1.5rem" }}>Disputes</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <Link href="/admin/disputes?view=open" className={`btn ${view !== "resolved" ? "btn-primary" : "btn-secondary"}`}>
          Open
        </Link>
        <Link href="/admin/disputes?view=resolved" className={`btn ${view === "resolved" ? "btn-primary" : "btn-secondary"}`}>
          Resolved
        </Link>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
          <CircleCheck size={18} aria-hidden="true" /> {success}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          <CircleAlert size={18} aria-hidden="true" /> {error}
        </div>
      )}

      <div className="card">
        {disputes.length === 0 ? (
          <div className="r-empty">
            <CircleCheck size={28} aria-hidden="true" />
            <div>No {view === "resolved" ? "resolved" : "open"} disputes.</div>
          </div>
        ) : (
          disputes.map((d) => {
            const declared = d.lot.approxWeightGrams;
            const actual = d.handover?.confirmedWeightGrams ?? null;
            const rate = d.lot.transaction?.quotedRatePerKgPaise ?? d.lot.quotedRatePaise ?? null;
            return (
              <div key={d.id} style={{ padding: "1rem 0", borderBottom: "1px solid var(--slate-200)" }}>
                <div style={{ fontWeight: 600 }}>
                  {d.lot.lotRef} · {d.lot.category.nameEn} · raised by {d.raisedBy.toLowerCase()}
                </div>
                <div style={{ margin: "0.25rem 0" }}>{d.reason}</div>
                <div style={{ fontSize: "0.9rem", color: "var(--slate-600)" }}>
                  Declared {kg(declared)} kg
                  {actual !== null && <> · Weighed {kg(actual)} kg</>}
                  {rate !== null && <> · Locked rate {inr(rate)}/kg</>}
                  {d.lot.transaction?.finalPricePaise != null && <> · Amount {inr(d.lot.transaction.finalPricePaise)}</>}
                  {d.hasEvidence && <> · Photo evidence attached</>}
                </div>

                {d.resolvedAt ? (
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong>Resolved:</strong> {d.resolution}
                  </div>
                ) : (
                  <form action={resolveDisputeFormAction} style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <input type="hidden" name="disputeId" value={d.id} />
                    <input
                      name="note"
                      required
                      minLength={5}
                      placeholder="Resolution note (required)"
                      aria-label="Resolution note"
                      className="input"
                      style={{ flex: "1 1 240px" }}
                    />
                    <button type="submit" name="outcome" value="CONFIRM" className="btn btn-primary">
                      Confirm amount
                    </button>
                    <button type="submit" name="outcome" value="CANCEL" className="btn btn-secondary">
                      Cancel lot
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
