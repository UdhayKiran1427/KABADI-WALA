import Link from "next/link";
import { ArrowRight, Phone, ReceiptText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseHistoryQuery } from "@/lib/historyFilters";
import { RECYCLER_HISTORY_STATUSES, recyclerHistoryWhere } from "@/lib/services/historyQuery";
import { LOT_ITEMS_INCLUDE, lotItemsLabel, lotItemsOf } from "@/lib/services/lotItemsView";
import { HistoryFilters } from "@/components/HistoryFilters";

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export default async function RecyclerHistoryPage(props: {
  searchParams: Promise<{ q?: string; status?: string; material?: string; period?: string }>;
}) {
  const { dbUser } = await requireRole(["RECYCLER"]);
  const recyclerId = dbUser.recyclerId ?? "__none__";
  const filters = parseHistoryQuery(await props.searchParams, Object.keys(RECYCLER_HISTORY_STATUSES));

  const where = recyclerHistoryWhere(recyclerId, filters);

  const [deals, materials] = await Promise.all([
    prisma.lot.findMany({
      where,
      include: {
        category: true,
        ...LOT_ITEMS_INCLUDE,
        collector: { include: { user: { select: { phone: true } } } },
        transaction: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.materialCategory.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, select: { id: true, nameEn: true } }),
  ]);

  const rows = deals.map((lot) => {
    const tx = lot.transaction;
    return {
      lot,
      amount: tx ? tx.finalPricePaise ?? tx.quotedPricePaise : 0,
      isPaid: tx?.paymentStatus === "PAID",
      date: tx?.createdAt ?? lot.updatedAt,
    };
  });
  const paidTotal = rows.filter((r) => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const toPayTotal = rows.filter((r) => !r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const totalKg = rows.reduce((sum, r) => sum + r.lot.approxWeightGrams, 0) / 1000;

  return (
    <div className="r-stack">
      <h1 className="r-page-title r-inline">
        <ReceiptText size={22} aria-hidden="true" /> Order History
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
        <div className="card" style={{ padding: "1rem", marginBottom: 0 }}>
          <div className="r-muted">Paid</div>
          <div className="r-amount">{inr(paidTotal)}</div>
        </div>
        <div className="card" style={{ padding: "1rem", marginBottom: 0 }}>
          <div className="r-muted">To pay</div>
          <div className="r-amount" style={{ color: "#b45309" }}>{inr(toPayTotal)}</div>
        </div>
        <div className="card" style={{ padding: "1rem", marginBottom: 0 }}>
          <div className="r-muted">Bought</div>
          <div className="r-amount" style={{ color: "var(--slate-900)" }}>{totalKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg</div>
        </div>
      </div>

      <HistoryFilters
        basePath="/recycler/history"
        values={filters}
        statusOptions={[
          { value: "", label: "All" },
          { value: "topay", label: "To pay" },
          { value: "paid", label: "Paid" },
        ]}
        materialOptions={[{ value: "", label: "All materials" }, ...materials.map((m) => ({ value: String(m.id), label: m.nameEn }))]}
        periodOptions={[
          { value: "", label: "All time" },
          { value: "7d", label: "Last 7 days" },
          { value: "30d", label: "Last 30 days" },
          { value: "90d", label: "Last 3 months" },
        ]}
        labels={{ search: "Search collector name, phone or lot", searchButton: "Search", material: "Material", period: "Period", clear: "Clear" }}
      />

      <section className="card" style={{ padding: "1.25rem" }}>
        <div className="hf-count" style={{ marginBottom: "0.75rem" }}>
          {rows.length} {rows.length === 1 ? "order" : "orders"}
        </div>

        {rows.length === 0 ? (
          <div className="r-empty">
            <ReceiptText size={28} aria-hidden="true" />
            <div>No orders found.</div>
          </div>
        ) : (
          <div className="r-list">
            {rows.map(({ lot, amount, isPaid, date }) => (
              <div key={lot.id} className="r-item">
                <div className="r-item-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="r-item-title">
                      {lotItemsLabel(lotItemsOf(lot))}
                    </div>
                    <div className="r-muted">
                      Lot {lot.lotRef} · {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className="r-amount">{inr(amount)}</div>
                </div>

                <div className="r-meta">
                  <span>{lot.collector.name || `Collector ${lot.collector.shortCode}`}</span>
                  <a href={`tel:${lot.collector.user.phone}`}>
                    <Phone size={15} aria-hidden="true" /> {lot.collector.user.phone}
                  </a>
                </div>

                <div className="r-actions" style={{ justifyContent: "space-between" }}>
                  <span className={`badge ${isPaid ? "badge-success" : "badge-warning"}`}>{isPaid ? "Paid" : "To pay"}</span>
                  <Link href={`/recycler/deals/${lot.id}`} className={`btn btn-sm ${isPaid ? "btn-secondary" : "btn-primary"} r-inline`}>
                    {isPaid ? "View" : "Open & pay"} <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
