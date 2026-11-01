import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseHistoryQuery } from "@/lib/historyFilters";
import { COLLECTOR_HISTORY_STATUSES, collectorHistoryWhere } from "@/lib/services/historyQuery";
import { LotStatusBadge, PageTitle, PageVoice, T } from "../ui";
import { CollectorHistoryFilters } from "./CollectorHistoryFilters";

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export default async function CollectorHistoryPage(props: {
  searchParams: Promise<{ q?: string; status?: string; material?: string; period?: string }>;
}) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const filters = parseHistoryQuery(await props.searchParams, Object.keys(COLLECTOR_HISTORY_STATUSES));

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  const where = collectorHistoryWhere(collector?.id ?? "__none__", filters);

  const [lots, materials] = await Promise.all([
    prisma.lot.findMany({
      where,
      orderBy: { collectedAt: "desc" },
      take: 100,
      include: { category: true, transaction: { include: { recycler: { select: { name: true } } } }, _count: { select: { items: true } } },
    }),
    prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, nameHi: true, nameEn: true, nameMr: true },
    }),
  ]);

  let totalReceivedPaise = 0;
  let totalPendingPaise = 0;
  for (const lot of lots) {
    const amount = lot.finalPricePaise || lot.estimatedValuePaise || 0;
    if (lot.status === "COMPLETED") {
      totalReceivedPaise += amount;
    } else if (lot.status !== "CANCELLED" && lot.status !== "REJECTED") {
      totalPendingPaise += amount;
    }
  }

  const received = (totalReceivedPaise / 100).toFixed(0);
  const pending = (totalPendingPaise / 100).toFixed(0);

  return (
    <div className="c-page">
      <PageVoice
        en={`Order history. ${lots.length} lots. Received ${received} rupees. Pending ${pending} rupees.`}
        hi={`ऑर्डर इतिहास। ${lots.length} लॉट। मिले ${received} रुपये। बाकी ${pending} रुपये।`}
        mr={`ऑर्डर इतिहास. ${lots.length} लॉट. मिळाले ${received} रुपये. बाकी ${pending} रुपये.`}
      />
      <PageTitle title={{ hi: "ऑर्डर इतिहास", en: "Order history", mr: "ऑर्डर इतिहास" }} back="/collector" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div className="c-stat" style={{ backgroundColor: "var(--primary-50)", borderColor: "var(--primary-border)" }}>
          <div className="c-stat-label" style={{ color: "var(--primary-800)" }}>
            <T hi="मिले" en="Received" mr="मिळाले" />
          </div>
          <div className="c-stat-value" style={{ color: "var(--primary-900)" }}>{inr(totalReceivedPaise)}</div>
        </div>
        <div className="c-stat" style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
          <div className="c-stat-label" style={{ color: "#92400e" }}>
            <T hi="बाकी" en="Pending" mr="बाकी" />
          </div>
          <div className="c-stat-value" style={{ color: "#b45309" }}>{inr(totalPendingPaise)}</div>
        </div>
      </div>

      <CollectorHistoryFilters values={filters} materials={materials} />

      <section style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div className="hf-count">
          {lots.length} <T hi="लॉट" en={lots.length === 1 ? "lot" : "lots"} mr="लॉट" />
        </div>

        {lots.length === 0 ? (
          <div className="card c-empty">
            <Inbox size={36} aria-hidden="true" />
            <T hi="कोई लॉट नहीं मिला" en="No lots found" mr="लॉट सापडले नाहीत" />
          </div>
        ) : (
          lots.map((lot) => (
            <Link key={lot.id} href={`/collector/lots/${lot.id}`} className="card c-lot-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="c-lot-name">
                  <T hi={lot.category.nameHi} en={lot.category.nameEn} mr={lot.category.nameMr} />
                  {lot._count.items > 1 && <span style={{ color: "var(--slate-500)", fontWeight: 600 }}> +{lot._count.items - 1}</span>}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>
                  {(lot.approxWeightGrams / 1000).toFixed(1)} kg &middot;{" "}
                  <strong style={{ color: "var(--slate-900)" }}>{inr(lot.finalPricePaise || lot.estimatedValuePaise || 0)}</strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
                  {lot.collectedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {lot.transaction?.recycler && <> &middot; {lot.transaction.recycler.name}</>}
                </div>
              </div>
              <LotStatusBadge status={lot.status} />
              <ChevronRight size={20} aria-hidden="true" style={{ color: "var(--slate-400)", flexShrink: 0 }} />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
