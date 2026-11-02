"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftRight, BatteryCharging, Check, Globe, Info, Lock, LogOut, Settings, Shield, TriangleAlert, User } from "lucide-react";
import { PageVoice, useTxt } from "../ui";
import { useVoice } from "@/components/voice/VoiceLanguageContext";
import { type AppLanguage } from "@/lib/voice/speech";

interface CollectorSettingsClientProps {
  phone: string;
  shortCode: string;
  operatingArea: string;
  logoutAction: () => Promise<void>;
}

export function CollectorSettingsClient({
  phone,
  shortCode,
  operatingArea,
  logoutAction,
}: CollectorSettingsClientProps) {
  const tx = useTxt();
  const { setLanguage, speak } = useVoice();

  // Settings states backed by localStorage
  const [currentLang, setCurrentLang] = useState<AppLanguage>("HI");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [lowDataMode, setLowDataMode] = useState<boolean>(false);
  const [dontSaveExactLocation, setDontSaveExactLocation] = useState<boolean>(false);
  const [appLockTimeout, setAppLockTimeout] = useState<number>(120);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedLang = (localStorage.getItem("kabadi_voice_lang") as AppLanguage) || "HI";
      setCurrentLang(savedLang);

      const savedSpeed = parseFloat(localStorage.getItem("kabadi_voice_speed") || "1.0");
      if (!isNaN(savedSpeed)) setVoiceSpeed(savedSpeed);

      const savedLowData = localStorage.getItem("kabadi_low_data_mode") === "true";
      setLowDataMode(savedLowData);

      const savedExactLoc = localStorage.getItem("kabadi_exact_location_disabled") === "true";
      setDontSaveExactLocation(savedExactLoc);

      const savedTimeout = parseInt(localStorage.getItem("kabadi_app_lock_timeout") || "120", 10);
      if (!isNaN(savedTimeout)) setAppLockTimeout(savedTimeout);
    } catch {
      // ignore
    }
  }, []);

  const showSaved = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(null), 3000);
  };

  const handleLangChange = (lang: AppLanguage) => {
    setCurrentLang(lang);
    setLanguage(lang);
    try {
      localStorage.setItem("kabadi_voice_lang", lang);
    } catch {}
    if (lang === "HI") {
      speak("हिंदी भाषा चुनी गई।", "set-lang-hi", "HI");
      showSaved("भाषा बदल दी गई है: हिंदी");
    } else if (lang === "MR") {
      speak("मराठी भाषा निवडली आहे.", "set-lang-mr", "MR");
      showSaved("भाषा बदलली आहे: मराठी");
    } else {
      speak("English language selected.", "set-lang-en", "EN");
      showSaved("Language updated: English");
    }
  };

  const handleVoiceSpeedChange = (speed: number) => {
    setVoiceSpeed(speed);
    try {
      localStorage.setItem("kabadi_voice_speed", speed.toString());
    } catch {}
    showSaved(`Voice speed: ${speed}x`);
  };

  const handleLowDataToggle = () => {
    const next = !lowDataMode;
    setLowDataMode(next);
    try {
      localStorage.setItem("kabadi_low_data_mode", String(next));
    } catch {}
    showSaved(next ? "Low-data mode enabled" : "Standard data mode enabled");
  };

  const handleExactLocationToggle = () => {
    const next = !dontSaveExactLocation;
    setDontSaveExactLocation(next);
    try {
      localStorage.setItem("kabadi_exact_location_disabled", String(next));
    } catch {}
    showSaved(next ? "Exact location saving disabled (~100m rounded)" : "Exact location saving enabled");
  };

  const handleTimeoutChange = (seconds: number) => {
    setAppLockTimeout(seconds);
    try {
      localStorage.setItem("kabadi_app_lock_timeout", seconds.toString());
    } catch {}
    showSaved(seconds === 0 ? "App lock disabled" : `App lock timeout set to ${seconds / 60} min`);
  };

  return (
    <div className="c-page" style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "3rem" }}>
      <PageVoice
        en="Collector settings. Configure language, voice assistant speed, low-data mode, and location privacy."
        hi="कलेक्टर सेटिंग्स। भाषा, आवाज़ की गति, डेटा बचत और लोकेशन गोपनीयता सेट करें।"
        mr="कलेक्टर सेटिंग्ज. भाषा, आवाजाचा वेग, डेटा बचत आणि स्थान गोपनीयता सेट करा."
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Settings size={26} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h1 className="c-page-title" style={{ margin: 0 }}>
            {tx({ hi: "सेटिंग्स", en: "Settings", mr: "सेटिंग्ज" })}
          </h1>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            padding: "0.25rem 0.65rem",
            backgroundColor: "#dcfce7",
            color: "#166534",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {tx({ hi: "कलेक्टर", en: "Collector", mr: "कलेक्टर" })}
        </span>
      </div>

      {savedBanner && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            borderRadius: "var(--radius-md, 12px)",
            fontWeight: 600,
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Check size={18} aria-hidden="true" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* 1. Account Info Card */}
      <section className="card" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <User size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
            {tx({ hi: "कलेक्टर प्रोफ़ाइल", en: "Collector Account", mr: "कलेक्टर प्रोफाईल" })}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", fontSize: "0.9rem" }}>
          <div>
            <div style={{ color: "var(--slate-500)", fontSize: "0.75rem", fontWeight: 700 }}>
              {tx({ hi: "मोबाइल नंबर", en: "Phone Number", mr: "मोबाईल नंबर" })}
            </div>
            <div style={{ fontWeight: 700, marginTop: "0.15rem" }}>{phone}</div>
          </div>
          <div>
            <div style={{ color: "var(--slate-500)", fontSize: "0.75rem", fontWeight: 700 }}>
              {tx({ hi: "शॉर्ट कोड", en: "Short Code", mr: "शॉर्ट कोड" })}
            </div>
            <div style={{ fontWeight: 700, marginTop: "0.15rem", color: "var(--primary)" }}>#{shortCode}</div>
          </div>
          <div>
            <div style={{ color: "var(--slate-500)", fontSize: "0.75rem", fontWeight: 700 }}>
              {tx({ hi: "कार्य क्षेत्र", en: "Operating Area", mr: "कार्यक्षेत्र" })}
            </div>
            <div style={{ fontWeight: 700, marginTop: "0.15rem" }}>{operatingArea}</div>
          </div>
          <div>
            <div style={{ color: "var(--slate-500)", fontSize: "0.75rem", fontWeight: 700 }}>
              {tx({ hi: "भूमिका", en: "Role", mr: "भूमिका" })}
            </div>
            <div style={{ fontWeight: 700, marginTop: "0.15rem" }}>
              {tx({ hi: "कलेक्टर (कबाडी)", en: "Collector (Scrap Picker)", mr: "कलेक्टर (कबाडी)" })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Language & Voice Speed (ROLE RB3.4) */}
      <section className="card" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <Globe size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
            {tx({ hi: "भाषा और आवाज", en: "Language & Voice", mr: "भाषा आणि आवाज" })}
          </h2>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--slate-700)", display: "block", marginBottom: "0.5rem" }}>
            {tx({ hi: "एप्लिकेशन की भाषा चुनें", en: "Select Application Language", mr: "अॅपची भाषा निवडा" })}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            {(
              [
                { code: "HI", label: "हिंदी" },
                { code: "MR", label: "मराठी" },
                { code: "EN", label: "English" },
              ] as const
            ).map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLangChange(code)}
                className={`btn btn-sm ${currentLang === code ? "btn-primary" : "btn-secondary"}`}
                style={{ fontWeight: currentLang === code ? 800 : 600, padding: "0.6rem 0.5rem" }}
              >
                {label} {currentLang === code && "✓"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--slate-700)", display: "block", marginBottom: "0.5rem" }}>
            {tx({ hi: "आवाज़ की गति (Voice Speed)", en: "Voice Speed Rate", mr: "आवाजाचा वेग" })}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            {[
              { val: 0.8, label: { hi: "धीमी (0.8x)", en: "Slow (0.8x)", mr: "हळू (0.8x)" } },
              { val: 1.0, label: { hi: "सामान्य (1.0x)", en: "Normal (1.0x)", mr: "सामान्य (1.0x)" } },
              { val: 1.2, label: { hi: "तेज़ (1.2x)", en: "Fast (1.2x)", mr: "जलद (1.2x)" } },
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => handleVoiceSpeedChange(val)}
                className={`btn btn-sm ${voiceSpeed === val ? "btn-primary" : "btn-secondary"}`}
                style={{ fontWeight: voiceSpeed === val ? 800 : 600, padding: "0.5rem 0.25rem" }}
              >
                {tx(label)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Location Privacy (GEO G10.1) */}
      <section className="card" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <Shield size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
            {tx({ hi: "लोकेशन गोपनीयता", en: "Location Privacy", mr: "स्थान गोपनीयता" })}
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1rem",
            backgroundColor: "#f8fafc",
            borderRadius: "0.5rem",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {tx({
                hi: "मेरी सटीक लोकेशन सेव न करें",
                en: "Don't save my exact location",
                mr: "माझे अचूक स्थान सेव्ह करू नका",
              })}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--slate-600)", marginTop: "0.2rem" }}>
              {tx({
                hi: "सटीक GPS की जगह 100 मीटर राउंड या एरिया सेंट्रॉइड सेव होगा।",
                en: "Stores 3-decimal rounded coordinates (~100m) or area centroid on lots.",
                mr: "अचूक GPS ऐवजी १०० मीटर राउंड किंवा एरिया सेंट्रॉइड सेव्ह होईल.",
              })}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={dontSaveExactLocation}
            onClick={handleExactLocationToggle}
            className={`btn btn-sm ${dontSaveExactLocation ? "btn-primary" : "btn-secondary"}`}
            style={{ fontWeight: 800, minWidth: "70px" }}
          >
            {dontSaveExactLocation ? "ON" : "OFF"}
          </button>
        </div>

        {dontSaveExactLocation && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem 0.9rem",
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <TriangleAlert size={16} style={{ color: "#d97706", flexShrink: 0 }} aria-hidden="true" />
            <span>
              {tx({
                hi: "सूचना: सटीक लोकेशन न होने पर हैंडओवर सत्यापन स्कोर कम हो सकता है।",
                en: "Notice: Storing rounded locations may reduce verification score on handover.",
                mr: "सूचना: अचूक स्थान नसल्यास हँडओव्हर पडताळणी गुण कमी होऊ शकतात.",
              })}
            </span>
          </div>
        )}
      </section>

      {/* 4. Battery & Data Mode (GEO G10.2) */}
      <section className="card" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <BatteryCharging size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
            {tx({ hi: "बैटरी और डेटा बचत", en: "Battery & Low-Data Mode", mr: "बॅटरी आणि डेटा बचत" })}
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1rem",
            backgroundColor: "#f8fafc",
            borderRadius: "0.5rem",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {tx({ hi: "लो-डेटा मोड (Low-Data)", en: "Low-Data Mode", mr: "कमी डेटा मोड" })}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--slate-600)", marginTop: "0.2rem" }}>
              {tx({
                hi: "इंटरनेट डेटा और बैटरी बचाता है (फोटो थंबनेल छोटे होंगे)।",
                en: "Saves mobile data and battery by optimizing photo previews and caching.",
                mr: "मोबाईल डेटा आणि बॅटरी वाचवतो.",
              })}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={lowDataMode}
            onClick={handleLowDataToggle}
            className={`btn btn-sm ${lowDataMode ? "btn-primary" : "btn-secondary"}`}
            style={{ fontWeight: 800, minWidth: "70px" }}
          >
            {lowDataMode ? "ON" : "OFF"}
          </button>
        </div>
      </section>

      {/* 5. App Lock Timeout (ROLE RB2.7 / RB3.4) */}
      <section className="card" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <Lock size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
            {tx({ hi: "ऐप लॉक समय (App Lock)", en: "App Lock Timeout", mr: "अॅप लॉक वेळ" })}
          </h2>
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--slate-600)", marginBottom: "0.75rem" }}>
          {tx({
            hi: "ऐप बैकग्राउंड में जाने के बाद कितने समय बाद पिन लॉक हो:",
            en: "Lock app with PIN after inactivity in background:",
            mr: "अॅप बॅकग्राउंडमध्ये गेल्यानंतर किती वेळाने पिन लॉक व्हावे:",
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
          {[
            { val: 120, label: "2 min" },
            { val: 300, label: "5 min" },
            { val: 600, label: "10 min" },
            { val: 0, label: "Never" },
          ].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => handleTimeoutChange(val)}
              className={`btn btn-sm ${appLockTimeout === val ? "btn-primary" : "btn-secondary"}`}
              style={{ fontWeight: appLockTimeout === val ? 800 : 600, padding: "0.5rem 0.25rem" }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 6. Privacy Note (Zero-PII Compliance) */}
      <section
        style={{
          padding: "1rem",
          backgroundColor: "#f1f5f9",
          borderRadius: "0.75rem",
          fontSize: "0.8rem",
          color: "#475569",
          lineHeight: 1.5,
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}
      >
        <Info size={18} style={{ color: "var(--slate-500)", flexShrink: 0, marginTop: "0.1rem" }} aria-hidden="true" />
        <div>
          <strong>{tx({ hi: "गोपनीयता वादा:", en: "Zero-PII Privacy Notice:", mr: "गोपनीयता सूचना:" })}</strong>{" "}
          {tx({
            hi: "ई-वेस्ट साथी कभी भी आपका आधार, असली पता या पहचान दस्तावेज स्टोर नहीं करता। केवल ई-कचरा वजन और भुगतान रिकॉर्ड सुरक्षित रखे जाते हैं।",
            en: "E-Waste Saathi never collects or stores Aadhaar, street addresses, or personal identity documents. Only scrap weight, rate, and transaction records are maintained.",
            mr: "ई-वेस्ट साथी कधीही आधार किंवा ओळखपत्रे साठवत नाही.",
          })}
        </div>
      </section>

      {/* 7. Switch Role Links (ROLE RB3.4) */}
      <section className="card" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg, 16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <ArrowLeftRight size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
            {tx({ hi: "भूमिका बदलें (Switch Role)", en: "Switch Role", mr: "भूमिका बदला" })}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link
            href="/recycler/login"
            className="btn btn-secondary btn-block"
            style={{ justifyContent: "space-between", fontWeight: 700 }}
          >
            <span>{tx({ hi: "रिसायकलर पोर्टल पर जाएं", en: "Go to Recycler Portal", mr: "रिसायकलर पोर्टलवर जा" })}</span>
            <span>&rarr;</span>
          </Link>
          <Link
            href="/field/login"
            className="btn btn-secondary btn-block"
            style={{ justifyContent: "space-between", fontWeight: 700 }}
          >
            <span>{tx({ hi: "फील्ड एजेंट ऑपरेशंस", en: "Field Agent Operations", mr: "फील्ड एजंट ऑपरेशन्स" })}</span>
            <span>&rarr;</span>
          </Link>
          <Link
            href="/admin/login"
            className="btn btn-secondary btn-block"
            style={{ justifyContent: "space-between", fontWeight: 700 }}
          >
            <span>{tx({ hi: "प्लेटफ़ॉर्म एडमिन", en: "Platform Admin", mr: "प्लॅटफॉर्म अॅडमिन" })}</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* 8. Sign Out Button */}
      <form action={logoutAction} style={{ marginTop: "1rem" }}>
        <button
          type="submit"
          className="btn btn-danger btn-block btn-lg"
          style={{
            padding: "0.85rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <LogOut size={20} aria-hidden="true" />
          <span>{tx({ hi: "लॉगआउट करें (Sign Out)", en: "Sign Out", mr: "लॉगआउट करा" })}</span>
        </button>
      </form>
    </div>
  );
}

