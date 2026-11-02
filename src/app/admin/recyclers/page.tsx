import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Ban, CalendarX, Check, CircleAlert, CircleCheck, Pencil, Plus } from "lucide-react";
import { updateRecyclerStatusFormAction } from "../actions";
import { RecyclerForm } from "./RecyclerForm";
import { EMPTY_RECYCLER_FORM } from "./recyclerFormState";

export default async function AdminRecyclersPage(props: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireRole(["ADMIN"]);
  const searchParams = await props.searchParams;

  const recyclers = await prisma.recycler.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      staff: { include: { user: true } },
      verifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewedBy: true },
      },
    },
  });

  const now = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <h1 className="r-page-title">Recyclers</h1>
        <a href="#add-recycler" className="btn btn-primary r-inline">
          <Plus size={16} aria-hidden="true" /> Add recycler
        </a>
      </div>

      {searchParams.success && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <CircleCheck size={18} aria-hidden="true" /> {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <CircleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      {/* Recyclers Table Card */}
      <div className="card">
        <h2 className="r-section-title" style={{ marginBottom: "1rem" }}>All recyclers ({recyclers.length})</h2>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Permit No</th>
                <th>Valid till</th>
                <th>Contact</th>
                <th>Status</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {recyclers.map((r) => {
                const isPastExpiry = r.authorizationValidTill && r.authorizationValidTill < now;
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                        {r.area}, {r.district}
                      </div>
                    </td>
                    <td><code>{r.authorizationNo}</code></td>
                    <td>
                      {r.authorizationValidTill ? (
                        <span style={{ color: isPastExpiry ? "var(--danger)" : "inherit", fontWeight: isPastExpiry ? 700 : 500 }}>
                          {r.authorizationValidTill.toISOString().split("T")[0]}
                          {isPastExpiry && " (expired)"}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td>{r.contactPhone}</td>
                    <td>
                      <span className={`badge ${r.authorizationStatus === "VERIFIED" ? "badge-success" : r.authorizationStatus === "EXPIRED" ? "badge-danger" : "badge-warning"}`}>
                        {r.authorizationStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <Link href={`/admin/recyclers/${r.id}`} className="btn btn-sm btn-secondary r-inline">
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </Link>
                        {r.authorizationStatus !== "VERIFIED" && (
                          <form action={updateRecyclerStatusFormAction}>
                            <input type="hidden" name="recyclerId" value={r.id} />
                            <input type="hidden" name="status" value="VERIFIED" />
                            <input type="hidden" name="notes" value="Approved by admin" />
                            <button type="submit" className="btn btn-sm btn-primary">
                              <Check size={14} aria-hidden="true" /> Approve
                            </button>
                          </form>
                        )}
                        {r.authorizationStatus !== "SUSPENDED" && (
                          <form action={updateRecyclerStatusFormAction}>
                            <input type="hidden" name="recyclerId" value={r.id} />
                            <input type="hidden" name="status" value="SUSPENDED" />
                            <input type="hidden" name="notes" value="Suspended by admin" />
                            <button type="submit" className="btn btn-sm btn-danger">
                              <Ban size={14} aria-hidden="true" /> Suspend
                            </button>
                          </form>
                        )}
                        {r.authorizationStatus !== "EXPIRED" && isPastExpiry && (
                          <form action={updateRecyclerStatusFormAction}>
                            <input type="hidden" name="recyclerId" value={r.id} />
                            <input type="hidden" name="status" value="EXPIRED" />
                            <input type="hidden" name="notes" value="Flagged expired by admin" />
                            <button type="submit" className="btn btn-sm btn-secondary">
                              <CalendarX size={14} aria-hidden="true" /> Expire
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Recycler Facility Form (Responsive full-width or split) */}
      <div className="card" id="add-recycler" style={{ scrollMarginTop: "5rem" }}>
        <h2 className="r-section-title" style={{ marginBottom: "1rem" }}>
          <Plus size={20} aria-hidden="true" /> Add recycler
        </h2>

        <RecyclerForm initial={EMPTY_RECYCLER_FORM} />
      </div>
    </div>
  );
}
