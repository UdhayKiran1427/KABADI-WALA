import { Check, CircleCheckBig, ClipboardList, Clock, MapPin, Phone, Truck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageTitle, PageVoice, T } from "../ui";

const STAGES = [
  { key: "REQUESTED", hi: "भेजा", en: "Sent", mr: "पाठवले", Icon: ClipboardList },
  { key: "ACCEPTED", hi: "मंज़ूर", en: "Accepted", mr: "स्वीकारले", Icon: Check },
  { key: "ON_THE_WAY", hi: "रास्ते में", en: "On the way", mr: "वाटेत", Icon: Truck },
  { key: "ARRIVED", hi: "पहुंचा", en: "Arrived", mr: "पोहोचले", Icon: MapPin },
  { key: "COMPLETED", hi: "पूरा", en: "Done", mr: "पूर्ण", Icon: CircleCheckBig },
];

export default async function PickupRequestsTimelinePage() {
  const { user } = await requireRole(["COLLECTOR", "ADMIN"]);

  const requests = await prisma.pickupRequest.findMany({
    where: { collectorId: user.userId },
    include: {
      recycler: { select: { name: true, contactPhone: true } },
      lot: { include: { category: true } },
    },
    orderBy: { slot: "desc" },
  });

  return (
    <div className="c-page">
      <PageVoice
        en={`Pickups. You have ${requests.length} pickup requests.`}
        hi={`पिकअप। आपके ${requests.length} पिकअप अनुरोध हैं।`}
        mr={`पिकअप. तुमच्या ${requests.length} पिकअप विनंत्या आहेत.`}
      />
      <PageTitle title={{ hi: "पिकअप", en: "Pickups", mr: "पिकअप" }} back="/collector" />

      {requests.length === 0 ? (
        <div className="card c-empty">
          <Truck size={36} aria-hidden="true" />
          <T hi="कोई पिकअप नहीं" en="No pickups" mr="पिकअप नाही" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {requests.map((req) => {
            const currentStageIndex = STAGES.findIndex((s) => s.key === req.status);

            return (
              <div key={req.id} className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--slate-900)" }}>
                    {(req.lot.approxWeightGrams / 1000).toFixed(1)} kg{" "}
                    <T hi={req.lot.category.nameHi} en={req.lot.category.nameEn} mr={req.lot.category.nameMr} />
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>{req.recycler.name}</div>
                </div>

                <ol className="c-steps">
                  {STAGES.map(({ key, Icon, ...label }, idx) => {
                    const isPassed = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    return (
                      <li key={key} className={`c-step ${isPassed ? "done" : ""} ${isCurrent ? "current" : ""}`}>
                        <span className="c-step-dot">
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span className="c-step-label">
                          <T {...label} />
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <span className="c-hint">
                    <Clock size={14} aria-hidden="true" />
                    {new Date(req.slot).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <a href={`tel:${req.recycler.contactPhone}`} className="btn btn-secondary">
                    <Phone size={18} aria-hidden="true" />
                    <T hi="कॉल" en="Call" mr="कॉल" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
