import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { collectorLogoutAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/lib/services/notificationService";

export default async function CollectorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  let collectorCode = "";
  let unreadNotifications = 0;
  if (session) {
    unreadNotifications = await getUnreadNotificationCount(session.userId);
    const collector = await prisma.collector.findFirst({
      where: { userId: session.userId },
      select: { shortCode: true },
    });
    if (collector) {
      collectorCode = collector.shortCode;
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      {session && (
        <header
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid var(--slate-200)",
            padding: "0.75rem 1rem",
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
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <Link
                href="/collector"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, fontSize: "1.15rem" }}
              >
                <span>♻️</span>
                <span style={{ color: "var(--primary-700)", letterSpacing: "-0.01em" }}>कबाड़ीवाला</span>
                {collectorCode && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor: "var(--primary-100)",
                      color: "var(--primary-800)",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "999px",
                      fontWeight: 700,
                    }}
                  >
                    #{collectorCode}
                  </span>
                )}
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="desktop-only-flex" style={{ gap: "0.5rem", alignItems: "center" }}>
                <Link href="/collector" className="nav-link">
                  🏠 होम / Dashboard
                </Link>
                <Link href="/collector/create-lot" className="nav-link" style={{ color: "var(--primary-700)", fontWeight: 700 }}>
                  📦 + नया लॉट बनाएं
                </Link>
                <Link href="/collector/prices" className="nav-link">
                  📈 आज के भाव
                </Link>
                <Link href="/collector/ledger" className="nav-link">
                  💰 मेरी कमाई (Ledger)
                </Link>
                <Link href="/collector/drop-points" className="nav-link">
                  ⛺ ड्रॉप बॉक्स
                </Link>
                <Link href="/collector/safety" className="nav-link">
                  ⚠️ सुरक्षा नियम
                </Link>
              </nav>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <Link
                href="/collector/notifications"
                style={{
                  position: "relative",
                  fontSize: "1.15rem",
                  textDecoration: "none",
                  padding: "0.35rem 0.5rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Notifications"
              >
                🔔
                {unreadNotifications > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0px",
                      right: "0px",
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

              <span className="desktop-only" style={{ fontSize: "0.825rem", color: "var(--slate-500)", fontWeight: 500 }}>
                {session.phone}
              </span>

              <form action={collectorLogoutAction}>
                <button
                  type="submit"
                  className="btn btn-sm btn-secondary"
                  style={{
                    color: "var(--danger)",
                    borderColor: "var(--slate-200)",
                    fontWeight: 600,
                  }}
                >
                  लॉगआउट
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <main style={{ flex: 1, width: "100%", maxWidth: "1360px", margin: "0 auto", padding: "1.5rem 1rem 5rem" }}>
        {children}
      </main>

      {/* Sticky Bottom Bar on Mobile Only */}
      {session && (
        <nav className="collector-bottom-nav mobile-only">
          <div className="collector-bottom-nav-inner">
            <Link href="/collector" className="collector-nav-item">
              <span className="collector-nav-icon">🏠</span>
              <span>होम / Home</span>
            </Link>

            <Link href="/collector/create-lot" className="collector-nav-item" style={{ color: "var(--primary-700)" }}>
              <span className="collector-nav-icon">📦</span>
              <span style={{ fontWeight: 700 }}>+ नया लॉट</span>
            </Link>

            <Link href="/collector/prices" className="collector-nav-item">
              <span className="collector-nav-icon">📈</span>
              <span>आज के भाव</span>
            </Link>

            <Link href="/collector/ledger" className="collector-nav-item">
              <span className="collector-nav-icon">💰</span>
              <span>मेरी कमाई</span>
            </Link>

            <Link href="/collector/safety" className="collector-nav-item">
              <span className="collector-nav-icon">⚠️</span>
              <span>सुरक्षा</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
