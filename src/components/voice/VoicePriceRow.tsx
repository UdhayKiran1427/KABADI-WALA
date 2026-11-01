"use client";

import React from "react";
import { useVoice } from "./VoiceLanguageContext";
import { getMaterialPriceSpeech } from "@/lib/voice/prompts";

interface VoicePriceRowProps {
  id: string;
  nameEn: string;
  nameHi: string;
  nameMr?: string;
  code?: string;
  rateRupees: string | number;
  lowRupees: string | number;
  highRupees: string | number;
  trend: "UP" | "DOWN" | "FLAT" | "STABLE";
  isHazardous?: boolean;
}

export function VoicePriceRow({
  id,
  nameEn,
  nameHi,
  nameMr,
  code = "",
  rateRupees,
  lowRupees,
  highRupees,
  trend,
  isHazardous,
}: VoicePriceRowProps) {
  const { language, speakingId, speak, stop } = useVoice();
  const rowSpeakingId = `price-row-${id}`;
  const isSpeaking = speakingId === rowSpeakingId;

  const handleRowClick = () => {
    if (isSpeaking) {
      stop();
      return;
    }

    const mrName = nameMr || nameHi;
    const speech = getMaterialPriceSpeech(nameHi, mrName, rateRupees, language, nameEn);
    speak(speech, rowSpeakingId);
  };

  // Category Icon Resolver
  const getIcon = () => {
    if (code.includes("PCB")) return "🟩";
    if (code.includes("CABLE") || code.includes("WIRE")) return "🔌";
    if (code.includes("BATTERY")) return "🔋";
    if (code.includes("CRT")) return "📺";
    if (code.includes("LCD") || code.includes("DISPLAY")) return "🖥️";
    if (code.includes("MOTOR")) return "⚙️";
    if (code.includes("PLASTIC")) return "📦";
    return "♻️";
  };

  const trendIcon = trend === "UP" ? "↗" : trend === "DOWN" ? "↘" : "→";
  const trendColor = trend === "UP" ? "var(--success)" : trend === "DOWN" ? "var(--danger)" : "var(--slate-500)";

  return (
    <div
      onClick={handleRowClick}
      title="भाव सुनने के लिए दबाएं (Tap to hear price)"
      style={{
        backgroundColor: isSpeaking ? "#ecfdf5" : "#ffffff",
        border: isSpeaking ? "2px solid #059669" : "1px solid var(--slate-200)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.15rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: isSpeaking
          ? "0 4px 16px rgba(5, 150, 105, 0.2)"
          : "var(--shadow-xs)",
        transform: isSpeaking ? "scale(1.01)" : "scale(1)",
        userSelect: "none",
      }}
    >
      {/* Left: Icon & Material Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <div
          style={{
            fontSize: "1.75rem",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: isSpeaking ? "#dcfce7" : "var(--slate-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
        >
          {getIcon()}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>
              {language === "EN" ? nameEn : language === "MR" ? (nameMr || nameHi) : nameHi}
            </span>
            {isHazardous && (
              <span
                style={{
                  fontSize: "0.65rem",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  padding: "0.1rem 0.35rem",
                  borderRadius: "4px",
                  fontWeight: 700,
                }}
              >
                {language === "EN" ? "HAZARDOUS" : language === "MR" ? "धोकादायक" : "खतरनाक"}
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.775rem", color: "var(--slate-500)", marginTop: "0.1rem" }}>
            {language === "EN" ? nameHi : nameEn}
          </div>
        </div>
      </div>

      {/* Right: Price & Speaker Wave Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.25rem" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary-700)", letterSpacing: "-0.01em" }}>
              ₹{rateRupees}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 }}>/kg</span>
            <span style={{ color: trendColor, fontWeight: 800, fontSize: "1.1rem" }}>{trendIcon}</span>
          </div>

          <div style={{ fontSize: "0.7rem", color: "var(--slate-400)", marginTop: "0.1rem" }}>
            बाजार सीमा: ₹{lowRupees} – ₹{highRupees}
          </div>
        </div>

        {/* Speaker audio indicator */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: isSpeaking ? "#059669" : "#f1f5f9",
            color: isSpeaking ? "#ffffff" : "#475569",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            flexShrink: 0,
            boxShadow: isSpeaking ? "0 0 0 3px rgba(16, 185, 129, 0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          {isSpeaking ? "🔊" : "🔉"}
        </div>
      </div>
    </div>
  );
}
