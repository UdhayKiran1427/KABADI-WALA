import { CircleAlert, CircleCheck, PackageCheck, PackageOpen, Plus, Trash, Truck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { listVehicles } from "@/lib/services/vehicleService";
import { addVehicleAction, markVehicleUnloadedAction, removeVehicleAction } from "../actions";
import { VehicleStateBadge, time } from "../deals/[lotId]/SendVehicleCard";

export default async function RecyclerVehiclesPage(props: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const searchParams = await props.searchParams;
  const vehicles = dbUser.recyclerId ? await listVehicles(dbUser.recyclerId) : [];

  return (
    <div className="r-stack">
      <h1 className="r-page-title r-inline">
        <Truck size={22} aria-hidden="true" /> Vehicles
      </h1>

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

      <div className="r-grid-2-lg">
        <section className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <div className="r-section-head">
            <h2 className="r-section-title">All vehicles</h2>
            <span className="badge badge-neutral">{vehicles.length}</span>
          </div>

          {vehicles.length === 0 ? (
            <div className="r-empty">
              <Truck size={28} aria-hidden="true" />
              <div>No vehicles yet.</div>
            </div>
          ) : (
            <div className="r-list">
              {vehicles.map((v) => (
                <div key={v.id} className="r-item">
                  <div className="r-item-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="r-item-title">{v.number}</div>
                      <div className="r-muted">{v.name}</div>
                      {v.state === "EMPTY" && v.lastUnloadedAt && (
                        <div className="r-unloaded">
                          <PackageCheck size={14} aria-hidden="true" /> Unloaded · {time(v.lastUnloadedAt)}
                        </div>
                      )}
                    </div>
                    <VehicleStateBadge state={v.state} onTheWay={v.onTheWay} loaded={v.loaded} />
                  </div>
                  <div className="r-actions">
                    {v.loaded > 0 && (
                      <form action={markVehicleUnloadedAction}>
                        <input type="hidden" name="vehicleId" value={v.id} />
                        <button type="submit" className="btn btn-sm btn-secondary r-inline">
                          <PackageOpen size={15} aria-hidden="true" /> Mark unloaded
                        </button>
                      </form>
                    )}
                    {v.state !== "ON_THE_WAY" && (
                      <form action={removeVehicleAction}>
                        <input type="hidden" name="vehicleId" value={v.id} />
                        <button type="submit" className="btn btn-sm btn-secondary r-inline" style={{ color: "var(--danger)" }}>
                          <Trash size={15} aria-hidden="true" /> Remove
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ padding: "1.25rem", minWidth: 0 }}>
          <h2 className="r-section-title" style={{ marginBottom: "0.75rem" }}>
            <Plus size={20} aria-hidden="true" /> Add vehicle
          </h2>
          <form action={addVehicleAction} className="r-vehicle-add">
            <label className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label">Name</span>
              <input name="name" required minLength={2} maxLength={40} placeholder="e.g. Ramesh – Tata Ace" className="form-control" />
            </label>
            <label className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label">Vehicle number</span>
              <input name="number" required maxLength={14} placeholder="e.g. MH 01 AB 1234" className="form-control" />
            </label>
            <button type="submit" className="btn btn-primary btn-block r-inline">
              <Plus size={16} aria-hidden="true" /> Add vehicle
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
