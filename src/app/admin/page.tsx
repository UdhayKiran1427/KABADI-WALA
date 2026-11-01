import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Building2, IndianRupee, TriangleAlert } from "lucide-react";
import { getTodayRates } from "@/lib/services/lotFlowService";

export default async function AdminOverviewPage() {
  await requireRole(["ADMIN"]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [pendingRecyclersCount, openFlagsCount, categoryCount, todayRates] = await Promise.all([
    prisma.recycler.count({ where: { authorizationStatus: "PENDING" } }),
    prisma.anomalyFlag.count({ where: { status: "OPEN" } }),
    prisma.materialCategory.count({ where: { isActive: true } }),
    getTodayRates(),
  ]);
  const pricesSetToday = Array.from(todayRates.values()).filter((r) => r.recordedAt >= startOfToday).length;

  const tiles = [
    {
      href: "/admin/prices",
      icon: IndianRupee,
      label: "Today's prices",
      value: `${pricesSetToday} / ${categoryCount}`,
      hint: pricesSetToday < categoryCount ? "Set today's prices" : "All set for today",
      urgent: pricesSetToday < categoryCount,
    },
    {
      href: "/admin/recyclers",
      icon: Building2,
      label: "Recyclers to approve",
      value: String(pendingRecyclersCount),
      hint: pendingRecyclersCount > 0 ? "Review now" : "Nothing pending",
      urgent: pendingRecyclersCount > 0,
    },
    {
      href: "/admin/anomalies",
      icon: TriangleAlert,
      label: "Open alerts",
      value: String(openFlagsCount),
      hint: openFlagsCount > 0 ? "Review now" : "No open alerts",
      urgent: openFlagsCount > 0,
    },
  ];

  return (
    <div className="r-stack">
      <h1 className="r-page-title">Overview</h1>

      <div className="grid-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="stat-box" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div className="stat-label r-inline">
                <Icon size={16} aria-hidden="true" /> {t.label}
              </div>
              <div className="stat-value" style={{ color: t.urgent ? "var(--warning)" : "var(--success)" }}>{t.value}</div>
              <div className="r-inline r-muted">
                {t.hint} <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
