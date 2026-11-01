import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/lib/services/notificationService";
import { CollectorBottomNav, CollectorNavbarClient } from "./CollectorNavbarClient";

export default async function CollectorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const unreadNotifications = session ? await getUnreadNotificationCount(session.userId) : 0;
  const collector = session
    ? await prisma.collector.findUnique({ where: { userId: session.userId }, select: { name: true } })
    : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg)" }}>
      {session && (
        <header
          style={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid var(--slate-200)",
            padding: "0.5rem 1rem",
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <CollectorNavbarClient unreadNotifications={unreadNotifications} name={collector?.name} />
          </div>
        </header>
      )}

      <main style={{ flex: 1, width: "100%", maxWidth: "1100px", margin: "0 auto", padding: "1rem 1rem 5.5rem" }}>
        {children}
      </main>

      {session && <CollectorBottomNav unreadNotifications={unreadNotifications} />}
    </div>
  );
}
