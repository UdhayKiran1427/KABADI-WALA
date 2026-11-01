import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getUserNotifications } from "@/lib/services/notificationService";
import { prisma } from "@/lib/prisma";

export default async function RecyclerNotificationsPage() {
  const { user } = await requireRole(["RECYCLER", "ADMIN"]);

  const notifications = await getUserNotifications(user.userId, 30);

  // Mark all unread as read
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            Facility Notifications
          </h1>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Bargaining alerts, handover status, and lots</div>
        </div>
        <Link href="/recycler" className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "3rem 1rem",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔔</div>
          <div style={{ fontWeight: 600 }}>No Notifications</div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.2rem" }}>
            Incoming lot bargaining proposals and status alerts will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {notifications.map((n) => {
            let data: Record<string, unknown> = {};
            try {
              if (n.dataJson) data = JSON.parse(n.dataJson);
            } catch {}

            const lotId = data.lotId as string | undefined;

            return (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: "1rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>{n.title}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ fontSize: "0.875rem", color: "#475569", margin: 0, lineHeight: "1.5" }}>{n.body}</p>

                {lotId && (
                  <div style={{ marginTop: "0.4rem" }}>
                    <Link
                      href="/recycler"
                      className="btn btn-secondary"
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", display: "inline-block" }}
                    >
                      View on Dashboard &rarr;
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

