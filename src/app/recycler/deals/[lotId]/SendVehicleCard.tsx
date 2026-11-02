import Link from "next/link";
import { CircleCheckBig, KeyRound, PackageCheck, Plus, Settings, Truck, Undo2 } from "lucide-react";
import { MAX_OTP_ATTEMPTS, type VehicleState } from "@/lib/domain/vehicles";
import { getLotDispatch, listVehicles } from "@/lib/services/vehicleService";
import { addVehicleAction, cancelDispatchAction, dispatchVehicleAction, verifyPickupOtpAction } from "../../actions";
import { T, type Txt } from "@/app/collector/ui";

const STATE_BADGE: Record<VehicleState, { label: (n: number) => Txt; cls: string }> = {
  EMPTY: { label: () => ({ hi: "खाली", en: "Empty", mr: "रिकामी" }), cls: "badge-success" },
  ON_THE_WAY: {
    label: (n) => ({
      hi: `रास्ते में${n > 1 ? ` · ${n} लॉट` : ""}`,
      en: `On the way${n > 1 ? ` · ${n} lots` : ""}`,
      mr: `वाटेत${n > 1 ? ` · ${n} लॉट` : ""}`,
    }),
    cls: "badge-info",
  },
  LOADED: {
    label: (n) => ({ hi: `भरी हुई · ${n} लॉट`, en: `Loaded · ${n} ${n === 1 ? "lot" : "lots"}`, mr: `भरलेली · ${n} लॉट` }),
    cls: "badge-warning",
  },
};

export function VehicleStateBadge({ state, onTheWay, loaded }: { state: VehicleState; onTheWay: number; loaded: number }) {
  const badge = STATE_BADGE[state];
  return (
    <span className={`badge ${badge.cls}`}>
      <T {...badge.label(state === "ON_THE_WAY" ? onTheWay : loaded)} />
    </span>
  );
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
          <CircleCheckBig size={20} aria-hidden="true" /> <T hi="माल उठा लिया" en="Picked up" mr="माल उचलला" />
        </h2>
        <div className="r-muted">
          {dispatch.vehicle.name} · {dispatch.vehicle.number}
          {dispatch.pickedUpAt && <> · {time(dispatch.pickedUpAt)}</>}
        </div>
        <div className="r-unloaded">
          {dispatch.unloadedAt ? (
            <>
              <PackageCheck size={14} aria-hidden="true" /> <T hi="यार्ड में उतार दिया" en="Unloaded at yard" mr="यार्डमध्ये उतरवले" /> ·{" "}
              {time(dispatch.unloadedAt)}
            </>
          ) : (
            <span style={{ color: "var(--slate-500)" }}>
              <T hi="अभी गाड़ी में है" en="Still on the vehicle" mr="अजून गाडीत आहे" /> ·{" "}
              <Link href="/recycler/vehicles">
                <T hi="उतारा हुआ दर्ज करें" en="mark unloaded" mr="उतरवले म्हणून नोंदवा" />
              </Link>
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
          <Truck size={20} aria-hidden="true" /> <T hi="गाड़ी रास्ते में" en="Vehicle on the way" mr="गाडी वाटेत" />
        </h2>
        <div className="r-muted">
          {dispatch.vehicle.name} · <strong>{dispatch.vehicle.number}</strong> · <T hi="भेजी" en="sent" mr="पाठवली" /> {time(dispatch.dispatchedAt)}
        </div>

        <form action={verifyPickupOtpAction} className="r-otp-form">
          <input type="hidden" name="lotId" value={lotId} />
          <label htmlFor="pickup-otp" className="form-label" style={{ marginBottom: 0 }}>
            <T hi="कलेक्टर का 4 अंकों का कोड" en="Collector’s 4-digit code" mr="कलेक्टरचा 4 अंकी कोड" />
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
              <KeyRound size={16} aria-hidden="true" /> <T hi="पिकअप पक्का करें" en="Confirm pickup" mr="पिकअप निश्चित करा" />
            </button>
          </div>
          {dispatch.otpAttempts > 0 && (
            <div className={triesLeft > 0 ? "r-muted" : "alert alert-danger"} style={{ marginBottom: 0 }}>
              {triesLeft > 0 ? (
                <T hi={`${triesLeft} कोशिश बाकी`} en={`${triesLeft} tries left`} mr={`${triesLeft} प्रयत्न बाकी`} />
              ) : (
                <T
                  hi="बहुत बार गलत कोड। नया कोड पाने के लिए गाड़ी वापस बुलाएं और फिर से भेजें।"
                  en="Too many wrong codes. Call the vehicle back and send it again for a new code."
                  mr="खूप वेळा चुकीचा कोड. नवीन कोडसाठी गाडी परत बोलवा आणि पुन्हा पाठवा."
                />
              )}
            </div>
          )}
        </form>

        <form action={cancelDispatchAction}>
          <input type="hidden" name="lotId" value={lotId} />
          <button type="submit" className="btn btn-sm btn-secondary r-inline">
            <Undo2 size={15} aria-hidden="true" /> <T hi="गाड़ी वापस बुलाएं" en="Call back vehicle" mr="गाडी परत बोलवा" />
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
          <Truck size={20} aria-hidden="true" /> <T hi="गाड़ी भेजें" en="Send vehicle" mr="गाडी पाठवा" />
        </h2>
        <Link href="/recycler/vehicles" className="btn btn-sm btn-secondary r-inline">
          <Settings size={15} aria-hidden="true" /> <T hi="गाड़ियां" en="Vehicles" mr="गाड्या" />
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <form action={addVehicleAction} className="r-vehicle-add">
          <div className="r-muted">
            <T hi="इस लॉट के लिए भेजने को पहली गाड़ी जोड़ें।" en="Add your first vehicle to send it for this lot." mr="या लॉटसाठी पाठवायला पहिली गाडी जोडा." />
          </div>
          <input type="hidden" name="back" value={`/recycler/deals/${lotId}`} />
          <input name="name" required minLength={2} maxLength={40} placeholder="Name, e.g. Ramesh – Tata Ace" aria-label="Vehicle name" className="form-control" />
          <input name="number" required maxLength={14} placeholder="Number, e.g. MH 01 AB 1234" aria-label="Vehicle number" className="form-control" />
          <button type="submit" className="btn btn-primary r-inline">
            <Plus size={16} aria-hidden="true" /> <T hi="गाड़ी जोड़ें" en="Add vehicle" mr="गाडी जोडा" />
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
            <Truck size={16} aria-hidden="true" /> <T hi="गाड़ी भेजें" en="Send vehicle" mr="गाडी पाठवा" />
          </button>
        </form>
      )}
    </section>
  );
}
