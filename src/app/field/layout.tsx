import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { fieldLogoutAction } from "./actions";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default async function FieldAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      {session && (
        <header
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid var(--slate-200)",
            padding: "0.75rem 1.25rem",
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div
            style={{
              maxWidth: "1360px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link href="/field" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, fontSize: "1.15rem" }}>
                <span>📋</span>
                <span style={{ color: "var(--slate-900)" }}>Field Agent Hub</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    fontWeight: 700,
                  }}
                >
                  F1–F3
                </span>
              </Link>
            </div>

            <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <LanguageSwitcher />

              <Link
                href="/field/language"
                style={{
                  fontSize: "0.825rem",
                  textDecoration: "none",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "8px",
                  backgroundColor: "var(--slate-100)",
                  color: "var(--slate-700)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontWeight: 700,
                }}
                title="Select Language / भाषा चुनें / भाषा निवडा"
              >
                🌐 Language
              </Link>

              <Link href="/field/onboard" className="btn btn-sm btn-secondary">
                👤 F1: Onboard
              </Link>
              <Link href="/field/prices" className="btn btn-sm btn-secondary">
                🏷️ F2: Prices
              </Link>
              <Link href="/field/training" className="btn btn-sm btn-secondary">
                📷 F3: AI Photos
              </Link>
              <Link href="/field/pickups" className="btn btn-sm btn-secondary">
                🚚 Pickups
              </Link>
              <form action={fieldLogoutAction} style={{ marginLeft: "0.5rem" }}>
                <button
                  type="submit"
                  className="btn btn-sm btn-secondary"
                  style={{ color: "var(--danger)" }}
                >
                  Logout
                </button>
              </form>
            </nav>
          </div>
        </header>
      )}

      <main style={{ flex: 1, maxWidth: "1360px", width: "100%", margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        {children}
      </main>

      <footer style={{ borderTop: "1px solid var(--slate-200)", padding: "1.25rem 1rem", textAlign: "center", color: "var(--slate-500)", fontSize: "0.8125rem", backgroundColor: "#ffffff" }}>
        Field Agent Operations &bull; Modules F1–F3 &bull; Ground Price Verification &amp; Collector Onboarding
      </footer>
    </div>
  );
}
