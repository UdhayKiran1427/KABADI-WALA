import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { adminLogoutAction } from "./actions";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/recyclers", label: "Recyclers" },
  { href: "/admin/prices", label: "Prices" },
  { href: "/admin/anomalies", label: "Alerts" },
  { href: "/admin/dataset-health", label: "Data" },
  { href: "/admin/impact", label: "Impact" },
  { href: "/admin/team", label: "Team" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      <header className="navbar">
        <div className="navbar-inner r-navbar-inner" style={{ maxWidth: "1440px" }}>
          <Link href="/admin" className="brand" style={{ color: "var(--slate-900)" }}>
            <ShieldCheck size={22} aria-hidden="true" />
            <span>Admin</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <LanguageSwitcher />

            {session && (
              <nav className="r-nav" aria-label="Admin">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-link">
                    {item.label}
                  </Link>
                ))}
                <form action={adminLogoutAction} style={{ display: "inline" }}>
                  <button type="submit" className="btn btn-sm btn-secondary" style={{ color: "var(--danger)" }} aria-label="Sign out">
                    <LogOut size={16} aria-hidden="true" />
                    <span className="r-nav-label">Sign out</span>
                  </button>
                </form>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="container-xl" style={{ flex: 1, padding: "1.5rem 1rem 3rem" }}>
        {children}
      </main>
    </div>
  );
}
