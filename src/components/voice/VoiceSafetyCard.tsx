"use client";

import React from "react";
import { useVoice } from "./VoiceLanguageContext";
import { HAZARD_AUDIO_SCRIPTS } from "@/lib/voice/prompts";

interface VoiceSafetyCardProps {
  id: string;
  icon: string;
  titleHi: string;
  titleMr?: string | null;
  titleEn?: string | null;
  contentHi?: string | null;
  contentMr?: string | null;
  contentEn?: string | null;
  hazardCode?: string;
  index: number;
}

export function VoiceSafetyCard({
  id,
  icon,
  titleHi,
  titleMr,
  titleEn,
  contentHi,
  contentMr,
  contentEn,
  hazardCode,
  index,
}: VoiceSafetyCardProps) {
  const { language, speakingId, speak, stop } = useVoice();
  const cardId = `safety-card-${id}`;
  const isSpeaking = speakingId === cardId;

  // Check if we have a tailored hazard script
  const hazardKey = hazardCode || (
    index === 0 ? "HAZ_CABLE" :
    index === 1 ? "HAZ_ACID" :
    index === 2 ? "HAZ_BATTERY" : "HAZ_CRT"
  );

  const customHazard = HAZARD_AUDIO_SCRIPTS[hazardKey];

  const handleSpeak = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSpeaking) {
      stop();
      return;
    }

    let speechText = "";
    if (customHazard) {
      speechText = language === "EN" ? customHazard.en : language === "MR" ? customHazard.mr : customHazard.hi;
    } else {
      speechText = language === "EN"
        ? `${titleEn}. ${contentEn || contentHi}`
        : language === "MR"
        ? `${titleMr || titleHi}। ${contentMr || contentHi}`
        : `${titleHi}। ${contentHi}`;
    }

    speak(speechText, cardId);
  };

  return (
    <div
      onClick={handleSpeak}
      style={{
        backgroundColor: isSpeaking ? "#fff1f2" : "#fffaf5",
        borderRadius: "16px",
        padding: "1.25rem",
        border: isSpeaking ? "2px solid #e11d48" : "1px solid #fed7aa",
        boxShadow: isSpeaking
          ? "0 4px 18px rgba(225, 29, 72, 0.15)"
          : "0 2px 8px rgba(0,0,0,0.03)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        transform: isSpeaking ? "scale(1.01)" : "scale(1)",
        position: "relative",
      }}
      title="सावधानी और ऑडियो सुनने के लिए टैप करें (Tap to hear safety audio)"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
        {/* Large Visual Picture / Icon matching wireframe */}
        <div
          style={{
            fontSize: "2.25rem",
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            backgroundColor: isSpeaking ? "#ffe4e6" : "#ffedd5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid #fed7aa",
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: isSpeaking ? "#9f1239" : "#9a3412" }}>
                {language === "EN" ? titleEn : language === "MR" ? (titleMr || titleHi) : titleHi}
              </div>
              <div style={{ fontSize: "0.775rem", color: "#c2410c", fontWeight: 600 }}>
                {language === "EN" ? titleHi : titleEn}
              </div>
            </div>

            {/* Individual Speaker Audio Button 🔊 */}
            <button
              type="button"
              onClick={handleSpeak}
              aria-label={language === "EN" ? "Listen to audio" : language === "MR" ? "ऑडिओ ऐका" : "ऑडियो सुनें"}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: isSpeaking ? "#e11d48" : "#ffedd5",
                color: isSpeaking ? "#ffffff" : "#9a3412",
                border: isSpeaking ? "2px solid #be123c" : "1px solid #fed7aa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                cursor: "pointer",
                boxShadow: isSpeaking ? "0 0 0 4px rgba(225, 29, 72, 0.25)" : "none",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              {isSpeaking ? "🔊" : "🔈"}
            </button>
          </div>

          <p style={{ fontSize: "0.875rem", color: "#334155", lineHeight: "1.55", marginTop: "0.6rem" }}>
            {language === "EN" ? (contentEn || contentHi) : language === "MR" ? (contentMr || contentHi) : contentHi}
          </p>

          <div
            style={{
              marginTop: "0.6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px dashed #fed7aa",
              paddingTop: "0.5rem",
              fontSize: "0.75rem",
              color: isSpeaking ? "#e11d48" : "#64748b",
              fontWeight: 600,
            }}
          >
            <span>
              {isSpeaking
                ? language === "MR" ? "ऑडिओ वाचन सुरू आहे..." : "सुरक्षा ऑडियो चल रहा है..."
                : language === "MR" ? "ऐकण्यासाठी टॅप करा (Tap to hear)" : "सुनने के लिए टैप करें (Tap to hear)"}
            </span>
            <span
              style={{
                backgroundColor: isSpeaking ? "#ffe4e6" : "#f1f5f9",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                fontWeight: 700,
              }}
            >
              {isSpeaking ? "■ Stop" : "▶ Audio"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
