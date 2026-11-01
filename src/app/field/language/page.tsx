import Link from "next/link";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default function FieldAgentLanguagePage() {
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
        <div style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>📋</div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
          Field Agent Hub Language Settings
        </h1>
        <div style={{ fontSize: "0.95rem", color: "var(--slate-600)", marginTop: "0.4rem", marginBottom: "1.5rem" }}>
          Select language for collector onboarding &amp; spot market rate logging
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
          🌐 English, Hindi, and Marathi are supported across all Field Agent modules (F1 Onboarding, F2 Prices, F3 Photos, F4 Pickups).
        </div>

        <LanguageSwitcher variant="card" />

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link
            href="/field"
            className="btn btn-primary btn-lg"
            style={{ minWidth: "220px", justifyContent: "center", fontWeight: 700 }}
          >
            Continue to Field Hub &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
