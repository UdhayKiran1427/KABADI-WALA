"use client";

import React from "react";
import Link from "next/link";
import { useVoice } from "@/components/voice/VoiceLanguageContext";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

interface CollectorDashboardClientProps {
  collector: {
    shortCode?: string;
    operatingArea?: string | null;
  } | null;
  activeCount: number;
  recentLots: Array<{
    id: string;
    lotRef: string;
    approxWeightGrams: number;
    status: string;
    category: {
      nameEn: string;
      nameHi: string;
      nameMr?: string | null;
      code: string;
    };
    handovers: Array<{
      verificationCode: string;
      status: string;
    }>;
  }>;
  categories: Array<{
    id: number;
    nameEn: string;
    nameHi: string;
    nameMr?: string | null;
    code: string;
  }>;
  currentRates: Array<{
    categoryId: number;
    ratePerKgPaise: number;
  }>;
  verifiedRecyclers: Array<{
    id: string;
    name: string;
    address: string;
    contactPhone: string;
    pickupAvailable: boolean;
  }>;
}

export function CollectorDashboardClient({
  collector,
  activeCount,
  recentLots,
  categories,
  currentRates,
  verifiedRecyclers,
}: CollectorDashboardClientProps) {
  const { textLanguage, voiceLanguage, speak, speakingId, stop } = useVoice();
  const isEn = textLanguage === "EN";

  // Comprehensive page narration scripts
  const pageNarration = {
    en: `Welcome back, Collector ${collector?.shortCode ? "#" + collector.shortCode : ""}. You have ${activeCount} active lots. Payout is available in cash or UPI. Today's scrap rates include cables at 620 rupees per kg, circuit boards at 340 rupees per kg. Tap Create New Lot to add a lot.`,
    hi: `नमस्ते, कलेक्टर ${collector?.shortCode ? "#" + collector.shortCode : ""}. आपके ${activeCount} सक्रिय लॉट हैं। भुगतान नकद या यूपीआई द्वारा उपलब्ध है। आज के लाइव भाव: केबल 620 रुपये और सर्किट बोर्ड 340 रुपये प्रति किलो। नया लॉट बनाने के लिए हरा बटन दबाएं।`,
    mr: `नमस्कार, कलेक्टर ${collector?.shortCode ? "#" + collector.shortCode : ""}. तुमचे ${activeCount} सक्रिय लॉट आहेत. रोख किंवा यूपीआय द्वारे पेमेंट उपलब्ध आहे. आजचे भाव: केबल 620 रुपये आणि सर्किट बोर्ड 340 रुपये प्रति किलो. नवीन लॉट तयार करण्यासाठी बटण दाबा.`,
  };

  const handleTileSpeak = (
    e: React.MouseEvent,
    id: string,
    enText: string,
    hiText: string,
    mrText: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (speakingId === id) {
      stop();
      return;
    }

    const textToSpeak =
      voiceLanguage === "EN" ? enText : voiceLanguage === "MR" ? mrText : hiText;
    speak(textToSpeak, id);
  };

  return (
    <div className="collector-layout-wrapper">
      {/* LEFT COLUMN: Main Collector Mobile & Desktop Console */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
        {/* Prominent Language & Voice Control Bar */}
        <CollectorControlToolbar
          pageNarration={pageNarration}
          narrationId="dashboard-overview"
        />

        {/* Welcome Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)",
            color: "#ffffff",
            padding: "1.5rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 8px 20px -4px rgba(5, 150, 105, 0.3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
            <div>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.85)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {isEn ? "WELCOME &bull; KABADIWALA" : "नमस्ते &bull; Welcome"}
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.01em", marginTop: "0.15rem" }}>
                {collector?.shortCode
                  ? isEn
                    ? `Collector #${collector.shortCode}`
                    : `कलेक्टर #${collector.shortCode}`
                  : isEn
                  ? "Collector Partner"
                  : "कबाड़ीवाला मित्र"}
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={(e) =>
                  handleTileSpeak(
                    e,
                    "welcome-banner",
                    `Welcome, Collector ${collector?.shortCode || ""}. Location: ${
                      collector?.operatingArea || "Mumbai"
                    }. Active lots: ${activeCount}. Payout method: Cash or UPI.`,
                    `नमस्ते, कलेक्टर ${collector?.shortCode || ""}। आपका क्षेत्र है ${
                      collector?.operatingArea || "मुंबई"
                    }। सक्रिय लॉट: ${activeCount}। भुगतान विधि: नकद या यूपीआई।`,
                    `नमस्कार, कलेक्टर ${collector?.shortCode || ""}. परिसर: ${
                      collector?.operatingArea || "मुंबई"
                    }. सक्रिय लॉट: ${activeCount}. पेमेंट पद्धत: रोख किंवा यूपीआय.`
                  )
                }
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.25)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                }}
                title={isEn ? "Listen to Welcome & Stats" : "स्वागत व आँकड़े सुनें"}
              >
                {speakingId === "welcome-banner" ? "🔊" : "🔈"}
              </button>

              <span
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(4px)",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                }}
              >
                📍 {collector?.operatingArea || "Mumbai"}
              </span>
            </div>
          </div>

          <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                padding: "0.75rem 0.875rem",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.725rem", fontWeight: 600 }}>
                {isEn ? "Active Lots" : "सक्रिय लॉट / Active Lots"}
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, marginTop: "0.15rem" }}>
                {activeCount}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                padding: "0.75rem 0.875rem",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.725rem", fontWeight: 600 }}>
                {isEn ? "Payout Method" : "भुगतान विधि / Payout"}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.25rem" }}>
                💵 {isEn ? "Cash / UPI" : "नकद / UPI"}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Main Action Tiles with Individual Audio Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
          {/* Tile 1: Create Lot */}
          <Link
            href="/collector/create-lot"
            className="action-tile"
            style={{ borderColor: "var(--primary-border)", background: "#ffffff", position: "relative" }}
          >
            <button
              type="button"
              onClick={(e) =>
                handleTileSpeak(
                  e,
                  "tile-create-lot",
                  "Create new scrap lot. Select waste category like circuit boards, cables, or batteries. Set weight to see estimated payout instantly, then match a recycler.",
                  "नया लॉट बनाएं। कचरे का प्रकार चुनें, जैसे सर्किट बोर्ड, तार या बैटरी। वजन सेट करें और तुरंत अंदाजे कमाई देखें।",
                  "नवीन लॉट तयार करा. कचऱ्याचा प्रकार निवडा, जसे सर्किट बोर्ड, केबल किंवा बॅटरी. वजन सेट करा आणि अंदाजे किंमत पहा."
                )
              }
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: speakingId === "tile-create-lot" ? "var(--primary-600)" : "#f1f5f9",
                color: speakingId === "tile-create-lot" ? "#ffffff" : "#475569",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              title={isEn ? "Hear instructions" : "आवाज सुनें"}
            >
              🔊
            </button>
            <div className="action-tile-icon" style={{ backgroundColor: "var(--primary-100)", color: "var(--primary-800)" }}>
              📦
            </div>
            <div className="action-tile-title" style={{ color: "var(--primary-800)" }}>
              {isEn ? "Create New Lot" : "नया लॉट बनाएं"}
            </div>
            <div className="action-tile-subtitle">
              {isEn ? "Circuit boards, cables, batteries" : "Create New Scrap Lot"}
            </div>
          </Link>

          {/* Tile 2: Today's Prices */}
          <Link href="/collector/prices" className="action-tile" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) =>
                handleTileSpeak(
                  e,
                  "tile-prices",
                  "Today's scrap market rates. Live prices from Mumbai scrap markets and authorized recyclers. Tap any row to hear current rates.",
                  "आज के भाव। मुम्बई स्क्रैप मार्केट और अधिकृत रिसायकलर के ताज़ा दर। किसी भी श्रेणी पर टैप करके भाव सुनें।",
                  "आजचे बाजार भाव. स्क्रॅप मार्केट आणि अधिकृत रिसायकलर्सचे थेट दर. भाव ऐकण्यासाठी टॅप करा."
                )
              }
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: speakingId === "tile-prices" ? "#1d4ed8" : "#f1f5f9",
                color: speakingId === "tile-prices" ? "#ffffff" : "#475569",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              title={isEn ? "Hear instructions" : "आवाज सुनें"}
            >
              🔊
            </button>
            <div className="action-tile-icon" style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
              📈
            </div>
            <div className="action-tile-title">
              {isEn ? "Today's Prices" : "आज के भाव"}
            </div>
            <div className="action-tile-subtitle">
              {isEn ? "Live scrap market rates / kg" : "Today's Scrap Rates"}
            </div>
          </Link>

          {/* Tile 3: My Earnings */}
          <Link href="/collector/ledger" className="action-tile" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) =>
                handleTileSpeak(
                  e,
                  "tile-ledger",
                  "My earnings ledger. View all received payments, cash and UPI payouts, and pending amounts.",
                  "मेरी कमाई। कुल प्राप्त राशि, नकद और यूपीआई भुगतान, तथा बाकी पैसों का पूरा हिसाब यहाँ देखें।",
                  "माझी कमाई. मिळालेली रोख रक्कम, यूपीआय पेमेंट आणि बाकी पैशांचा हिशोब येथे पहा."
                )
              }
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: speakingId === "tile-ledger" ? "#b45309" : "#f1f5f9",
                color: speakingId === "tile-ledger" ? "#ffffff" : "#475569",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              title={isEn ? "Hear instructions" : "आवाज सुनें"}
            >
              🔊
            </button>
            <div className="action-tile-icon" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
              💰
            </div>
            <div className="action-tile-title">
              {isEn ? "My Earnings" : "मेरी कमाई"}
            </div>
            <div className="action-tile-subtitle">
              {isEn ? "Cash & UPI payout ledger" : "Earnings & Payouts"}
            </div>
          </Link>

          {/* Tile 4: Safety Rules */}
          <Link href="/collector/safety" className="action-tile" style={{ borderColor: "#fecaca", position: "relative" }}>
            <button
              type="button"
              onClick={(e) =>
                handleTileSpeak(
                  e,
                  "tile-safety",
                  "Safety guidelines. Protect your health. Do not burn cables, do not use acid, do not dismantle batteries, and do not smash screens.",
                  "सुरक्षा नियम। ई-कचरे का काम करते समय स्वास्थ्य का ध्यान रखें। तार न जलाएं, एसिड न लगाएं, बैटरी न खोलें और स्क्रीन न तोड़ें।",
                  "सुरक्षा नियम. ई-कचरा हाताळताना काळजी घ्या. वायर जाळू नका, अ‍ॅसिड वापरू नका, बॅटरी फोडू नका आणि स्क्रीन तोडू नका."
                )
              }
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: speakingId === "tile-safety" ? "#b91c1c" : "#f1f5f9",
                color: speakingId === "tile-safety" ? "#ffffff" : "#475569",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              title={isEn ? "Hear instructions" : "आवाज सुनें"}
            >
              🔊
            </button>
            <div className="action-tile-icon" style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
              ⚠️
            </div>
            <div className="action-tile-title" style={{ color: "#991b1b" }}>
              {isEn ? "Safety Rules" : "सुरक्षा नियम"}
            </div>
            <div className="action-tile-subtitle">
              {isEn ? "4 critical health guidelines" : "4 Critical Safety Rules"}
            </div>
          </Link>
        </div>

        {/* Geolocation Shortcuts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Link
            href="/collector/drop-points"
            className="card card-interactive"
            style={{
              padding: "0.875rem 0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>⛺</span>
            <div>
              <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--slate-800)" }}>
                {isEn ? "Drop Points & Camps" : "ड्रॉप बॉक्स / कैंप"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--slate-500)" }}>
                {isEn ? "Nearby collection bins" : "Nearby Drop Points"}
              </div>
            </div>
          </Link>

          <Link
            href="/collector/pickup-requests"
            className="card card-interactive"
            style={{
              padding: "0.875rem 0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>🚚</span>
            <div>
              <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--slate-800)" }}>
                {isEn ? "Pickup Requests" : "पिकअप स्थिति"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--slate-500)" }}>
                {isEn ? "Track vehicle dispatch" : "Pickup Requests"}
              </div>
            </div>
          </Link>
        </div>

        {/* Active Lots Section */}
        <div style={{ marginTop: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
                {isEn ? "Recent Lots" : "हाल के लॉट &bull; Recent Lots"}
              </h2>
              <button
                type="button"
                onClick={(e) =>
                  handleTileSpeak(
                    e,
                    "recent-lots-narration",
                    `Recent lots. You have ${recentLots.length} recorded lots. Check the status or create a new lot.`,
                    `हाल के लॉट। आपके ${recentLots.length} लॉट दर्ज हैं। इनकी स्थिति जांचें या नया लॉट जोड़ें।`,
                    `नुकतेच लॉट. तुमचे ${recentLots.length} लॉट नोंदवले आहेत. स्थिती तपासा किंवा नवीन लॉट जोडा.`
                  )
                }
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
                title={isEn ? "Listen to Recent Lots Status" : "लॉट स्थिति सुनें"}
              >
                {speakingId === "recent-lots-narration" ? "🔊" : "🔈"}
              </button>
            </div>

            <Link
              href="/collector/create-lot"
              style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}
            >
              {isEn ? "+ Create New" : "+ नया जोड़ें"}
            </Link>
          </div>

          {recentLots.length === 0 ? (
            <div
              style={{
                padding: "2.5rem 1.5rem",
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                color: "var(--slate-500)",
                border: "1.5px dashed var(--slate-300)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📦</div>
              <div style={{ fontWeight: 600, color: "var(--slate-700)" }}>
                {isEn ? "No active lots found" : "कोई लॉट नहीं मिला / No active lots"}
              </div>
              <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                {isEn
                  ? "You have not registered any scrap lot yet."
                  : "आपने अभी तक कोई स्क्रैप लॉट दर्ज नहीं किया है।"}
              </div>
              <Link
                href="/collector/create-lot"
                className="btn btn-sm btn-primary"
                style={{ marginTop: "1rem", display: "inline-block" }}
              >
                {isEn ? "Create First Lot &rarr;" : "पहला लॉट बनाएं / Create First Lot &rarr;"}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {recentLots.map((lot) => {
                const statusBadge =
                  lot.status === "COMPLETED"
                    ? "badge badge-success"
                    : lot.status === "HANDED_OVER"
                    ? "badge badge-info"
                    : lot.status === "MATCHED"
                    ? "badge badge-warning"
                    : "badge badge-neutral";

                const statusText =
                  lot.status === "COMPLETED"
                    ? isEn
                      ? "✓ Completed (Paid)"
                      : "✓ पूरा हुआ (Paid)"
                    : lot.status === "HANDED_OVER"
                    ? isEn
                      ? "⚖️ Weighing (Scale)"
                      : "⚖️ तौल जारी (Weighing)"
                    : lot.status === "MATCHED"
                    ? isEn
                      ? "🤝 Recycler Matched"
                      : "🤝 रिसाइक्लर तय (Matched)"
                    : isEn
                    ? "⏳ Ready"
                    : "⏳ तैयार (Ready)";

                const firstHandover = lot.handovers[0];
                const displayName = isEn ? lot.category.nameEn : lot.category.nameHi;

                return (
                  <Link
                    key={lot.id}
                    href={`/collector/lots/${lot.id}`}
                    className="card card-interactive"
                    style={{
                      padding: "0.875rem 1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--slate-900)" }}>
                        {displayName} {!isEn && `(${lot.category.nameEn})`}
                      </div>
                      <div style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginTop: "0.15rem" }}>
                        <code>{lot.lotRef}</code> &bull; {(lot.approxWeightGrams / 1000).toFixed(1)} kg
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className={statusBadge} style={{ fontSize: "0.7rem" }}>
                        {statusText}
                      </span>
                      {firstHandover?.verificationCode && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            backgroundColor: "var(--slate-100)",
                            border: "1px solid var(--slate-200)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            marginTop: "0.3rem",
                            display: "inline-block",
                          }}
                        >
                          {isEn ? `PIN: ${firstHandover.verificationCode}` : `पिन: ${firstHandover.verificationCode}`}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Desktop Sidebar */}
      <div className="desktop-only" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
        {/* Widget 1: Live Scrap Spot Rates */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
                {isEn ? "📈 Live Scrap Rates" : "📈 आज के लाइव भाव"}
              </h3>
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                {isEn ? "Mumbai Spot Rates / kg" : "Mumbai Spot Rates / kg"}
              </div>
            </div>
            <Link href="/collector/prices" className="btn btn-sm btn-secondary" style={{ fontSize: "0.75rem" }}>
              {isEn ? "Full Board &rarr;" : "पूरा बोर्ड &rarr;"}
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {categories.map((cat) => {
              const rateObj = currentRates.find((r) => r.categoryId === cat.id);
              const rateRupees = rateObj ? (rateObj.ratePerKgPaise / 100).toFixed(0) : "340";
              const catTitle = isEn ? cat.nameEn : cat.nameHi;
              const rowId = `rate-row-${cat.id}`;
              const isRowSpeaking = speakingId === rowId;

              const handleRateSpeak = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (isRowSpeaking) {
                  stop();
                  return;
                }
                const speech =
                  voiceLanguage === "EN"
                    ? `${cat.nameEn}: ${rateRupees} rupees per kilogram.`
                    : voiceLanguage === "MR"
                    ? `${cat.nameMr || cat.nameHi}: ${rateRupees} रुपये प्रति किलो.`
                    : `${cat.nameHi}: ${rateRupees} रुपये प्रति किलो।`;
                speak(speech, rowId);
              };

              return (
                <div
                  key={cat.id}
                  onClick={handleRateSpeak}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.65rem",
                    backgroundColor: isRowSpeaking ? "#ecfdf5" : "var(--slate-50)",
                    borderRadius: "var(--radius-sm)",
                    border: isRowSpeaking ? "1.5px solid #059669" : "1px solid var(--slate-200)",
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title={isEn ? "Tap to hear price" : "भाव सुनने के लिए दबाएं"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.85rem" }}>{isRowSpeaking ? "🔊" : "🔈"}</span>
                    <span style={{ fontWeight: 700, color: "var(--slate-800)" }}>{catTitle}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--slate-500)" }}>
                      ({cat.code})
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <strong style={{ color: "var(--primary-800)", fontSize: "0.95rem" }}>
                      ₹{rateRupees}/kg
                    </strong>
                    <Link
                      href={`/collector/create-lot?categoryId=${cat.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}
                      title={isEn ? "Create lot with this category" : "इस सामग्री का लॉट बनाएं"}
                    >
                      +
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 2: Nearby Verified Recycling Facilities */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
                {isEn ? "🏢 Verified Recycler Centers" : "🏢 अधिकृत रिसाइक्लर केंद्र"}
              </h3>
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>
                {isEn ? "Authorized SPCB / CPCB Facilities" : "Verified SPCB Facilities"}
              </div>
            </div>
            <Link href="/collector/drop-points" className="btn btn-sm btn-secondary" style={{ fontSize: "0.75rem" }}>
              {isEn ? "View All &rarr;" : "सभी &rarr;"}
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {verifiedRecyclers.map((rec) => {
              const recSpeakingId = `rec-row-${rec.id}`;
              const isRecSpeaking = speakingId === recSpeakingId;

              const handleRecyclerSpeak = () => {
                if (isRecSpeaking) {
                  stop();
                  return;
                }
                const speech =
                  voiceLanguage === "EN"
                    ? `Verified Recycler: ${rec.name}. Address: ${rec.address}. Contact: ${rec.contactPhone}.`
                    : voiceLanguage === "MR"
                    ? `अधिकृत रिसायकलर: ${rec.name}. पत्ता: ${rec.address}. संपर्क: ${rec.contactPhone}.`
                    : `अधिकृत रिसायक्लर: ${rec.name}। पता: ${rec.address}। संपर्क: ${rec.contactPhone}।`;
                speak(speech, recSpeakingId);
              };

              return (
                <div
                  key={rec.id}
                  onClick={handleRecyclerSpeak}
                  style={{
                    padding: "0.75rem",
                    border: isRecSpeaking ? "1.5px solid #059669" : "1px solid var(--slate-200)",
                    borderRadius: "var(--radius)",
                    backgroundColor: isRecSpeaking ? "#ecfdf5" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title={isEn ? "Tap to hear recycler info" : "रिसायकलर जानकारी सुनें"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.85rem" }}>{isRecSpeaking ? "🔊" : "🔈"}</span>
                      <strong style={{ fontSize: "0.875rem", color: "var(--slate-900)" }}>
                        {rec.name}
                      </strong>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>
                      ✓ CPCB Auth
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.2rem" }}>
                    📍 {rec.address}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ color: "var(--primary-700)", fontWeight: 600 }}>
                      📞 {rec.contactPhone}
                    </span>
                    {rec.pickupAvailable && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>
                        🚚 {isEn ? "Vehicle Pickup Available" : "वाहन पिकअप उपलब्ध"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 3: Worker Safety Reminder */}
        <div
          className="card"
          style={{
            padding: "1.1rem",
            backgroundColor: "#fff7ed",
            borderColor: "#fed7aa",
            borderLeft: "4px solid #ea580c",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "1.1rem" }}>⚠️</span>
              <strong style={{ fontSize: "0.875rem", color: "#9a3412" }}>
                {isEn ? "Safety Alert: Do Not Burn Cables!" : "सुरक्षा नियम: तार न जलाएं!"}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                handleTileSpeak(
                  { preventDefault: () => {}, stopPropagation: () => {} } as any,
                  "safety-widget-narration",
                  "Safety warning. Never burn cables! Burning copper cables releases toxic carcinogenic dioxins that damage lungs. Unburnt cables command higher prices from verified recyclers.",
                  "सुरक्षा नियम। तार कभी न जलाएं! तार जलाने से जहरीला धुआं और कैंसर पैदा करने वाली गैसें निकलती हैं जो फेफड़ों को खराब करती हैं। बिना जली केबल बेचने पर बाजार में अधिक कीमत मिलती है।",
                  "सुरक्षा नियम. वायर कधीही जाळू नका! वायर जाळल्याने अत्यंत विषारी वायू आणि धूर पसरतो ज्यामुळे फुफ्फुसांचे आजार होतात. न जाळलेली वायर विकल्यास जास्त भाव मिळतो."
                )
              }
              style={{
                background: "none",
                border: "none",
                fontSize: "1rem",
                cursor: "pointer",
              }}
              title={isEn ? "Listen to Safety Rule" : "सुरक्षा नियम सुनें"}
            >
              {speakingId === "safety-widget-narration" ? "🔊" : "🔈"}
            </button>
          </div>

          <p style={{ fontSize: "0.775rem", color: "#7c2d12", lineHeight: 1.45 }}>
            {isEn
              ? "Burning PVC cables emits carcinogenic dioxins and poisonous smoke. Sell unburnt copper cables for higher value."
              : "तार जलाने से जहरीला धुआं निकलता है जो फेफड़ों को भारी नुकसान पहुंचाता है। बिना जलाए तांबे का तार अधिक दाम पर बिकता है।"}
          </p>

          <Link
            href="/collector/safety"
            style={{
              display: "inline-block",
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "#c2410c",
              fontWeight: 700,
            }}
          >
            {isEn ? "Read All 4 Safety Rules &rarr;" : "सभी 4 सुरक्षा नियम पढ़ें &rarr;"}
          </Link>
        </div>
      </div>
    </div>
  );
}

