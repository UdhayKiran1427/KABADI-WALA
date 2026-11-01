import Link from "next/link";
import { fieldRegisterAction } from "../actions";

export default async function FieldAgentRegisterPage(props: {
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
        padding: "1.5rem",
        backgroundColor: "#f1f5f9",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2rem",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.25rem" }}>📋</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
            Field Agent Registration
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Join the ground operations team: Collector Onboarding (F1), Price Auditing (F2) & AI Dataset Logging (F3)
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

        <form action={fieldRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Mobile Phone <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="tel"
              name="phone"
              pattern="\d{10}"
              required
              placeholder="10-digit mobile number"
              className="input"
              style={{ fontSize: "1rem", padding: "0.75rem", borderRadius: "8px" }}
            />
          </div>

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
                style={{ fontSize: "0.95rem", padding: "0.7rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Confirm <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                minLength={6}
                required
                placeholder="••••••••"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.7rem", borderRadius: "8px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Assigned Hub / Operating Area
            </label>
            <input
              type="text"
              name="assignedArea"
              defaultValue="Dharavi - Kurla Sector"
              className="input"
              style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Preferred Working Language
            </label>
            <select
              name="language"
              defaultValue="HI"
              className="input"
              style={{ padding: "0.65rem", borderRadius: "8px", backgroundColor: "white" }}
            >
              <option value="HI">हिंदी (Hindi)</option>
              <option value="MR">मराठी (Marathi)</option>
              <option value="EN">English</option>
            </select>
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
              backgroundColor: "#2563eb",
            }}
          >
            Register as Field Agent &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem" }}>
          Already registered as an agent?{" "}
          <Link href="/field/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}>
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

