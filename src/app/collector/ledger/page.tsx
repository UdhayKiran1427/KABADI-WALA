import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { LotStatusBadge, PageTitle, PageVoice, T } from "../ui";

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export default async function CollectorLedgerPage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const collector = await prisma.collector.findFirst({
    where: { userId: user.userId },
  });

  const collectorId = collector?.id;

  const lots = collectorId
    ? await prisma.lot.findMany({
        where: { collectorId },
        orderBy: { collectedAt: "desc" },
        include: { category: true },
      })
    : [];

  let totalReceivedPaise = 0;
  let totalPendingPaise = 0;

  for (const lot of lots) {
    const finalAmount = lot.finalPricePaise || lot.estimatedValuePaise || 0;
    if (lot.status === "COMPLETED") {
      totalReceivedPaise += finalAmount;
    } else if (lot.status !== "CANCELLED" && lot.status !== "REJECTED") {
      totalPendingPaise += finalAmount;
    }
  }

  const received = (totalReceivedPaise / 100).toFixed(0);
  const pending = (totalPendingPaise / 100).toFixed(0);

  return (
    <div className="c-page">
      <PageVoice
        en={`My earnings. Received ${received} rupees. Pending ${pending} rupees.`}
        hi={`मेरी कमाई। मिले ${received} रुपये। बाकी ${pending} रुपये।`}
        mr={`माझी कमाई. मिळाले ${received} रुपये. बाकी ${pending} रुपये.`}
      />
      <PageTitle title={{ hi: "मेरी कमाई", en: "My earnings", mr: "माझी कमाई" }} back="/collector" />

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

      <section style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <h2 className="c-section-title">
          <T hi="सभी लॉट" en="All lots" mr="सर्व लॉट" />
        </h2>

        {lots.length === 0 ? (
          <div className="card c-empty">
            <Inbox size={36} aria-hidden="true" />
            <T hi="अभी कोई लॉट नहीं" en="No lots yet" mr="अजून लॉट नाही" />
          </div>
        ) : (
          lots.map((lot) => (
            <Link key={lot.id} href={`/collector/lots/${lot.id}`} className="card c-lot-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="c-lot-name">
                  <T hi={lot.category.nameHi} en={lot.category.nameEn} mr={lot.category.nameMr} />
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>
                  {(lot.approxWeightGrams / 1000).toFixed(1)} kg &middot;{" "}
                  <strong style={{ color: "var(--slate-900)" }}>{inr(lot.finalPricePaise || lot.estimatedValuePaise || 0)}</strong>
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
