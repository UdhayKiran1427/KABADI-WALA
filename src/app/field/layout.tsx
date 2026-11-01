import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { fieldLogoutAction } from "./actions";

export default async function FieldAgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
      {session && (
        <header
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "0.75rem 1.25rem",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link href="/field" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, fontSize: "1.1rem" }}>
                <span>📋</span>
                <span style={{ color: "#1e293b" }}>Field Agent Hub</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    fontWeight: 700,
                  }}
                >
                  F1–F3
                </span>
              </Link>
            </div>

            <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link href="/field/onboard" className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}>
                👤 F1: Onboard
              </Link>
              <Link href="/field/prices" className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}>
                🏷️ F2: Prices
              </Link>
              <Link href="/field/training" className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}>
                📷 F3: AI Photos
              </Link>
              <form action={fieldLogoutAction} style={{ marginLeft: "0.5rem" }}>
                <button
                  type="submit"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </form>
            </nav>
          </div>
        </header>
      )}

      <main style={{ flex: 1, maxWidth: "900px", width: "100%", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {children}
      </main>
    </div>
  );
}

