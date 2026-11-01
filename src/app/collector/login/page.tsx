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
        padding: "1.5rem 1rem",
        backgroundColor: "var(--bg)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2rem 1.75rem",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--slate-200)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "var(--primary-100)",
              color: "var(--primary-800)",
              fontSize: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "0.75rem",
            }}
          >
            ♻️
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
            कबाड़ीवाला &bull; KabadiWala
          </h1>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            कलेक्टर लॉगिन / Collector Sign In
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.85rem" }}>
            <span className="badge badge-success">हिन्दी</span>
            <span className="badge badge-neutral">मराठी</span>
            <span className="badge badge-neutral">English</span>
          </div>
        </div>

        {searchParams.error && (
          <div className="alert alert-danger" style={{ textAlign: "center", justifyContent: "center" }}>
            ⚠️ {searchParams.error}
          </div>
        )}

        <form action={collectorLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              फ़ोन नंबर / Mobile Phone
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue="9820000001"
              required
              placeholder="10-digit mobile number"
              className="form-control"
              style={{ fontSize: "1.05rem", padding: "0.75rem" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
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
              className="form-control"
              style={{
                fontSize: "1.5rem",
                letterSpacing: "0.5rem",
                textAlign: "center",
                padding: "0.6rem",
                fontWeight: 800,
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: "0.5rem" }}
          >
            लॉगिन करें / Sign In &rarr;
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--slate-600)" }}>
          नया कलेक्टर खाता बनाएं?{" "}
          <Link href="/collector/register" style={{ color: "var(--primary-700)", fontWeight: 700 }}>
            पंजीकरण करें &rarr;
          </Link>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.875rem",
            backgroundColor: "var(--primary-50)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--primary-border)",
            fontSize: "0.775rem",
            color: "var(--primary-900)",
            lineHeight: 1.5,
          }}
        >
          🔒 <strong>Privacy by Design:</strong> Zero personal identity documents required. Direct cash &amp; UPI payouts guaranteed by authorized recyclers.
        </div>

        <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.825rem" }}>
          <Link href="/" style={{ color: "var(--slate-500)", textDecoration: "none" }}>
            &larr; Back to Platform Home
          </Link>
        </div>
      </div>
    </div>
  );
}
