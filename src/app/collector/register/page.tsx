import Link from "next/link";
import { collectorRegisterAction } from "../actions";

export default async function CollectorRegisterPage(props: {
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
        backgroundColor: "#f4f6f8",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "2rem",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.25rem" }}>♻️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
            नया खाता बनाएं / Register
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            कबाड़ीवाला ई-कचरा कलेक्टर पंजीकरण / Informal Collector Sign Up
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
            <span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#334155" }}>हिंदी</span>
            <span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#334155" }}>मराठी</span>
            <span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#334155" }}>English</span>
          </div>
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

        <form action={collectorRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              फ़ोन नंबर / Mobile Phone <span style={{ color: "red" }}>*</span>
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
            <small style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              We only use this to send payout & price alert SMS.
            </small>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                4-अंकों का पिन / PIN <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="password"
                name="pin"
                maxLength={4}
                pattern="\d{4}"
                required
                placeholder="••••"
                className="input"
                style={{
                  fontSize: "1.3rem",
                  letterSpacing: "0.3rem",
                  textAlign: "center",
                  padding: "0.65rem",
                  borderRadius: "8px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                पिन दोहराएं / Confirm <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="password"
                name="confirmPin"
                maxLength={4}
                pattern="\d{4}"
                required
                placeholder="••••"
                className="input"
                style={{
                  fontSize: "1.3rem",
                  letterSpacing: "0.3rem",
                  textAlign: "center",
                  padding: "0.65rem",
                  borderRadius: "8px",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                कार्य क्षेत्र / Operating Area <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                name="operatingArea"
                required
                placeholder="e.g. Dharavi, Kurla West"
                defaultValue="Dharavi"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                जिला / District
              </label>
              <input
                type="text"
                name="district"
                defaultValue="Mumbai"
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.65rem", borderRadius: "8px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              पसंदीदा भाषा / Preferred Language
            </label>
            <select
              name="preferredLanguage"
              defaultValue="HI"
              className="input"
              style={{ padding: "0.65rem", borderRadius: "8px", backgroundColor: "white" }}
            >
              <option value="HI">हिंदी (Hindi)</option>
              <option value="MR">मराठी (Marathi)</option>
              <option value="EN">English</option>
            </select>
          </div>

          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "0.8rem",
            }}
          >
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="hasConsent"
                defaultChecked
                required
                style={{ marginTop: "0.2rem", width: "16px", height: "16px" }}
              />
              <span>
                <strong>सहमति / Consent:</strong> I agree to participate as an informal e-waste collector. No Aadhaar, PAN, or physical IDs are required. All cash payouts will be paid directly at authorized recycler scale.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.875rem",
              fontSize: "1.1rem",
              fontWeight: 700,
              borderRadius: "10px",
              marginTop: "0.5rem",
            }}
          >
            खाता बनाएं / Register Now &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem" }}>
          पहले से खाता है? / Already registered?{" "}
          <Link href="/collector/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}>
            लॉगिन करें / Sign In
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

