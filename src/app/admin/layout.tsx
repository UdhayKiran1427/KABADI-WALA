import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { adminLogoutAction } from "./actions";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      <header className="navbar">
        <div className="navbar-inner" style={{ maxWidth: "1440px" }}>
          <Link href="/admin" className="brand" style={{ color: "var(--slate-900)" }}>
            <span style={{ fontSize: "1.3rem" }}>🛡️</span>
            <span>Platform Admin</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <LanguageSwitcher />

            <Link
              href="/admin/language"
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

            {session && (
              <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Link href="/admin" className="nav-link">Overview</Link>
                <Link href="/admin/recyclers" className="nav-link">M1 Recyclers</Link>
                <Link href="/admin/prices" className="nav-link">M2 Prices</Link>
                <Link href="/admin/anomalies" className="nav-link">M3 Anomalies</Link>
                <Link href="/admin/dataset-health" className="nav-link">M4 Dataset &amp; AI</Link>
                <Link href="/admin/impact" className="nav-link">M5 Impact</Link>
                <Link href="/admin/team" className="nav-link">Team</Link>
                <form action={adminLogoutAction} style={{ display: "inline" }}>
                  <button type="submit" className="btn btn-sm btn-secondary" style={{ color: "var(--danger)" }}>
                    Sign Out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container-xl" style={{ flex: 1, padding: "1.5rem 1rem 3rem" }}>
        {children}
      </main>

      <footer style={{ borderTop: "1px solid var(--slate-200)", padding: "1.25rem 1rem", textAlign: "center", color: "var(--slate-500)", fontSize: "0.8125rem", backgroundColor: "#ffffff" }}>
        Platform Admin Dashboard &bull; Modules M1–M5 &bull; Environmental Protection &amp; EPR Governance
      </footer>
    </div>
  );
}
