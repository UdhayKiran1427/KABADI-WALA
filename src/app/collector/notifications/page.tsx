import Link from "next/link";
import { ArrowRight, BellOff } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getUserNotifications } from "@/lib/services/notificationService";
import { prisma } from "@/lib/prisma";
import { PageTitle, PageVoice, T } from "../ui";
import { notificationText } from "@/lib/i18n/notificationText";

export default async function CollectorNotificationsPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const [notifications, materials] = await Promise.all([
    getUserNotifications(user.userId, 30),
    prisma.materialCategory.findMany({ select: { nameEn: true, nameHi: true, nameMr: true } }),
  ]);

  // Mark all unread as read
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true },
  });

  const latest = notifications[0] ? notificationText(notifications[0].title, notifications[0].body, materials) : null;

  return (
    <div className="c-page">
      <PageVoice
        en={latest ? `Latest alert: ${latest.title.en}. ${latest.body.en}` : "No alerts."}
        hi={latest ? `नई सूचना: ${latest.title.hi}। ${latest.body.hi}` : "कोई सूचना नहीं।"}
        mr={latest ? `नवीन सूचना: ${latest.title.mr}. ${latest.body.mr}` : "सूचना नाही."}
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
            const text = notificationText(n.title, n.body, materials);

            return (
              <div key={n.id} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--slate-900)" }}>
                    <T {...text.title} />
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--slate-400)", whiteSpace: "nowrap" }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <p style={{ fontSize: "0.9rem", color: "var(--slate-600)", margin: 0, lineHeight: 1.4 }}>
                  <T {...text.body} />
                </p>

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
