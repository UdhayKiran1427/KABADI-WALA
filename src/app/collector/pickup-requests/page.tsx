import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

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

  const stages = [
    { key: "REQUESTED", labelHi: "अनुरोध भेजा", labelEn: "Requested", icon: "📝" },
    { key: "ACCEPTED", labelHi: "स्वीकार किया", labelEn: "Accepted", icon: "✓" },
    { key: "ON_THE_WAY", labelHi: "रास्ते में है", labelEn: "On the way", icon: "🚚" },
    { key: "ARRIVED", labelHi: "पहुंच गया", labelEn: "Arrived", icon: "📍" },
    { key: "COMPLETED", labelHi: "पूरा हुआ", labelEn: "Completed", icon: "🎉" },
  ];

  const narration = {
    en: `Doorstep pickup tracker. You have ${requests.length} scheduled pickup requests. Track live vehicle dispatch and arrival here.`,
    hi: `डोरस्टेप पिकअप ट्रैकर। आपके ${requests.length} पिकअप अनुरोध दर्ज हैं। लाइव वाहन स्थिति और आगमन यहाँ ट्रैक करें।`,
    mr: `घरोघरी पिकअप ट्रॅकर. तुमचे ${requests.length} पिकअप विनंत्या नोंदवल्या आहेत. थेट वाहन आणि आगमन येथे तपासा.`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="pickup-page-narration" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          href="/collector"
          className="btn btn-secondary btn-sm"
          style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
        >
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
            डोरस्टेप पिकअप स्थिति &bull; Doorstep Pickup Status
          </h1>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
            लाइव वाहन ट्रैकिंग एवं समय-सीमा &bull; Real-Time Vehicle Dispatch Tracker
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="collector-layout-wrapper">
        {/* LEFT COLUMN: Requests List & Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {requests.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                color: "var(--slate-500)",
                border: "1.5px dashed var(--slate-300)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚚</div>
              <div style={{ fontWeight: 700, color: "var(--slate-700)" }}>कोई सक्रिय पिकअप अनुरोध नहीं है</div>
              <div style={{ fontSize: "0.825rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                जब आप भारी ई-कचरे के लिए डोरस्टेप पिकअप का अनुरोध करेंगे, वाहन की लाइव स्थिति यहाँ दिखेगी।
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {requests.map((req) => {
                const currentStageIndex = stages.findIndex((s) => s.key === req.status);

                return (
                  <div
                    key={req.id}
                    className="card"
                    style={{
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
                          लॉट #{req.lot.lotRef} &bull; {req.lot.category.nameHi}
                        </h2>
                        <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                          वजन: {(req.lot.approxWeightGrams / 1000).toFixed(1)} kg &bull; 🏢 {req.recycler.name}
                        </div>
                      </div>

                      <span
                        className={req.status === "COMPLETED" ? "badge badge-success" : "badge badge-warning"}
                        style={{ fontWeight: 700 }}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* 5-Stage Visual Timeline */}
                    <div style={{ display: "flex", justifyContent: "space-between", position: "relative", margin: "0.5rem 0" }}>
                      {stages.map((stage, idx) => {
                        const isPassed = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;

                        return (
                          <div
                            key={stage.key}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              zIndex: 2,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                backgroundColor: isCurrent ? "var(--primary)" : isPassed ? "var(--primary-700)" : "var(--slate-200)",
                                color: isPassed || isCurrent ? "#ffffff" : "var(--slate-500)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1rem",
                                fontWeight: 800,
                                boxShadow: isCurrent ? "0 0 0 4px rgba(5, 150, 105, 0.2)" : "none",
                              }}
                            >
                              {stage.icon}
                            </div>
                            <div
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: isCurrent ? 800 : 600,
                                color: isCurrent ? "var(--primary-800)" : isPassed ? "var(--slate-800)" : "var(--slate-400)",
                                marginTop: "0.4rem",
                              }}
                            >
                              {stage.labelHi}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        backgroundColor: "var(--slate-50)",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--slate-200)",
                        fontSize: "0.825rem",
                        color: "var(--slate-700)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>⏰ निर्धारित समय: {new Date(req.slot).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                      <a href={`tel:${req.recycler.contactPhone}`} style={{ color: "var(--primary-700)", fontWeight: 700, textDecoration: "none" }}>
                        📞 रिसाइक्लर को कॉल करें
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Doorstep Pickup Policy (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* How Pickup Works */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.6rem" }}>
              🛵 पिकअप कैसे काम करता है?
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div><strong>1. वाहन रवानगी:</strong> रिसाइक्लर या फील्ड साथी अपनी गाड़ी लेकर आपके बताए पते के लिए निकलता है।</div>
              <div><strong>2. एसएमएस सूचना:</strong> वाहन आपके पास पहुंचने पर आपको सूचना मिलती है।</div>
              <div><strong>3. मौके पर तौल:</strong> डिजिटल कांटे से आपके सामने तौल की जाती है।</div>
              <div><strong>4. नकद भुगतान:</strong> सामान लोड होते ही नकद रुपया या फोनपे/गूगलपे से भुगतान मिलता है।</div>
            </div>
          </div>

          {/* Assistance */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              देरी हो रही है?
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              यदि पिकअप वाहन समय पर नहीं पहुंचा, तो सीधे रिसाइक्लर के नंबर पर संपर्क करें या अपने क्षेत्र के फील्ड एजेंट से सहायता लें।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
