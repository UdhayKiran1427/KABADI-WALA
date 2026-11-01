import Link from "next/link";
import { ChevronDown, Factory, TriangleAlert } from "lucide-react";
import { recyclerRegisterAction } from "../actions";

export default async function RecyclerRegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "1rem 0 2rem" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="r-role-icon" style={{ width: 56, height: 56, borderRadius: 16 }}>
            <Factory size={28} aria-hidden="true" />
          </div>
          <h1 className="r-page-title">Register your business</h1>
        </div>

        {searchParams.error && (
          <div className="alert alert-danger">
            <TriangleAlert size={18} aria-hidden="true" /> {searchParams.error}
          </div>
        )}

        <div className="card">
          <form action={recyclerRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="reg-name">Business name</label>
              <input id="reg-name" type="text" name="name" required className="form-control" />
            </div>

            <div className="r-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-phone">Phone</label>
                <input
                  id="reg-phone"
                  type="tel"
                  name="contactPhone"
                  pattern="\d{10}"
                  required
                  placeholder="10 digits"
                  className="form-control"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-auth">Authorization no.</label>
                <input id="reg-auth" type="text" name="authorizationNo" required className="form-control" />
              </div>
            </div>

            <div className="r-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input id="reg-password" type="password" name="password" minLength={6} required className="form-control" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
                <input id="reg-confirm" type="password" name="confirmPassword" minLength={6} required className="form-control" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="reg-address">Address</label>
              <input id="reg-address" type="text" name="address" required className="form-control" />
            </div>

            <div className="r-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-area">Area</label>
                <input id="reg-area" type="text" name="area" defaultValue="Dharavi" className="form-control" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="reg-district">District</label>
                <input id="reg-district" type="text" name="district" defaultValue="Mumbai" className="form-control" />
              </div>
            </div>

            <details className="r-details" style={{ padding: "0.75rem 1rem", background: "var(--slate-50)", borderRadius: "var(--radius)", border: "1px solid var(--slate-200)" }}>
              <summary>
                More settings <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="reg-state">State</label>
                  <input id="reg-state" type="text" name="state" defaultValue="Maharashtra" className="form-control" />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                  <input
                    type="checkbox"
                    name="pickupAvailable"
                    defaultChecked
                    style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                  />
                  We offer doorstep pickup
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem" }}>
                  <div>
                    <label className="form-label" htmlFor="reg-radius">Radius (km)</label>
                    <input id="reg-radius" type="number" name="serviceRadiusKm" defaultValue="20" className="form-control" />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="reg-minwt">Min kg</label>
                    <input id="reg-minwt" type="number" name="minimumWeightKg" defaultValue="15" className="form-control" />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="reg-fee">Fee (₹)</label>
                    <input id="reg-fee" type="number" name="pickupChargeRupees" defaultValue="0" className="form-control" />
                  </div>
                </div>
              </div>
            </details>

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Register
            </button>
          </form>

          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--slate-200)", textAlign: "center", fontSize: "0.9rem" }}>
            Already registered?{" "}
            <Link href="/recycler/login" style={{ color: "var(--primary-700)", fontWeight: 700 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
