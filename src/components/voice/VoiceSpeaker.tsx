"use client";

import React from "react";
import { Megaphone, Volume1, Volume2 } from "lucide-react";
import { useVoice } from "./VoiceLanguageContext";
import { SCREEN_PROMPTS } from "@/lib/voice/prompts";

export interface VoiceSpeakerProps {
  id?: string;
  screenKey?: string;
  textHi?: string;
  textMr?: string;
  textEn?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "pill" | "banner";
  className?: string;
  style?: React.CSSProperties;
}

export function VoiceSpeaker({
  id,
  screenKey,
  textHi,
  textMr,
  textEn,
  label,
  size = "md",
  variant = "icon",
  className = "",
  style = {},
}: VoiceSpeakerProps) {
  const { language, speakingId, speak, speakPrompt, stop } = useVoice();

  // Resolve unique ID
  const resolvedId = id || screenKey || "speaker-" + (textHi ? textHi.slice(0, 15) : "audio");
  const isCurrentlySpeaking = speakingId === resolvedId;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentlySpeaking) {
      stop();
      return;
    }

    if (screenKey) {
      speakPrompt(screenKey);
    } else {
      const textToSpeak =
        language === "EN"
          ? (textEn || textHi || "")
          : language === "MR"
          ? (textMr || textHi || "")
          : (textHi || textMr || "");
      if (textToSpeak) {
        speak(textToSpeak, resolvedId);
      }
    }
  };

  // Dimension helpers
  const sizeMap = {
    sm: { buttonSize: "32px", fontSize: "0.85rem", iconSize: "1rem" },
    md: { buttonSize: "38px", fontSize: "0.95rem", iconSize: "1.2rem" },
    lg: { buttonSize: "46px", fontSize: "1.1rem", iconSize: "1.45rem" },
  };

  const currentSize = sizeMap[size];

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`voice-speaker-pill ${isCurrentlySpeaking ? "is-speaking" : ""} ${className}`}
        aria-label={isCurrentlySpeaking ? "आवाज बंद करें / Stop audio" : "आवाज में सुनें / Listen to audio"}
        title={isCurrentlySpeaking ? "बंद करें (Click to stop)" : "आवाज़ में सुनें (Click to listen)"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: size === "sm" ? "0.25rem 0.6rem" : "0.35rem 0.85rem",
          borderRadius: "999px",
          border: isCurrentlySpeaking ? "1.5px solid #059669" : "1px solid #cbd5e1",
          backgroundColor: isCurrentlySpeaking ? "#ecfdf5" : "#f8fafc",
          color: isCurrentlySpeaking ? "#047857" : "#334155",
          fontWeight: 700,
          fontSize: currentSize.fontSize,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: isCurrentlySpeaking ? "0 0 0 3px rgba(16, 185, 129, 0.25)" : "none",
          ...style,
        }}
      >
        <span style={{ fontSize: currentSize.iconSize, display: "inline-flex" }}>
          {isCurrentlySpeaking ? <Volume2 size="1em" aria-hidden="true" /> : <Volume1 size="1em" aria-hidden="true" />}
        </span>
        <span>
          {isCurrentlySpeaking
            ? language === "EN" ? "Speaking..." : language === "MR" ? "ऐकत आहे..." : "बोल रहा है..."
            : label || (language === "EN" ? "Listen" : language === "MR" ? "ऐका" : "सुनें")}
        </span>
      </button>
    );
  }

  if (variant === "banner") {
    return (
      <div
        onClick={handleClick}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 0.85rem",
          borderRadius: "10px",
          backgroundColor: isCurrentlySpeaking ? "#ecfdf5" : "#f1f5f9",
          border: isCurrentlySpeaking ? "1px solid #10b981" : "1px solid #e2e8f0",
          color: isCurrentlySpeaking ? "#065f46" : "#334155",
          transition: "all 0.2s ease",
          ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem", display: "inline-flex" }}>{isCurrentlySpeaking ? <Volume2 size="1em" aria-hidden="true" /> : <Megaphone size="1em" aria-hidden="true" />}</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
            {isCurrentlySpeaking
              ? language === "EN" ? "Audio narration playing..." : language === "MR" ? "ऑडिओ वाचन सुरू आहे..." : "ऑडियो चल रहा है..."
              : label || (language === "EN" ? "Listen to screen audio" : language === "MR" ? "हा स्क्रीन आवाजात ऐका" : "यह स्क्रीन आवाज़ में सुनें")}
          </span>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            backgroundColor: isCurrentlySpeaking ? "#059669" : "#cbd5e1",
            color: "#ffffff",
            padding: "0.2rem 0.5rem",
            borderRadius: "6px",
            fontWeight: 800,
          }}
        >
          {isCurrentlySpeaking
            ? language === "EN" ? "Stop ■" : "बंद करें ■"
            : language === "EN" ? "Play ▶" : "सुनें ▶"}
        </span>
      </div>
    );
  }

  // Default circular icon button (matching wireframes: small round speaker button in headers & rows)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`voice-speaker-btn ${isCurrentlySpeaking ? "is-speaking" : ""} ${className}`}
      aria-label={isCurrentlySpeaking ? "आवाज बंद करें / Stop audio" : "आवाज में सुनें / Listen to audio"}
      title={isCurrentlySpeaking ? "बंद करें (Click to stop)" : "आवाज़ में सुनें (Click to listen)"}
      style={{
        width: currentSize.buttonSize,
        height: currentSize.buttonSize,
        minWidth: currentSize.buttonSize,
        minHeight: currentSize.buttonSize,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        border: isCurrentlySpeaking ? "2px solid #059669" : "1px solid rgba(0,0,0,0.12)",
        backgroundColor: isCurrentlySpeaking ? "#10b981" : "rgba(255,255,255,0.9)",
        color: isCurrentlySpeaking ? "#ffffff" : "#334155",
        boxShadow: isCurrentlySpeaking
          ? "0 0 0 4px rgba(16, 185, 129, 0.3), 0 2px 6px rgba(0,0,0,0.1)"
          : "0 1px 3px rgba(0,0,0,0.08)",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.15s ease",
        transform: isCurrentlySpeaking ? "scale(1.08)" : "scale(1)",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: currentSize.iconSize,
          lineHeight: 1,
          display: "inline-flex",
          animation: isCurrentlySpeaking ? "pulseWave 1.2s infinite ease-in-out" : "none",
        }}
      >
        {isCurrentlySpeaking ? <Volume2 size="1em" aria-hidden="true" /> : <Volume1 size="1em" aria-hidden="true" />}
      </span>
    </button>
  );
}
