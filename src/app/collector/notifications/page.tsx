import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getUserNotifications } from "@/lib/services/notificationService";
import { prisma } from "@/lib/prisma";

export default async function CollectorNotificationsPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const notifications = await getUserNotifications(user.userId, 30);

  // Mark all unread as read
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            सूचनाएं / Notifications
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>भाव मोल-भाव एवं भुगतान अपडेट / Updates</div>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div
          style={{
            padding: "2.5rem 1rem",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            textAlign: "center",
            color: "#64748b",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔔</div>
          <div style={{ fontWeight: 600 }}>कोई नई सूचना नहीं है</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
            No notifications yet. You will receive updates on price offers, handovers, and cash payments here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {notifications.map((n) => {
            let data: Record<string, unknown> = {};
            try {
              if (n.dataJson) data = JSON.parse(n.dataJson);
            } catch {}

            const lotId = data.lotId as string | undefined;

            return (
              <div
                key={n.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                  padding: "1rem",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>{n.title}</span>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p style={{ fontSize: "0.85rem", color: "#475569", margin: 0, lineHeight: "1.4" }}>{n.body}</p>

                {lotId && (
                  <div style={{ marginTop: "0.25rem" }}>
                    <Link
                      href={`/collector/lots/${lotId}`}
                      style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}
                    >
                      लॉट देखें / View Lot &rarr;
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

