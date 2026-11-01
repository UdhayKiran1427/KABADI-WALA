import { requireRole } from "@/lib/auth/session";
import { CircleCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { reviewAnomalyFormAction } from "../actions";

export default async function AdminAnomaliesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { status = "OPEN", severity } = await searchParams;

  const where: any = {};
  if (status) where.status = status;
  if (severity) where.severity = parseInt(severity, 10);

  const flags = await prisma.anomalyFlag.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      lot: {
        include: {
          category: true,
          collector: true,
          handovers: true,
        },
      },
      reviewedBy: true,
    },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 className="r-page-title">Alerts</h1>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <Link href="/admin/anomalies?status=OPEN" className={`btn ${status === "OPEN" ? "btn-primary" : "btn-secondary"}`}>
          Open ({flags.filter((f) => f.status === "OPEN").length})
        </Link>
        <Link href="/admin/anomalies?status=REVIEWED" className={`btn ${status === "REVIEWED" ? "btn-primary" : "btn-secondary"}`}>
          Reviewed
        </Link>
        <Link href="/admin/anomalies?status=DISMISSED" className={`btn ${status === "DISMISSED" ? "btn-primary" : "btn-secondary"}`}>
          Dismissed
        </Link>
      </div>

      {/* Alerts Feed */}
      <div className="card">
        {flags.length === 0 ? (
          <div className="r-empty">
            <CircleCheck size={28} aria-hidden="true" />
            <div>No {status.toLowerCase()} alerts.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Rule</th>
                  <th>Lot Ref</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.id}>
                    <td>
                      <span className={`badge ${flag.severity >= 3 ? "badge-danger" : flag.severity === 2 ? "badge-warning" : "badge-neutral"}`}>
                        Sev {flag.severity}
                      </span>
                    </td>
                    <td><code>{flag.ruleCode || flag.type}</code></td>
                    <td>
                      <strong>{flag.lot?.lotRef || "N/A"}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{flag.lot?.category.nameEn}</div>
                    </td>
                    <td style={{ maxWidth: "300px" }}>{flag.reason}</td>
                    <td>{flag.createdAt.toISOString().split("T")[0]}</td>
                    <td>
                      <span className={`badge ${flag.status === "OPEN" ? "badge-danger" : flag.status === "REVIEWED" ? "badge-success" : "badge-neutral"}`}>
                        {flag.status}
                      </span>
                    </td>
                    <td>
                      {flag.status === "OPEN" ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <form action={reviewAnomalyFormAction}>
                            <input type="hidden" name="flagId" value={flag.id} />
                            <input type="hidden" name="status" value="REVIEWED" />
                            <button type="submit" className="btn btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                              Review
                            </button>
                          </form>
                          <form action={reviewAnomalyFormAction}>
                            <input type="hidden" name="flagId" value={flag.id} />
                            <input type="hidden" name="status" value="DISMISSED" />
                            <button type="submit" className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                              Dismiss
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {flag.reviewedBy?.phone ? `By ${flag.reviewedBy.phone}` : "Done"}
                        </span>
                      )}
                    </td>
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

