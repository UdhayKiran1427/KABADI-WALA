import Link from "next/link";
import { CircleCheckBig, KeyRound, PackageCheck, Plus, Settings, Truck, Undo2 } from "lucide-react";
import { MAX_OTP_ATTEMPTS, type VehicleState } from "@/lib/domain/vehicles";
import { getLotDispatch, listVehicles } from "@/lib/services/vehicleService";
import { addVehicleAction, cancelDispatchAction, dispatchVehicleAction, verifyPickupOtpAction } from "../../actions";

const STATE_BADGE: Record<VehicleState, { label: (n: number) => string; cls: string }> = {
  EMPTY: { label: () => "Empty", cls: "badge-success" },
  ON_THE_WAY: { label: (n) => `On the way${n > 1 ? ` · ${n} lots` : ""}`, cls: "badge-info" },
  LOADED: { label: (n) => `Loaded · ${n} ${n === 1 ? "lot" : "lots"}`, cls: "badge-warning" },
};

export function VehicleStateBadge({ state, onTheWay, loaded }: { state: VehicleState; onTheWay: number; loaded: number }) {
  const badge = STATE_BADGE[state];
  return <span className={`badge ${badge.cls}`}>{badge.label(state === "ON_THE_WAY" ? onTheWay : loaded)}</span>;
}

export const time = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * Send one of the recycler's vehicles for this lot, then confirm the pickup with the collector's OTP.
 */
export async function SendVehicleCard({ lotId, recyclerId }: { lotId: string; recyclerId: string }) {
  const dispatch = await getLotDispatch(lotId);

  if (dispatch?.status === "PICKED_UP") {
    return (
      <section className="card r-vehicle-card is-done">
        <h2 className="r-section-title">
          <CircleCheckBig size={20} aria-hidden="true" /> Picked up
        </h2>
        <div className="r-muted">
          {dispatch.vehicle.name} · {dispatch.vehicle.number}
          {dispatch.pickedUpAt && <> · {time(dispatch.pickedUpAt)}</>}
        </div>
        <div className="r-unloaded">
          {dispatch.unloadedAt ? (
            <>
              <PackageCheck size={14} aria-hidden="true" /> Unloaded at yard · {time(dispatch.unloadedAt)}
            </>
          ) : (
            <span style={{ color: "var(--slate-500)" }}>
              Still on the vehicle · <Link href="/recycler/vehicles">mark unloaded</Link>
            </span>
          )}
        </div>
      </section>
    );
  }

  if (dispatch?.status === "ON_THE_WAY") {
    const triesLeft = MAX_OTP_ATTEMPTS - dispatch.otpAttempts;
    return (
      <section className="card r-vehicle-card">
        <h2 className="r-section-title">
          <Truck size={20} aria-hidden="true" /> Vehicle on the way
        </h2>
        <div className="r-muted">
          {dispatch.vehicle.name} · <strong>{dispatch.vehicle.number}</strong> · sent {time(dispatch.dispatchedAt)}
        </div>

        <form action={verifyPickupOtpAction} className="r-otp-form">
          <input type="hidden" name="lotId" value={lotId} />
          <label htmlFor="pickup-otp" className="form-label" style={{ marginBottom: 0 }}>
            Collector&apos;s 4-digit code
          </label>
          <div className="r-otp-row">
            <input
              id="pickup-otp"
              name="otp"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              autoComplete="one-time-code"
              required
              placeholder="0000"
              className="form-control r-otp-input"
              disabled={triesLeft <= 0}
            />
            <button type="submit" className="btn btn-primary" disabled={triesLeft <= 0}>
              <KeyRound size={16} aria-hidden="true" /> Confirm pickup
            </button>
          </div>
          {dispatch.otpAttempts > 0 && (
            <div className={triesLeft > 0 ? "r-muted" : "alert alert-danger"} style={{ marginBottom: 0 }}>
              {triesLeft > 0 ? `${triesLeft} tries left` : "Too many wrong codes. Call the vehicle back and send it again for a new code."}
            </div>
          )}
        </form>

        <form action={cancelDispatchAction}>
          <input type="hidden" name="lotId" value={lotId} />
          <button type="submit" className="btn btn-sm btn-secondary r-inline">
            <Undo2 size={15} aria-hidden="true" /> Call back vehicle
          </button>
        </form>
      </section>
    );
  }

  const vehicles = await listVehicles(recyclerId);
  return (
    <section className="card r-vehicle-card">
      <div className="r-section-head">
        <h2 className="r-section-title">
          <Truck size={20} aria-hidden="true" /> Send vehicle
        </h2>
        <Link href="/recycler/vehicles" className="btn btn-sm btn-secondary r-inline">
          <Settings size={15} aria-hidden="true" /> Vehicles
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <form action={addVehicleAction} className="r-vehicle-add">
          <div className="r-muted">Add your first vehicle to send it for this lot.</div>
          <input type="hidden" name="back" value={`/recycler/deals/${lotId}`} />
          <input name="name" required minLength={2} maxLength={40} placeholder="Name, e.g. Ramesh – Tata Ace" aria-label="Vehicle name" className="form-control" />
          <input name="number" required maxLength={14} placeholder="Number, e.g. MH 01 AB 1234" aria-label="Vehicle number" className="form-control" />
          <button type="submit" className="btn btn-primary r-inline">
            <Plus size={16} aria-hidden="true" /> Add vehicle
          </button>
        </form>
      ) : (
        <form action={dispatchVehicleAction} className="r-vehicle-pick">
          <input type="hidden" name="lotId" value={lotId} />
          <div className="r-vehicle-list" role="radiogroup" aria-label="Vehicles">
            {vehicles.map((v, i) => (
              <label key={v.id} className="r-vehicle-option">
                <input type="radio" name="vehicleId" value={v.id} defaultChecked={i === 0 && v.state === "EMPTY"} required />
                <span className="r-vehicle-text">
                  <strong>{v.number}</strong>
                  <span className="r-muted">{v.name}</span>
                </span>
                <VehicleStateBadge state={v.state} onTheWay={v.onTheWay} loaded={v.loaded} />
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-block r-inline">
            <Truck size={16} aria-hidden="true" /> Send vehicle
          </button>
        </form>
      )}
    </section>
  );
}
