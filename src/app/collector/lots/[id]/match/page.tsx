import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { matchRecyclers, CandidateRecycler } from "@/lib/domain/matching";
import { selectRecyclerForLotAction } from "../../../actions";

export default async function MatchRecyclerPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);
  const params = await props.params;
  const searchParams = await props.searchParams;

  const lot = await prisma.lot.findUnique({
    where: { id: params.id },
    include: { category: true, collector: true },
  });

  if (!lot) {
    notFound();
  }

  if (lot.collector.userId !== user.userId) {
    redirect("/collector");
  }

  // Fetch verified recyclers accepting this category
  const recyclers = await prisma.recycler.findMany({
    include: {
      rates: {
        where: { categoryId: lot.categoryId, isCurrent: true },
      },
      ratings: {
        select: { rating: true },
      },
    },
  });

  const candidates: CandidateRecycler[] = recyclers.map((r) => {
    const activeRate = r.rates[0];
    const avgRating =
      r.ratings.length > 0
        ? r.ratings.reduce((acc, curr) => acc + curr.rating, 0) / r.ratings.length
        : 4.5;

    return {
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      authorizationStatus: r.authorizationStatus,
      authorizationValidTill: r.authorizationValidTill,
      contactPhone: r.contactPhone,
      pickupAvailable: r.pickupAvailable,
      serviceRadiusKm: r.serviceRadiusKm,
      minimumWeightGrams: r.minimumWeightGrams,
      pickupChargePaise: r.pickupChargePaise,
      ratePerKgPaise: activeRate ? activeRate.ratePerKgPaise : 0,
      rateEffectiveFrom: activeRate?.effectiveFrom || new Date(),
      averageRating: avgRating,
    };
  });

  // Run pure domain matching engine
  const matchResult = matchRecyclers(candidates, {
    collectorLat: 19.0434,
    collectorLng: 72.8567,
    categoryId: lot.categoryId,
    approxWeightGrams: lot.approxWeightGrams,
    pickupRequired: false,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            रिसाइक्लर चुनें / Choose Recycler
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            लॉट #{lot.lotRef} • {lot.category.nameHi} ({(lot.approxWeightGrams / 1000).toFixed(1)} kg)
          </div>
        </div>
      </div>

      {searchParams.error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "8px",
            fontSize: "0.85rem",
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* Matching Results */}
      {matchResult.recyclers.length === 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "2rem",
            borderRadius: "16px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>कोई अधिकृत रिसाइक्लर नहीं मिला</h3>
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            इस सामग्री के लिए 50 किमी के दायरे में कोई रिसाइक्लर उपलब्ध नहीं है।
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {matchResult.recyclers.map((r) => {
            const rateRupees = (r.ratePerKgPaise / 100).toFixed(0);
            const totalRupees = (r.expectedTotalPaise / 100).toLocaleString("en-IN");

            return (
              <div
                key={r.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  border: r.rank === 1 ? "2px solid #10b981" : "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  position: "relative",
                }}
              >
                {r.rank === 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-10px",
                      right: "16px",
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.6rem",
                      borderRadius: "999px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05rem",
                    }}
                  >
                    ★ सर्वोत्तम विकल्प / Best Match
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#1e293b" }}>{r.name}</span>
                      <span style={{ color: "#059669", fontSize: "0.85rem" }} title="Government Verified">
                        ✓
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                      📍 {r.distanceKm} km ({r.compassDirection}) • ⭐ {r.rating.toFixed(1)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#065f46" }}>₹{totalRupees}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>₹{rateRupees} / kg</div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    color: "#334155",
                  }}
                >
                  💡 {r.whyThisIsBest}
                </div>

                <form action={selectRecyclerForLotAction} style={{ marginTop: "1rem" }}>
                  <input type="hidden" name="lotId" value={lot.id} />
                  <input type="hidden" name="recyclerId" value={r.id} />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      borderRadius: "10px",
                    }}
                  >
                    यह रिसाइक्लर चुनें / Choose Recycler &rarr;
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
