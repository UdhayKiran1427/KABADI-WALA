import Link from "next/link";
import { ArrowRight, BellOff } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getUserNotifications } from "@/lib/services/notificationService";
import { prisma } from "@/lib/prisma";
import { PageTitle, PageVoice, T } from "../ui";

export default async function CollectorNotificationsPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const notifications = await getUserNotifications(user.userId, 30);

  // Mark all unread as read
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true },
  });

  const latest = notifications[0];

  return (
    <div className="c-page">
      <PageVoice
        en={latest ? `Latest alert: ${latest.title}. ${latest.body}` : "No alerts."}
        hi={latest ? `नई सूचना: ${latest.title}। ${latest.body}` : "कोई सूचना नहीं।"}
        mr={latest ? `नवीन सूचना: ${latest.title}. ${latest.body}` : "सूचना नाही."}
      />
      <PageTitle title={{ hi: "सूचनाएं", en: "Alerts", mr: "सूचना" }} back="/collector" />

      {notifications.length === 0 ? (
        <div className="card c-empty">
          <BellOff size={36} aria-hidden="true" />
          <T hi="कोई सूचना नहीं" en="No alerts" mr="सूचना नाही" />
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
              <div key={n.id} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--slate-900)" }}>{n.title}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--slate-400)", whiteSpace: "nowrap" }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p style={{ fontSize: "0.9rem", color: "var(--slate-600)", margin: 0, lineHeight: 1.4 }}>{n.body}</p>

                {lotId && (
                  <Link href={`/collector/lots/${lotId}`} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}>
                    <T hi="लॉट देखें" en="View lot" mr="लॉट पहा" />
                    <ArrowRight size={16} aria-hidden="true" />
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
