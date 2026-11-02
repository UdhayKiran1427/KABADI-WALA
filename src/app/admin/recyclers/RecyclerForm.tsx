"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, LockKeyhole, Plus, Save } from "lucide-react";
import { saveRecyclerAction } from "../actions";
import { CoordinateInputs } from "./CoordinateInputs";
import type { RecyclerFormValues } from "./recyclerFormState";

/**
 * Add or edit a recycler (edit when `recyclerId` is given). On an error the message shows above
 * the save button and every field keeps what was typed, except the password.
 */
export function RecyclerForm({ initial, recyclerId }: { initial: RecyclerFormValues; recyclerId?: string }) {
  const [state, formAction, pending] = useActionState(saveRecyclerAction, { error: null, values: initial, attempt: 0 });
  const v = state.values;
  const isEdit = Boolean(recyclerId);

  return (
    // key: re-mount after a failed save so the inputs show the returned values (React resets forms after an action)
    <form action={formAction} key={state.attempt}>
      {recyclerId && <input type="hidden" name="recyclerId" value={recyclerId} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="name" style={{ fontWeight: 700 }}>Business name</label>
          <input id="name" name="name" type="text" defaultValue={v.name} className="form-control" placeholder="e.g. EcoMetals Recycling Pvt Ltd" required />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="contactPhone" style={{ fontWeight: 700 }}>Phone</label>
          <input id="contactPhone" name="contactPhone" type="text" defaultValue={v.contactPhone} className="form-control" placeholder="e.g. 9876543210" required />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="authorizationNo" style={{ fontWeight: 700 }}>Authorization no.</label>
          <input id="authorizationNo" name="authorizationNo" type="text" defaultValue={v.authorizationNo} className="form-control" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="validTill" style={{ fontWeight: 700 }}>Valid till</label>
          <input id="validTill" name="validTill" type="date" defaultValue={v.validTill} className="form-control" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="serviceRadiusKm" style={{ fontWeight: 700 }}>Service radius (km)</label>
          <input id="serviceRadiusKm" name="serviceRadiusKm" type="number" defaultValue={v.serviceRadiusKm} className="form-control" required />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="address" style={{ fontWeight: 700 }}>Address</label>
        <input id="address" name="address" type="text" defaultValue={v.address} className="form-control" required />
      </div>

      <div className="r-grid-2" style={{ gap: "0 1rem" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="area" style={{ fontWeight: 700 }}>Area</label>
          <input id="area" name="area" type="text" defaultValue={v.area} className="form-control" placeholder="e.g. Dharavi Central" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="district" style={{ fontWeight: 700 }}>District</label>
          <input id="district" name="district" type="text" defaultValue={v.district} className="form-control" required />
        </div>
      </div>

      <CoordinateInputs defaultLatitude={v.latitude || null} defaultLongitude={v.longitude || null} />

      <div style={{ background: "var(--slate-50)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid var(--slate-200)", marginBottom: "1.5rem" }}>
        <h3 className="r-section-title" style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
          <LockKeyhole size={16} aria-hidden="true" /> Login for the recycler
        </h3>
        <div className="r-grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="staffPhone" style={{ fontWeight: 600 }}>Login phone</label>
            <input id="staffPhone" name="staffPhone" type="text" defaultValue={v.staffPhone} className="form-control" placeholder="10-digit phone number" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="staffPassword" style={{ fontWeight: 600 }}>
              {isEdit ? "New password (optional)" : "Password"}
            </label>
            <input
              id="staffPassword"
              name="staffPassword"
              type="password"
              minLength={6}
              className="form-control"
              placeholder={isEdit ? "Leave blank to keep the current one" : undefined}
              required={!isEdit}
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {state.error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: "1rem" }}>
          <CircleAlert size={18} aria-hidden="true" /> {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
          {isEdit ? <Save size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add recycler"}
        </button>
        {isEdit && (
          <Link href="/admin/recyclers" className="btn btn-secondary btn-lg">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
