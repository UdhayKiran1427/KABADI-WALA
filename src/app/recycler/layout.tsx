import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { recyclerLogoutAction } from "./actions";

export default async function RecyclerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="navbar">
        <div className="navbar-inner">
          <Link href="/recycler" className="brand">
            ♻️ Recycler Facility Portal
          </Link>
          {session && (
            <div className="nav-links">
              <Link href="/recycler" className="nav-link">R1 Dashboard</Link>
              <Link href="/recycler/verify" className="nav-link">R2 Verify Handover</Link>
              <Link href="/recycler/rates" className="nav-link">R3 Rate Manager</Link>
              <Link href="/recycler/profile" className="nav-link">R4 Profile</Link>
              <form action={recyclerLogoutAction} style={{ display: "inline" }}>
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
        E-Waste Recycler Portal &bull; R1–R4 Wireframe Implementation
      </footer>
    </div>
  );
}

