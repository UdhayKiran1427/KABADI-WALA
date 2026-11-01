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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
      {session && (
        <header
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "0.75rem 1rem",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link
              href="/collector"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, fontSize: "1.1rem" }}
            >
              <span>♻️</span>
              <span style={{ color: "var(--primary)" }}>कबाड़ीवाला</span>
              {collectorCode && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    fontWeight: 700,
                  }}
                >
                  {collectorCode}
                </span>
              )}
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link
                href="/collector/notifications"
                style={{ position: "relative", fontSize: "1.1rem", textDecoration: "none" }}
                title="Notifications"
              >
                🔔
                {unreadNotifications > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-8px",
                      backgroundColor: "#ef4444",
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
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{session.phone}</span>
              <form action={collectorLogoutAction}>
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
            </div>
          </div>
        </header>
      )}

      <main style={{ flex: 1, maxWidth: "600px", width: "100%", margin: "0 auto", padding: "1rem" }}>
        {children}
      </main>

      {session && (
        <nav
          style={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "0.5rem 1rem",
            zIndex: 30,
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
            }}
          >
            <Link
              href="/collector"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.75rem",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🏠</span>
              <span>होम / Home</span>
            </Link>

            <Link
              href="/collector/create-lot"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.75rem",
                color: "var(--primary)",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>📦</span>
              <span>नया लॉट</span>
            </Link>

            <Link
              href="/collector/prices"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.75rem",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>📈</span>
              <span>आज के भाव</span>
            </Link>

            <Link
              href="/collector/ledger"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.75rem",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>💰</span>
              <span>मेरी कमाई</span>
            </Link>

            <Link
              href="/collector/safety"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.75rem",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>⚠️</span>
              <span>सुरक्षा</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

