import Link from "next/link";
import { collectorLoginAction } from "../actions";

export default async function CollectorLoginPage(props: {
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
          maxWidth: "420px",
          padding: "2rem",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📱</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
            कबाड़ीवाला / KabadiWala
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            कलेक्टर लॉगिन / Collector Sign In
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
            <span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#334155" }}>हिंदी (Hindi)</span>
            <span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#334155" }}>मराठी (Marathi)</span>
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

        <form action={collectorLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              फ़ोन नंबर / Mobile Phone
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue="9820000001"
              required
              placeholder="10-digit mobile number"
              className="input"
              style={{ fontSize: "1.1rem", padding: "0.75rem", borderRadius: "8px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              4-अंकों का पिन / 4-Digit Security PIN
            </label>
            <input
              type="password"
              name="pin"
              defaultValue="1234"
              maxLength={4}
              pattern="\d{4}"
              required
              placeholder="••••"
              className="input"
              style={{
                fontSize: "1.5rem",
                letterSpacing: "0.4rem",
                textAlign: "center",
                padding: "0.75rem",
                borderRadius: "8px",
              }}
            />
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
            लॉगिन करें / Sign In &rarr;
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem",
            backgroundColor: "#ecfdf5",
            borderRadius: "8px",
            border: "1px solid #a7f3d0",
            fontSize: "0.8rem",
            color: "#065f46",
          }}
        >
          🔒 <strong>Privacy by Design:</strong> Zero personal data or identity documents stored. Cash payments guaranteed directly by authorized recyclers.
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
            &larr; Back to Platform Home
          </Link>
        </div>
      </div>
    </div>
  );
}

