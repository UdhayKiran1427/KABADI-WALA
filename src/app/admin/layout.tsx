import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { adminLogoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="navbar">
        <div className="navbar-inner">
          <Link href="/admin" className="brand" style={{ color: "#0284c7" }}>
            🛡️ Platform Admin Dashboard
          </Link>
          {session && (
            <div className="nav-links">
              <Link href="/admin" className="nav-link">Overview</Link>
              <Link href="/admin/recyclers" className="nav-link">M1 Recyclers</Link>
              <Link href="/admin/prices" className="nav-link">M2 Prices</Link>
              <Link href="/admin/anomalies" className="nav-link">M3 Anomalies</Link>
              <Link href="/admin/dataset-health" className="nav-link">M4 Dataset &amp; AI</Link>
              <Link href="/admin/impact" className="nav-link">M5 Impact</Link>
              <Link href="/admin/team" className="nav-link">Team</Link>
              <form action={adminLogoutAction} style={{ display: "inline" }}>
                <button type="submit" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}>
                  Sign Out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main className="container" style={{ flex: 1 }}>
        {children}
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
        Platform Admin Dashboard &bull; M1–M5 Modules &bull; E-Waste Formalization
      </footer>
    </div>
  );
}

