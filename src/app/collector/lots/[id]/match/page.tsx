import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { matchRecyclers, CandidateRecycler } from "@/lib/domain/matching";
import { selectRecyclerForLotAction } from "../../../actions";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function MatchRecyclerPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; areaId?: string }>;
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

  if (user.role !== "ADMIN" && lot.collector.userId !== user.userId) {
    redirect("/collector");
  }

  // G1 & C20: Fetch area centroids for manual locality fallback
  const areaCentroids = await prisma.areaCentroid.findMany({
    orderBy: { area: "asc" },
  });

  let collectorLat = 19.0434;
  let collectorLng = 72.8567;
  let currentAreaName = "Dharavi (Central Mumbai)";

  if (searchParams.areaId) {
    const selectedCentroid = areaCentroids.find((c) => c.id === searchParams.areaId);
    if (selectedCentroid) {
      collectorLat = selectedCentroid.latitude;
      collectorLng = selectedCentroid.longitude;
      currentAreaName = `${selectedCentroid.area}, ${selectedCentroid.district}`;
    }
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

  // Run pure domain matching engine with expanding radius (5 > 10 > 25 > 50km)
  const matchResult = matchRecyclers(candidates, {
    collectorLat,
    collectorLng,
    categoryId: lot.categoryId,
    approxWeightGrams: lot.approxWeightGrams,
    pickupRequired: false,
  });

  const narration = {
    en: `Match verified recyclers for ${lot.category.nameEn}. Found ${matchResult.recyclers.length} verified facilities. Compare price, distance, and pickup options to choose your buyer.`,
    hi: `पास के अधिकृत रिसायकलर खोजें। ${lot.category.nameHi} के लिए ${matchResult.recyclers.length} अधिकृत फैक्ट्रियां मिली हैं। सर्वोत्तम भाव और दूरी देखकर अपना रिसायकलर चुनें।`,
    mr: `जवळील अधिकृत रिसायकलर शोधा. ${lot.category.nameMr || lot.category.nameHi} साठी ${matchResult.recyclers.length} अधिकृत फॅक्टरी उपलब्ध आहेत. सर्वोत्तम दर आणि अंतर पाहून रिसायकलर निवडा.`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="match-page-narration" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/collector" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
            &larr;
          </Link>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
              पास के रिसाइक्लर / Nearest Recycler
            </h1>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              लॉट #{lot.lotRef} • {lot.category.nameHi} ({(lot.approxWeightGrams / 1000).toFixed(1)} kg)
            </div>
          </div>
        </div>

        {/* C7 Recycler Match Audio Speaker */}
        <VoiceSpeaker screenKey="C7_RECYCLER_MATCH" size="md" />
      </div>

      {/* G1 & C20: Location Badge & Locality Fallback Selector */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          padding: "0.875rem 1rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "1.2rem" }}>📍</span>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>खोज क्षेत्र / Current Location:</div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1e293b" }}>{currentAreaName}</div>
            </div>
          </div>

          <form method="GET" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <select
              name="areaId"
              defaultValue={searchParams.areaId || ""}
              className="input"
              style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", borderRadius: "8px" }}
              // @ts-expect-error inline submit
              onChange="this.form.submit()"
            >
              <option value="">क्षेत्र बदलें / Change Area (C20)</option>
              {areaCentroids.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.area} ({c.district})
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit" className="btn btn-secondary" style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}>
                बदलें
              </button>
            </noscript>
          </form>
        </div>

        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#64748b", display: "flex", gap: "0.75rem" }}>
          <span>त्रिज्या / Search Radius: <strong>{matchResult.searchRadiusKm} km</strong></span>
          <span>उपलब्ध / Found: <strong>{matchResult.totalFound}</strong></span>
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
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>50 किमी के दायरे में कोई रिसाइक्लर नहीं मिला</h3>
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.25rem", marginBottom: "1.25rem" }}>
            No authorized recyclers found within 50 km for this material.
          </p>

          {/* G6: Demand / Coverage Gap Request */}
          <form action="/api/v1/coverage-requests" method="POST">
            <input type="hidden" name="categoryId" value={lot.categoryId} />
            <input type="hidden" name="approxWeightGrams" value={lot.approxWeightGrams} />
            <input type="hidden" name="latitude" value={collectorLat} />
            <input type="hidden" name="longitude" value={collectorLng} />
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ fontSize: "0.85rem", padding: "0.6rem 1rem" }}
            >
              🔔 जब नया रिसाइक्लर आए तो मुझे सूचित करें / Request Coverage (G6)
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {matchResult.recyclers.map((r) => {
            const rateRupees = (r.ratePerKgPaise / 100).toFixed(0);
            const totalRupees = (r.expectedTotalPaise / 100).toLocaleString("en-IN");

            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`;
            const whatsappUrl = `https://wa.me/91${r.contactPhone}?text=Hello%20${encodeURIComponent(r.name)},%20I%20have%20an%20e-waste%20lot%20(${lot.lotRef})%20for%20handover.`;

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
                    ★ सर्वोत्तम विकल्प / Best Match (Rank #1)
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
                      📍 <strong>{r.distanceKm} km</strong> ({r.compassDirection}) • ⭐ {r.rating.toFixed(1)}
                      {r.pickupAvailable && " • 🚚 Doorstep Pickup Available"}
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

                {/* G4: Direct Action Buttons (Directions, Call, WhatsApp) */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.45rem", fontSize: "0.8rem", textAlign: "center" }}
                  >
                    🗺️ रास्ता देखें (Go There)
                  </a>
                  <a
                    href={`tel:${r.contactPhone}`}
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                    title="Call Recycler"
                  >
                    📞
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem", color: "#16a34a" }}
                    title="WhatsApp Recycler"
                  >
                    💬
                  </a>
                </div>

                <form action={selectRecyclerForLotAction} style={{ marginTop: "0.75rem" }}>
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
