import Link from "next/link";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default function AdminLanguagePage() {
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "1.5rem 1rem",
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          padding: "2.5rem 1.75rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          border: "1px solid var(--slate-200)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>🛡️</div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
          Platform Admin Language Settings
        </h1>
        <div style={{ fontSize: "0.95rem", color: "var(--slate-600)", marginTop: "0.4rem", marginBottom: "1.5rem" }}>
          Select language for platform monitoring, audits &amp; reports
        </div>

        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            fontSize: "0.85rem",
            color: "#166534",
            marginBottom: "2rem",
            fontWeight: 600,
          }}
        >
          🌐 Set your preferred language (English, Hindi, or Marathi) for administrative metrics and audit reviews.
        </div>

        <LanguageSwitcher variant="card" />

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link
            href="/admin"
            className="btn btn-primary btn-lg"
            style={{ minWidth: "220px", justifyContent: "center", fontWeight: 700 }}
          >
            Return to Admin Overview &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
