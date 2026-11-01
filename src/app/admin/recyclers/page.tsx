import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Ban, CalendarX, Check, CircleAlert, CircleCheck, LockKeyhole, Plus } from "lucide-react";
import { updateRecyclerStatusFormAction, createRecyclerAction } from "../actions";
import { CoordinateInputs } from "./CoordinateInputs";

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
      <h1 className="r-page-title">Recyclers</h1>

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
      <div className="card">
        <h2 className="r-section-title" style={{ marginBottom: "1rem" }}>
          <Plus size={20} aria-hidden="true" /> Add recycler
        </h2>

        <form action={createRecyclerAction}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name" style={{ fontWeight: 700 }}>Business name</label>
              <input id="name" name="name" type="text" className="form-control" placeholder="e.g. EcoMetals Recycling Pvt Ltd" required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contactPhone" style={{ fontWeight: 700 }}>Phone</label>
              <input id="contactPhone" name="contactPhone" type="text" className="form-control" placeholder="e.g. 9876543210" required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="authorizationNo" style={{ fontWeight: 700 }}>Authorization no.</label>
              <input id="authorizationNo" name="authorizationNo" type="text" className="form-control" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="validTill" style={{ fontWeight: 700 }}>Valid till</label>
              <input id="validTill" name="validTill" type="date" className="form-control" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="serviceRadiusKm" style={{ fontWeight: 700 }}>Service radius (km)</label>
              <input id="serviceRadiusKm" name="serviceRadiusKm" type="number" defaultValue="15" className="form-control" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address" style={{ fontWeight: 700 }}>Address</label>
            <input id="address" name="address" type="text" className="form-control" required />
          </div>

          <div className="r-grid-2" style={{ gap: "0 1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="area" style={{ fontWeight: 700 }}>Area</label>
              <input id="area" name="area" type="text" className="form-control" placeholder="e.g. Dharavi Central" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="district" style={{ fontWeight: 700 }}>District</label>
              <input id="district" name="district" type="text" defaultValue="Mumbai" className="form-control" required />
            </div>
          </div>

          <CoordinateInputs />

          <div style={{ background: "var(--slate-50)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--slate-200)", marginBottom: "1.5rem" }}>
            <h3 className="r-section-title" style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
              <LockKeyhole size={16} aria-hidden="true" /> Login for the recycler
            </h3>
            <div className="r-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="staffPhone" style={{ fontWeight: 600 }}>Login phone</label>
                <input id="staffPhone" name="staffPhone" type="text" className="form-control" placeholder="10-digit phone number" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="staffPassword" style={{ fontWeight: 600 }}>Password</label>
                <input id="staffPassword" name="staffPassword" type="password" minLength={6} className="form-control" required />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg">
            <Plus size={18} aria-hidden="true" /> Add recycler
          </button>
        </form>
      </div>
    </div>
  );
}
