import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { collectorLogoutAction } from "./actions";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/lib/services/notificationService";
import { CollectorNavbarClient } from "./CollectorNavbarClient";

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
            padding: "0.6rem 1rem",
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
            }}
          >
            <CollectorNavbarClient
              collectorCode={collectorCode}
              phone={session.phone}
              unreadNotifications={unreadNotifications}
              logoutAction={collectorLogoutAction}
            />
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
