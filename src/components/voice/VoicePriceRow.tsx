"use client";

import React from "react";
import {
  Battery,
  Cable,
  CircuitBoard,
  Cog,
  Minus,
  Monitor,
  Package,
  Recycle,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Tv,
  Volume2,
} from "lucide-react";
import { useVoice } from "./VoiceLanguageContext";
import { getMaterialPriceSpeech } from "@/lib/voice/prompts";

interface VoicePriceRowProps {
  id: string;
  nameEn: string;
  nameHi: string;
  nameMr?: string;
  code?: string;
  rateRupees: string | number;
  /** Kept for compatibility; not shown. */
  lowRupees?: string | number;
  /** Kept for compatibility; not shown. */
  highRupees?: string | number;
  trend: "UP" | "DOWN" | "FLAT" | "STABLE";
  isHazardous?: boolean;
}

function MaterialIcon({ code }: { code: string }) {
  const p = { size: 26, "aria-hidden": true } as const;
  if (code.includes("PCB")) return <CircuitBoard {...p} />;
  if (code.includes("CABLE") || code.includes("WIRE")) return <Cable {...p} />;
  if (code.includes("BATTERY")) return <Battery {...p} />;
  if (code.includes("CRT")) return <Tv {...p} />;
  if (code.includes("LCD") || code.includes("DISPLAY")) return <Monitor {...p} />;
  if (code.includes("MOTOR")) return <Cog {...p} />;
  if (code.includes("PLASTIC")) return <Package {...p} />;
  return <Recycle {...p} />;
}

export function VoicePriceRow({
  id,
  nameEn,
  nameHi,
  nameMr,
  code = "",
  rateRupees,
  trend,
  isHazardous,
}: VoicePriceRowProps) {
  const { language, textLanguage, speakingId, speak, stop } = useVoice();
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

  const name = textLanguage === "EN" ? nameEn : language === "MR" ? nameMr || nameHi : nameHi;
  const TrendIcon = trend === "UP" ? TrendingUp : trend === "DOWN" ? TrendingDown : Minus;
  const trendColor = trend === "UP" ? "var(--success)" : trend === "DOWN" ? "var(--danger)" : "var(--slate-400)";

  return (
    <button
      type="button"
      onClick={handleRowClick}
      aria-pressed={isSpeaking}
      style={{
        width: "100%",
        textAlign: "left",
        font: "inherit",
        backgroundColor: isSpeaking ? "#ecfdf5" : "#ffffff",
        border: isSpeaking ? "2px solid #059669" : "1px solid var(--slate-200)",
        borderRadius: "var(--radius-lg)",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        cursor: "pointer",
        boxShadow: "var(--shadow-xs)",
        minHeight: "64px",
      }}
    >
      <span
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          backgroundColor: isSpeaking ? "#dcfce7" : "var(--slate-100)",
          color: "var(--slate-700)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <MaterialIcon code={code} />
      </span>

      <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>
        {name}
        {isHazardous && (
          <TriangleAlert
            size={16}
            aria-label={textLanguage === "EN" ? "Hazardous" : "खतरनाक"}
            style={{ color: "#dc2626", marginLeft: "0.35rem", verticalAlign: "-2px" }}
          />
        )}
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary-700)" }}>₹{rateRupees}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--slate-500)", fontWeight: 600 }}>/kg</span>
        <TrendIcon size={18} aria-hidden="true" style={{ color: trendColor }} />
      </span>

      <Volume2 size={20} aria-hidden="true" style={{ color: isSpeaking ? "#059669" : "var(--slate-400)", flexShrink: 0 }} />
    </button>
  );
}
