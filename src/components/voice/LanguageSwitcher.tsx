"use client";

import React from "react";
import { Check, Globe, Volume2 } from "lucide-react";
import { useVoice } from "./VoiceLanguageContext";
import { type AppLanguage } from "@/lib/voice/speech";

interface LanguageSwitcherProps {
  variant?: "inline" | "card" | "pills" | "select" | "textOnly";
  className?: string;
}

export function LanguageSwitcher({
  variant = "inline",
  className = "",
}: LanguageSwitcherProps) {
  const { language, setLanguage, textLanguage, setTextLanguage, speak, speakingId } = useVoice();

  const handleSelect = (lang: AppLanguage) => {
    setLanguage(lang);
    if (lang === "EN") {
      setTextLanguage("EN");
      speak("English language selected.", "lang-switch-en", "EN");
    } else if (lang === "HI") {
      setTextLanguage("HI");
      speak("हिंदी भाषा चुनी गई।", "lang-switch-hi", "HI");
    } else {
      setTextLanguage("MR");
      speak("मराठी भाषा निवडली आहे.", "lang-switch-mr", "MR");
    }
  };

  const handleHearOnly = (e: React.MouseEvent, lang: AppLanguage) => {
    e.stopPropagation();
    if (lang === "EN") {
      speak("English language. E-Waste Saathi Portal.", "lang-preview-en", "EN");
    } else if (lang === "HI") {
      speak("हिंदी भाषा। ई-वेस्ट साथी पोर्टल।", "lang-preview-hi", "HI");
    } else {
      speak("मराठी भाषा. ई-वेस्ट साथी पोर्टल.", "lang-preview-mr", "MR");
    }
  };

  // Text-Only Switcher specifically for English and Hindi
  if (variant === "textOnly") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          backgroundColor: "#f1f5f9",
          padding: "0.2rem 0.35rem",
          borderRadius: "999px",
          border: "1px solid #cbd5e1",
        }}
        className={className}
        aria-label="Text Language Selection: English or Hindi"
      >
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", padding: "0 0.25rem" }}>
          <Globe size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} />
        </span>
        <button
          type="button"
          onClick={() => {
            setTextLanguage("EN");
            setLanguage("EN");
            speak("English text selected.", "text-switch-en", "EN");
          }}
          style={{
            border: "none",
            backgroundColor: textLanguage === "EN" ? "var(--primary-600)" : "transparent",
            color: textLanguage === "EN" ? "#ffffff" : "#334155",
            fontWeight: textLanguage === "EN" ? 800 : 600,
            fontSize: "0.8rem",
            padding: "0.25rem 0.65rem",
            borderRadius: "999px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: textLanguage === "EN" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          }}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => {
            setTextLanguage("HI");
            setLanguage("HI");
            speak("हिंदी भाषा चुनी गई।", "text-switch-hi", "HI");
          }}
          style={{
            border: "none",
            backgroundColor: textLanguage === "HI" ? "var(--primary-600)" : "transparent",
            color: textLanguage === "HI" ? "#ffffff" : "#334155",
            fontWeight: textLanguage === "HI" ? 800 : 600,
            fontSize: "0.8rem",
            padding: "0.25rem 0.65rem",
            borderRadius: "999px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: textLanguage === "HI" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          }}
        >
          हिन्दी
        </button>
        <button
          type="button"
          onClick={() => {
            setTextLanguage("MR");
            setLanguage("MR");
            speak("मराठी भाषा निवडली आहे.", "text-switch-mr", "MR");
          }}
          style={{
            border: "none",
            backgroundColor: textLanguage === "MR" ? "var(--primary-600)" : "transparent",
            color: textLanguage === "MR" ? "#ffffff" : "#334155",
            fontWeight: textLanguage === "MR" ? 800 : 600,
            fontSize: "0.8rem",
            padding: "0.25rem 0.65rem",
            borderRadius: "999px",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: textLanguage === "MR" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          }}
        >
          मराठी
        </button>
      </div>
    );
  }

  if (variant === "card") {
    // Trilingual Interactive Cards for Language Selection Page
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          width: "100%",
        }}
        className={className}
      >
        {/* English Card */}
        <div
          onClick={() => handleSelect("EN")}
          style={{
            cursor: "pointer",
            border: (language === "EN" || textLanguage === "EN") ? "2.5px solid var(--primary-600)" : "1.5px solid #cbd5e1",
            backgroundColor: (language === "EN" || textLanguage === "EN") ? "#ecfdf5" : "#ffffff",
            padding: "1.5rem 1rem",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: (language === "EN" || textLanguage === "EN") ? "0 4px 14px rgba(5, 150, 105, 0.2)" : "0 2px 6px rgba(0,0,0,0.04)",
            position: "relative",
            transition: "all 0.2s ease",
          }}
        >
          <button
            type="button"
            onClick={(e) => handleHearOnly(e, "EN")}
            title="Listen in English"
            aria-label="Listen in English"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: speakingId === "lang-preview-en" ? "#059669" : "#f1f5f9",
              color: speakingId === "lang-preview-en" ? "#ffffff" : "#334155",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            <Volume2 size={16} aria-hidden="true" />
          </button>
          <div
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: (language === "EN" || textLanguage === "EN") ? "var(--primary-800)" : "var(--slate-800)",
            }}
          >
            English
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
            Text &amp; Audio in English
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: (language === "EN" || textLanguage === "EN") ? "var(--primary-600)" : "#e2e8f0",
                color: (language === "EN" || textLanguage === "EN") ? "#ffffff" : "#475569",
              }}
            >
              {(language === "EN" || textLanguage === "EN") ? <><Check size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Active</> : "Choose"}
            </span>
          </div>
        </div>

        {/* Hindi Card */}
        <div
          onClick={() => handleSelect("HI")}
          style={{
            cursor: "pointer",
            border: (language === "HI" || textLanguage === "HI") ? "2.5px solid var(--primary-600)" : "1.5px solid #cbd5e1",
            backgroundColor: (language === "HI" || textLanguage === "HI") ? "#ecfdf5" : "#ffffff",
            padding: "1.5rem 1rem",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: (language === "HI" || textLanguage === "HI") ? "0 4px 14px rgba(5, 150, 105, 0.2)" : "0 2px 6px rgba(0,0,0,0.04)",
            position: "relative",
            transition: "all 0.2s ease",
          }}
        >
          <button
            type="button"
            onClick={(e) => handleHearOnly(e, "HI")}
            title="आवाज सुनें (Click to hear)"
            aria-label="आवाज सुनें (Click to hear)"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: speakingId === "lang-preview-hi" ? "#059669" : "#f1f5f9",
              color: speakingId === "lang-preview-hi" ? "#ffffff" : "#334155",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            <Volume2 size={16} aria-hidden="true" />
          </button>
          <div
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: (language === "HI" || textLanguage === "HI") ? "var(--primary-800)" : "var(--slate-800)",
            }}
          >
            हिन्दी
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
            हिंदी भाषा और आवाज़
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: (language === "HI" || textLanguage === "HI") ? "var(--primary-600)" : "#e2e8f0",
                color: (language === "HI" || textLanguage === "HI") ? "#ffffff" : "#475569",
              }}
            >
              {(language === "HI" || textLanguage === "HI") ? <><Check size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> चालू</> : "चुनें"}
            </span>
          </div>
        </div>

        {/* Marathi Card */}
        <div
          onClick={() => handleSelect("MR")}
          style={{
            cursor: "pointer",
            border: (language === "MR" || textLanguage === "MR") ? "2.5px solid var(--primary-600)" : "1.5px solid #cbd5e1",
            backgroundColor: (language === "MR" || textLanguage === "MR") ? "#ecfdf5" : "#ffffff",
            padding: "1.5rem 1rem",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: (language === "MR" || textLanguage === "MR") ? "0 4px 14px rgba(5, 150, 105, 0.2)" : "0 2px 6px rgba(0,0,0,0.04)",
            position: "relative",
            transition: "all 0.2s ease",
          }}
        >
          <button
            type="button"
            onClick={(e) => handleHearOnly(e, "MR")}
            title="आवाज ऐका (Click to hear)"
            aria-label="आवाज ऐका (Click to hear)"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: speakingId === "lang-preview-mr" ? "#059669" : "#f1f5f9",
              color: speakingId === "lang-preview-mr" ? "#ffffff" : "#334155",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            <Volume2 size={16} aria-hidden="true" />
          </button>
          <div
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: (language === "MR" || textLanguage === "MR") ? "var(--primary-800)" : "var(--slate-800)",
            }}
          >
            मराठी
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
            मराठी भाषा आणि ऑडिओ
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: (language === "MR" || textLanguage === "MR") ? "var(--primary-600)" : "#e2e8f0",
                color: (language === "MR" || textLanguage === "MR") ? "#ffffff" : "#475569",
              }}
            >
              {(language === "MR" || textLanguage === "MR") ? <><Check size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> चालू</> : "निवडा"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default inline segmented pill switcher: "English | हिन्दी | मराठी"
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.06)",
        borderRadius: "999px",
        padding: "0.15rem 0.35rem",
        border: "1px solid rgba(0,0,0,0.1)",
      }}
      className={className}
      aria-label="Language Selector: English, Hindi, Marathi"
    >
      <button
        type="button"
        onClick={() => handleSelect("EN")}
        title="Switch text and voice to English"
        style={{
          border: "none",
          backgroundColor: (language === "EN" || textLanguage === "EN") ? "var(--primary-600)" : "transparent",
          color: (language === "EN" || textLanguage === "EN") ? "#ffffff" : "var(--slate-700)",
          fontWeight: (language === "EN" || textLanguage === "EN") ? 800 : 600,
          fontSize: "0.8rem",
          padding: "0.25rem 0.65rem",
          borderRadius: "999px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        English
      </button>

      <span style={{ color: "rgba(0,0,0,0.25)", fontSize: "0.75rem", margin: "0 0.15rem" }}>|</span>

      <button
        type="button"
        onClick={() => handleSelect("HI")}
        title="हिंदी भाषा और आवाज़ चुनें"
        style={{
          border: "none",
          backgroundColor: (language === "HI" || textLanguage === "HI") ? "var(--primary-600)" : "transparent",
          color: (language === "HI" || textLanguage === "HI") ? "#ffffff" : "var(--slate-700)",
          fontWeight: (language === "HI" || textLanguage === "HI") ? 800 : 600,
          fontSize: "0.8rem",
          padding: "0.25rem 0.65rem",
          borderRadius: "999px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        हिन्दी
      </button>

      <span style={{ color: "rgba(0,0,0,0.25)", fontSize: "0.75rem", margin: "0 0.15rem" }}>|</span>

      <button
        type="button"
        onClick={() => handleSelect("MR")}
        title="मराठी भाषा आणि ऑडिओ निवडा"
        style={{
          border: "none",
          backgroundColor: (language === "MR" || textLanguage === "MR") ? "var(--primary-600)" : "transparent",
          color: (language === "MR" || textLanguage === "MR") ? "#ffffff" : "var(--slate-700)",
          fontWeight: (language === "MR" || textLanguage === "MR") ? 800 : 600,
          fontSize: "0.8rem",
          padding: "0.25rem 0.65rem",
          borderRadius: "999px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        मराठी
      </button>
    </div>
  );
}

// Dedicated English & Hindi Text Language Option component
export function TextLanguageSwitcher({ className = "" }: { className?: string }) {
  return <LanguageSwitcher variant="textOnly" className={className} />;
}
