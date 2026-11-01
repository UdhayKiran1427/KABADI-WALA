"use client";

import React from "react";
import Link from "next/link";
import { useVoice } from "@/components/voice/VoiceLanguageContext";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

interface CollectorNavbarClientProps {
  collectorCode?: string;
  phone?: string;
  unreadNotifications?: number;
  logoutAction: () => Promise<void>;
}

export function CollectorNavbarClient({
  collectorCode,
  phone,
  unreadNotifications = 0,
  logoutAction,
}: CollectorNavbarClientProps) {
  const { textLanguage } = useVoice();
  const isEn = textLanguage === "EN";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      {/* Left: Brand & Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/collector" className="brand" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.35rem" }}>♻️</span>
          <span>{isEn ? "KABADI WALA" : "कबाड़ीवाला"}</span>
          {collectorCode && (
            <span
              style={{
                fontSize: "0.725rem",
                backgroundColor: "var(--primary-100)",
                color: "var(--primary-800)",
                padding: "0.15rem 0.55rem",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              #{collectorCode}
            </span>
          )}
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-only-flex" style={{ gap: "0.4rem", alignItems: "center" }}>
          <Link href="/collector" className="nav-link">
            {isEn ? "🏠 Dashboard" : "🏠 होम / Dashboard"}
          </Link>
          <Link
            href="/collector/create-lot"
            className="nav-link"
            style={{ color: "var(--primary-700)", fontWeight: 700 }}
          >
            {isEn ? "📦 + Create Lot" : "📦 + नया लॉट बनाएं"}
          </Link>
          <Link href="/collector/prices" className="nav-link">
            {isEn ? "📈 Scrap Rates" : "📈 आज के भाव"}
          </Link>
          <Link href="/collector/ledger" className="nav-link">
            {isEn ? "💰 My Earnings" : "💰 मेरी कमाई (Ledger)"}
          </Link>
          <Link href="/collector/drop-points" className="nav-link">
            {isEn ? "⛺ Drop Points" : "⛺ ड्रॉप बॉक्स"}
          </Link>
          <Link href="/collector/safety" className="nav-link">
            {isEn ? "⚠️ Safety Rules" : "⚠️ सुरक्षा नियम"}
          </Link>
        </nav>
      </div>

      {/* Right: Language Controls & User actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {/* Quick Toolbar */}
        <CollectorControlToolbar compact={true} />

        {/* Notifications */}
        <Link
          href="/collector/notifications"
          style={{
            position: "relative",
            fontSize: "1.15rem",
            textDecoration: "none",
            padding: "0.35rem 0.5rem",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--slate-100)",
          }}
          title={isEn ? "Notifications" : "सूचनाएं"}
        >
          🔔
          {unreadNotifications > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                backgroundColor: "var(--danger)",
                color: "#ffffff",
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "0.1rem 0.35rem",
                borderRadius: "999px",
                lineHeight: 1,
              }}
            >
              {unreadNotifications}
            </span>
          )}
        </Link>

        {phone && (
          <span className="desktop-only" style={{ fontSize: "0.825rem", color: "var(--slate-600)", fontWeight: 600 }}>
            {phone}
          </span>
        )}

        <form action={logoutAction}>
          <button
            type="submit"
            className="btn btn-sm btn-secondary"
            style={{
              color: "var(--danger)",
              borderColor: "var(--slate-200)",
              fontWeight: 600,
              padding: "0.25rem 0.65rem",
            }}
          >
            {isEn ? "Sign Out" : "लॉगआउट"}
          </button>
        </form>
      </div>
    </div>
  );
}

