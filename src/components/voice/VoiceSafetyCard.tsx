"use client";

import React from "react";
import { BatteryWarning, Flame, FlaskConical, ShieldAlert, Square, Tv, Volume2 } from "lucide-react";
import { useVoice } from "./VoiceLanguageContext";
import { HAZARD_AUDIO_SCRIPTS } from "@/lib/voice/prompts";

interface VoiceSafetyCardProps {
  id: string;
  /** Icon key: "flame" | "acid" | "battery" | "screen" (anything else shows a shield). */
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

function HazardIcon({ name }: { name: string }) {
  const p = { size: 30, "aria-hidden": true } as const;
  if (name === "flame") return <Flame {...p} />;
  if (name === "acid") return <FlaskConical {...p} />;
  if (name === "battery") return <BatteryWarning {...p} />;
  if (name === "screen") return <Tv {...p} />;
  return <ShieldAlert {...p} />;
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
  const { language, textLanguage, speakingId, speak, stop } = useVoice();
  const cardId = `safety-card-${id}`;
  const isSpeaking = speakingId === cardId;

  // Check if we have a tailored hazard script
  const hazardKey = hazardCode || (
    index === 0 ? "HAZ_CABLE" :
    index === 1 ? "HAZ_ACID" :
    index === 2 ? "HAZ_BATTERY" : "HAZ_CRT"
  );

  const customHazard = HAZARD_AUDIO_SCRIPTS[hazardKey];

  const handleSpeak = () => {
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

  const isEn = textLanguage === "EN";
  const title = isEn ? titleEn || titleHi : language === "MR" ? titleMr || titleHi : titleHi;
  const content = isEn ? contentEn || contentHi : language === "MR" ? contentMr || contentHi : contentHi;

  return (
    <button
      type="button"
      onClick={handleSpeak}
      aria-pressed={isSpeaking}
      style={{
        width: "100%",
        textAlign: "left",
        font: "inherit",
        backgroundColor: isSpeaking ? "#fff1f2" : "#fffaf5",
        borderRadius: "16px",
        padding: "1rem",
        border: isSpeaking ? "2px solid #e11d48" : "1px solid #fed7aa",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.85rem",
      }}
    >
      <span
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          backgroundColor: isSpeaking ? "#ffe4e6" : "#ffedd5",
          color: "#c2410c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <HazardIcon name={icon} />
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: "1.05rem", color: isSpeaking ? "#9f1239" : "#9a3412" }}>
          {title}
        </span>
        {content && (
          <span style={{ display: "block", fontSize: "0.9rem", color: "#334155", lineHeight: 1.5, marginTop: "0.35rem" }}>
            {content}
          </span>
        )}
      </span>

      <span style={{ color: isSpeaking ? "#e11d48" : "#c2410c", flexShrink: 0 }}>
        {isSpeaking ? <Square size={20} aria-hidden="true" /> : <Volume2 size={22} aria-hidden="true" />}
      </span>
    </button>
  );
}
