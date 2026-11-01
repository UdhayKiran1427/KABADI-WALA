"use client";

import React from "react";
import { useVoice, TextLanguage } from "./VoiceLanguageContext";
import { AppLanguage } from "@/lib/voice/speech";

interface CollectorControlToolbarProps {
  pageNarration?: {
    en: string;
    hi: string;
    mr: string;
  };
  narrationId?: string;
  className?: string;
  compact?: boolean;
}

export function CollectorControlToolbar({
  pageNarration,
  narrationId = "collector-page-narration",
  className = "",
  compact = false,
}: CollectorControlToolbarProps) {
  const {
    textLanguage,
    setTextLanguage,
    voiceLanguage,
    setVoiceLanguage,
    speak,
    speakingId,
    stop,
  } = useVoice();

  const isSpeaking = speakingId === narrationId;

  const handleListenPage = () => {
    if (isSpeaking) {
      stop();
      return;
    }

    if (pageNarration) {
      const text =
        voiceLanguage === "EN"
          ? pageNarration.en
          : voiceLanguage === "MR"
          ? pageNarration.mr
          : pageNarration.hi;
      speak(text, narrationId);
    } else {
      const defaultText =
        voiceLanguage === "EN"
          ? "Welcome to KabadiWala Collector Portal. Use text options to switch between English and Hindi, and voice options to hear page audio in English, Hindi, or Marathi."
          : voiceLanguage === "MR"
          ? "कबाडीवाला कलेक्टर पोर्टलवर आपले स्वागत आहे. इंग्रजी आणि हिंदीमध्ये मजकूर पाहण्यासाठी पर्याय वापरा, आणि मराठी, हिंदी किंवा इंग्रजीत ऑडिओ ऐका."
          : "कबाड़ीवाला कलेक्टर पोर्टल में आपका स्वागत है। अंग्रेजी और हिंदी में टेक्स्ट देखने के लिए भाषा बदलें, तथा हिंदी, मराठी या अंग्रेजी में आवाज सुनने के लिए स्पीकर दबाएं।";
      speak(defaultText, narrationId);
    }
  };

  const handleVoiceSelect = (lang: AppLanguage) => {
    setVoiceLanguage(lang);
    if (lang === "EN") {
      speak("English voice selected.", "voice-feedback-en", "EN");
    } else if (lang === "HI") {
      speak("हिंदी आवाज चुनी गई।", "voice-feedback-hi", "HI");
    } else {
      speak("मराठी आवाज निवडली आहे.", "voice-feedback-mr", "MR");
    }
  };

  return (
    <div
      className={`collector-control-toolbar ${className}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--slate-200)",
        borderRadius: "14px",
        padding: compact ? "0.4rem 0.65rem" : "0.6rem 0.85rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.65rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* 1. TEXT LANGUAGE TOGGLE (English vs Hindi) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <span
          style={{
            fontSize: "0.775rem",
            fontWeight: 800,
            color: "var(--slate-600)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span>🔤</span>
          <span>{textLanguage === "EN" ? "Text:" : "भाषा:"}</span>
        </span>

        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#f1f5f9",
            borderRadius: "999px",
            padding: "0.15rem",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={() => setTextLanguage("EN")}
            style={{
              border: "none",
              backgroundColor: textLanguage === "EN" ? "var(--primary-600)" : "transparent",
              color: textLanguage === "EN" ? "#ffffff" : "#475569",
              fontWeight: textLanguage === "EN" ? 800 : 600,
              fontSize: "0.75rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Display page text in English"
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setTextLanguage("HI")}
            style={{
              border: "none",
              backgroundColor: textLanguage === "HI" ? "var(--primary-600)" : "transparent",
              color: textLanguage === "HI" ? "#ffffff" : "#475569",
              fontWeight: textLanguage === "HI" ? 800 : 600,
              fontSize: "0.75rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="पेज का टेक्स्ट हिंदी में देखें"
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* 2. VOICE LANGUAGE SELECTOR (Hindi, English, Marathi) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <span
          style={{
            fontSize: "0.775rem",
            fontWeight: 800,
            color: "var(--slate-600)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span>🔊</span>
          <span>{textLanguage === "EN" ? "Voice:" : "आवाज़:"}</span>
        </span>

        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#f1f5f9",
            borderRadius: "999px",
            padding: "0.15rem",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={() => handleVoiceSelect("HI")}
            style={{
              border: "none",
              backgroundColor: voiceLanguage === "HI" ? "#047857" : "transparent",
              color: voiceLanguage === "HI" ? "#ffffff" : "#475569",
              fontWeight: voiceLanguage === "HI" ? 800 : 600,
              fontSize: "0.75rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="हिंदी आवाज़ में सुनें (Listen in Hindi)"
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => handleVoiceSelect("EN")}
            style={{
              border: "none",
              backgroundColor: voiceLanguage === "EN" ? "#047857" : "transparent",
              color: voiceLanguage === "EN" ? "#ffffff" : "#475569",
              fontWeight: voiceLanguage === "EN" ? 800 : 600,
              fontSize: "0.75rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Listen in English voice"
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleVoiceSelect("MR")}
            style={{
              border: "none",
              backgroundColor: voiceLanguage === "MR" ? "#047857" : "transparent",
              color: voiceLanguage === "MR" ? "#ffffff" : "#475569",
              fontWeight: voiceLanguage === "MR" ? 800 : 600,
              fontSize: "0.75rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="मराठी आवाजात ऐका (Listen in Marathi)"
          >
            मराठी
          </button>
        </div>
      </div>

      {/* 3. LISTEN TO PAGE AUDIO BUTTON */}
      <button
        type="button"
        onClick={handleListenPage}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          backgroundColor: isSpeaking ? "#ecfdf5" : "var(--primary-50)",
          color: isSpeaking ? "#047857" : "var(--primary-800)",
          border: isSpeaking ? "1.5px solid #059669" : "1px solid var(--primary-200)",
          padding: "0.3rem 0.75rem",
          borderRadius: "999px",
          fontSize: "0.775rem",
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: isSpeaking ? "0 0 0 3px rgba(16, 185, 129, 0.25)" : "none",
          transition: "all 0.15s ease",
        }}
        title={
          isSpeaking
            ? "Click to stop audio"
            : textLanguage === "EN"
            ? "Listen to page overview audio"
            : "पूरा पेज आवाज़ में सुनें"
        }
      >
        <span style={{ fontSize: "0.95rem" }}>{isSpeaking ? "🔊" : "📢"}</span>
        <span>
          {isSpeaking
            ? textLanguage === "EN" ? "Playing Audio ■" : "चल रहा है ■"
            : textLanguage === "EN" ? "Listen to Page ▶" : "पेज सुनें ▶"}
        </span>
      </button>
    </div>
  );
}

