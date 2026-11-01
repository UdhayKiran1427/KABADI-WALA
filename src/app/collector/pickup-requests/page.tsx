import Link from "next/link";
import { ArrowRight, Check, CircleCheckBig, ClipboardList, Clock, FastForward, MapPin, Phone, Truck, X } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageTitle, PageVoice, T } from "../ui";
import { kg } from "@/lib/format";
import { simulateNextPickupStatusAction, cancelPickupRequestAction } from "../actions";

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
      <PageTitle title={{ hi: "पिकअप अनुरोध", en: "Pickups", mr: "पिकअप विनंती" }} back="/collector" />

      {requests.length === 0 ? (
        <div className="card c-empty">
          <Truck size={36} aria-hidden="true" />
          <T hi="कोई पिकअप नहीं" en="No pickups" mr="पिकअप नाही" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {requests.map((req) => {
            const currentStageIndex = STAGES.findIndex((s) => s.key === req.status);
            const isCompleted = req.status === "COMPLETED";
            const isCancelled = req.status === "CANCELLED";

            return (
              <div
                key={req.id}
                className="card"
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  border: isCompleted ? "1.5px solid var(--primary, #16a34a)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--slate-900)" }}>
                      {kg(req.lot.approxWeightGrams)} kg{" "}
                      <T hi={req.lot.category.nameHi} en={req.lot.category.nameEn} mr={req.lot.category.nameMr} />
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>{req.recycler.name}</div>
                    {req.landmark && (
                      <div style={{ fontSize: "0.775rem", color: "var(--primary-800)", marginTop: "0.2rem" }}>
                        📍 {req.landmark}
                      </div>
                    )}
                  </div>

                  <span
                    className={`badge ${
                      isCompleted
                        ? "badge-success"
                        : isCancelled
                        ? "badge-danger"
                        : req.status === "ON_THE_WAY"
                        ? "badge-warning"
                        : "badge-neutral"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Progress Steps Timeline */}
                {!isCancelled ? (
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
                ) : (
                  <div className="alert alert-danger" style={{ marginBottom: 0, fontSize: "0.825rem" }}>
                    विनंती रद्द / Cancelled: {req.cancellationReason || "Collector cancelled request"}
                  </div>
                )}

                {/* ETA Badge when ON_THE_WAY */}
                {req.status === "ON_THE_WAY" && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "var(--primary-50, #f0fdf4)",
                      border: "1px solid var(--primary-border, #86efac)",
                      borderRadius: "6px",
                      fontSize: "0.825rem",
                      fontWeight: 700,
                      color: "var(--primary-900, #14532d)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Truck size={16} />
                    <span>
                      <T
                        hi={`गाड़ी रास्ते में है · ETA: ~${req.etaMinutes ?? 25} मिनट`}
                        en={`Vehicle is on the way · ETA: ~${req.etaMinutes ?? 25} mins`}
                        mr={`गाडी वाटेत आहे · अंदाजे ~${req.etaMinutes ?? 25} मिनिटे`}
                      />
                    </span>
                  </div>
                )}

                {/* Slot & Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span className="c-hint">
                    <Clock size={14} aria-hidden="true" />
                    {new Date(req.slot).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {req.recycler.contactPhone && (
                      <a href={`tel:${req.recycler.contactPhone}`} className="btn btn-secondary btn-sm" style={{ padding: "0.3rem 0.6rem" }}>
                        <Phone size={14} aria-hidden="true" />
                        <T hi="कॉल" en="Call" mr="कॉल" />
                      </a>
                    )}

                    {isCompleted ? (
                      <Link href={`/collector/lots/${req.lotId}`} className="btn btn-primary btn-sm" style={{ padding: "0.3rem 0.6rem" }}>
                        <T hi="लॉट देखें" en="View Lot" mr="लॉट पहा" />
                        <ArrowRight size={14} />
                      </Link>
                    ) : !isCancelled ? (
                      <form action={cancelPickupRequestAction}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <button type="submit" className="btn btn-secondary btn-sm c-danger-text" style={{ padding: "0.3rem 0.6rem" }}>
                          <X size={14} />
                          <T hi="रद्द करें" en="Cancel" mr="रद्द करा" />
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                {/* GEO G8.3: Debug simulator button to advance status */}
                {!isCompleted && !isCancelled && (
                  <form action={simulateNextPickupStatusAction} style={{ borderTop: "1px dashed var(--slate-200)", paddingTop: "0.5rem" }}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm btn-block"
                      style={{ fontSize: "0.75rem", padding: "0.3rem" }}
                      title="Test helper for evaluator"
                    >
                      <FastForward size={14} />
                      <T
                        hi="अगला चरण टेस्ट करें (Simulate next status)"
                        en="Simulate next status (Demo)"
                        mr="पुढील टप्पा टेस्ट करा"
                      />
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
