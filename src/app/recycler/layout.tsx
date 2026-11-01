import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { recyclerLogoutAction } from "./actions";
import { getUnreadNotificationCount } from "@/lib/services/notificationService";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default async function RecyclerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let unreadNotifications = 0;
  if (session) {
    unreadNotifications = await getUnreadNotificationCount(session.userId);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      <header className="navbar">
        <div className="navbar-inner" style={{ maxWidth: "1440px" }}>
          <Link href="/recycler" className="brand">
            <span style={{ fontSize: "1.3rem" }}>♻️</span>
            <span>Recycler Facility Portal</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <LanguageSwitcher />

            <Link
              href="/recycler/language"
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
                <Link href="/recycler" className="nav-link">R1 Dashboard</Link>
                <Link href="/recycler/verify" className="nav-link">R2 Verify Handover</Link>
                <Link href="/recycler/rates" className="nav-link">R3 Rate Manager</Link>
                <Link href="/recycler/profile" className="nav-link">R4 Profile</Link>
                <Link
                  href="/recycler/notifications"
                  className="nav-link"
                  style={{ position: "relative", textDecoration: "none", padding: "0.35rem 0.5rem" }}
                  title="Notifications"
                >
                  🔔
                  {unreadNotifications > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "0px",
                        right: "-2px",
                        backgroundColor: "var(--danger)",
                        color: "#ffffff",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        padding: "0.1rem 0.35rem",
                        borderRadius: "999px",
                        lineHeight: 1,
                      }}
                    >
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
                <form action={recyclerLogoutAction} style={{ display: "inline" }}>
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
        Authorized E-Waste Recycler Portal &bull; Modules R1–R4 &bull; CPCB / SPCB Regulatory Compliance
      </footer>
    </div>
  );
}
