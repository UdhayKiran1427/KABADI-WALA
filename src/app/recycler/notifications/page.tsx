import Link from "next/link";
import { ArrowRight, BellOff } from "lucide-react";
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
    <div className="r-stack" style={{ maxWidth: "760px", margin: "0 auto" }}>
      <h1 className="r-page-title">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="card r-empty">
          <BellOff size={32} aria-hidden="true" />
          <div>No notifications yet.</div>
        </div>
      ) : (
        <div className="r-list">
          {notifications.map((n) => {
            let data: Record<string, unknown> = {};
            try {
              if (n.dataJson) data = JSON.parse(n.dataJson);
            } catch {}

            const lotId = data.lotId as string | undefined;

            return (
              <div key={n.id} className="r-item">
                <div className="r-item-head">
                  <span className="r-item-title">{n.title}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--slate-400)" }}>
                    {new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                <p style={{ fontSize: "0.9rem", color: "var(--slate-600)", lineHeight: 1.5 }}>{n.body}</p>

                {lotId && (
                  <Link href="/recycler" className="btn btn-sm btn-secondary" style={{ alignSelf: "flex-start" }}>
                    Open dashboard <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
