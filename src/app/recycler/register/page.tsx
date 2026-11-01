import Link from "next/link";
import { recyclerRegisterAction } from "../actions";

export default async function RecyclerRegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem 1.5rem",
        backgroundColor: "#f8fafc",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "580px",
          padding: "2rem",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.25rem" }}>🏭</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
            Register Authorized Recycler Facility
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Connect your state-authorized e-waste facility to informal collectors and aggregators
          </p>
        </div>

        {searchParams.error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "8px",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}
          >
            ⚠️ {searchParams.error}
          </div>
        )}

        <form action={recyclerRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Facility Name */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Facility Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. EcoGreen Recyclers Pvt Ltd"
              className="input"
              style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
            />
          </div>

          {/* SPCB Authorization No & Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                SPCB Authorization No. <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                name="authorizationNo"
                required
                placeholder="e.g. MPCB/EWASTE/2026/088"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Contact Phone <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="tel"
                name="contactPhone"
                pattern="\d{10}"
                required
                placeholder="10-digit phone"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
              />
            </div>
          </div>

          {/* Password & Confirm */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Password <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="password"
                name="password"
                minLength={6}
                required
                placeholder="••••••••"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Confirm Password <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                minLength={6}
                required
                placeholder="••••••••"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
              />
            </div>
          </div>

          {/* Physical Address */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Facility Address <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="address"
              required
              placeholder="e.g. Plot 42, MIDC Industrial Area, Taloja"
              className="input"
              style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
            />
          </div>

          {/* Area, District, State */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Area / Hub
              </label>
              <input
                type="text"
                name="area"
                defaultValue="MIDC Taloja"
                className="input"
                style={{ fontSize: "0.9rem", padding: "0.6rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                District
              </label>
              <input
                type="text"
                name="district"
                defaultValue="Raigad"
                className="input"
                style={{ fontSize: "0.9rem", padding: "0.6rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                State
              </label>
              <input
                type="text"
                name="state"
                defaultValue="Maharashtra"
                className="input"
                style={{ fontSize: "0.9rem", padding: "0.6rem", borderRadius: "8px" }}
              />
            </div>
          </div>

          {/* Coordinates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Facility Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                name="latitude"
                defaultValue="19.0760"
                className="input"
                style={{ fontSize: "0.9rem", padding: "0.6rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Facility Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                name="longitude"
                defaultValue="72.8777"
                className="input"
                style={{ fontSize: "0.9rem", padding: "0.6rem", borderRadius: "8px" }}
              />
            </div>
          </div>

          {/* Doorstep Pickup Settings */}
          <div
            style={{
              padding: "0.85rem",
              backgroundColor: "#f1f5f9",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
              <input
                type="checkbox"
                name="pickupAvailable"
                defaultChecked
                style={{ width: "18px", height: "18px" }}
              />
              <span>Offer Doorstep Pickup to Collectors (C22)</span>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#475569" }}>Radius (km)</label>
                <input
                  type="number"
                  name="serviceRadiusKm"
                  defaultValue="20"
                  className="input"
                  style={{ fontSize: "0.85rem", padding: "0.5rem", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#475569" }}>Min Weight (kg)</label>
                <input
                  type="number"
                  name="minimumWeightKg"
                  defaultValue="15"
                  className="input"
                  style={{ fontSize: "0.85rem", padding: "0.5rem", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#475569" }}>Pickup Fee (₹)</label>
                <input
                  type="number"
                  name="pickupChargeRupees"
                  defaultValue="0"
                  className="input"
                  style={{ fontSize: "0.85rem", padding: "0.5rem", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.875rem",
              fontSize: "1.05rem",
              fontWeight: 700,
              borderRadius: "10px",
              marginTop: "0.5rem",
              backgroundColor: "#059669",
            }}
          >
            Complete Facility Registration &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem" }}>
          Already have facility staff access?{" "}
          <Link href="/recycler/login" style={{ color: "#059669", fontWeight: 700, textDecoration: "underline" }}>
            Sign In Here
          </Link>
        </div>

        <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
            &larr; Back to Platform Home
          </Link>
        </div>
      </div>
    </div>
  );
}

