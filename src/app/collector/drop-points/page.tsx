import { Box, Building, Calendar, Clock, MapPinOff, Navigation, Phone, Tent } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateHaversineDistanceKm } from "@/lib/domain/matching";
import { PageTitle, PageVoice, T } from "../ui";

export default async function DropPointsPage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

  const collectorLat = 19.0434;
  const collectorLng = 72.8567;

  const points = await prisma.collectionPoint.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pointsWithDistance = points
    .map((p) => {
      const distanceKm = calculateHaversineDistanceKm(collectorLat, collectorLng, p.latitude, p.longitude);
      return { ...p, distanceKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="c-page">
      <PageVoice
        en={`Drop points. ${points.length} places near you where you can drop small items like batteries, cables and phones.`}
        hi={`ड्रॉप पॉइंट। आपके पास ${points.length} जगह हैं जहाँ बैटरी, तार और फोन जैसा छोटा सामान जमा कर सकते हैं।`}
        mr={`ड्रॉप पॉइंट. तुमच्या जवळ ${points.length} ठिकाणे आहेत जिथे बॅटरी, वायर आणि फोन सारख्या लहान वस्तू जमा करू शकता.`}
      />
      <PageTitle title={{ hi: "ड्रॉप पॉइंट", en: "Drop points", mr: "ड्रॉप पॉइंट" }} back="/collector" />

      {pointsWithDistance.length === 0 ? (
        <div className="card c-empty">
          <MapPinOff size={36} aria-hidden="true" />
          <T hi="कोई ड्रॉप पॉइंट नहीं" en="No drop points" mr="ड्रॉप पॉइंट नाही" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {pointsWithDistance.map((p) => {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
            const TypeIcon = p.type === "CAMP" ? Tent : p.type === "CENTER" ? Building : Box;

            return (
              <div key={p.id} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span className="c-tile-icon">
                    <TypeIcon size={22} aria-hidden="true" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--slate-900)" }}>{p.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>{p.address}</div>
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary-800)", whiteSpace: "nowrap" }}>
                    {p.distanceKm.toFixed(1)} km
                  </div>
                </div>

                {(p.operatingHours || p.operatingDates) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 1rem" }}>
                    {p.operatingHours && (
                      <span className="c-hint">
                        <Clock size={14} aria-hidden="true" /> {p.operatingHours}
                      </span>
                    )}
                    {p.operatingDates && (
                      <span className="c-hint">
                        <Calendar size={14} aria-hidden="true" /> {p.operatingDates}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg" style={{ flex: 1 }}>
                    <Navigation size={18} aria-hidden="true" />
                    <T hi="रास्ता" en="Directions" mr="रस्ता" />
                  </a>
                  {p.contactPhone && (
                    <a href={`tel:${p.contactPhone}`} className="btn btn-secondary btn-lg" aria-label="कॉल / Call">
                      <Phone size={18} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
