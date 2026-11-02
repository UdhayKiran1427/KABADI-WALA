"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleUserRound, House, PackagePlus, Recycle, ReceiptText, Settings } from "lucide-react";
import { useTxt, VoiceControls, type Txt } from "./ui";

interface CollectorNavbarClientProps {
  unreadNotifications?: number;
  name?: string | null;
}

const NAV: Array<{ href: string; label: Txt; Icon: typeof House; exact?: boolean; alerts?: boolean }> = [
  { href: "/collector", label: { hi: "होम", en: "Home", mr: "होम" }, Icon: House, exact: true },
  { href: "/collector/create-lot", label: { hi: "नया लॉट", en: "New lot", mr: "नवीन लॉट" }, Icon: PackagePlus },
  { href: "/collector/ledger", label: { hi: "इतिहास", en: "History", mr: "इतिहास" }, Icon: ReceiptText },
  { href: "/collector/notifications", label: { hi: "सूचना", en: "Alerts", mr: "सूचना" }, Icon: Bell, alerts: true },
  { href: "/collector/settings", label: { hi: "सेटिंग्स", en: "Settings", mr: "सेटिंग्ज" }, Icon: Settings },
];

function useIsActive() {
  const pathname = usePathname() || "";
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
}

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="c-nav-badge">{count > 9 ? "9+" : count}</span>;
}

/** Top bar: brand, desktop links, speaker, language, profile. */
export function CollectorNavbarClient({ unreadNotifications = 0, name }: CollectorNavbarClientProps) {
  const tx = useTxt();
  const isActive = useIsActive();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", minWidth: 0 }}>
        <Link href="/collector" className="brand" style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          <Recycle size={22} aria-hidden="true" style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tx({ hi: "ई-वेस्ट साथी", en: "E-Waste Saathi", mr: "ई-वेस्ट साथी" })}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.15rem 0.5rem",
              backgroundColor: "#dcfce7",
              color: "#166534",
              borderRadius: "999px",
              marginLeft: "0.25rem",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              flexShrink: 0,
            }}
          >
            {tx({ hi: "कलेक्टर", en: "Collector", mr: "कलेक्टर" })}
          </span>
        </Link>

        <nav className="c-desktop-nav" aria-label="Main">
          {NAV.map(({ href, label, Icon, exact, alerts }) => (
            <Link key={href} href={href} className={`c-desktop-link ${isActive(href, exact) ? "active" : ""}`}>
              <Icon size={18} aria-hidden="true" />
              <span>{tx(label)}</span>
              {alerts && <UnreadDot count={unreadNotifications} />}
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <VoiceControls />
        <Link
          href="/collector/settings"
          className="c-icon-btn"
          aria-label={tx({ hi: "सेटिंग्स", en: "Settings", mr: "सेटिंग्ज" })}
          title={tx({ hi: "सेटिंग्स", en: "Settings", mr: "सेटिंग्ज" })}
        >
          <Settings size={18} aria-hidden="true" />
        </Link>
        <Link
          href="/collector/profile"
          className={`c-icon-btn ${name ? "c-avatar-btn" : ""}`}
          aria-label={tx({ hi: "मेरी प्रोफ़ाइल", en: "My profile", mr: "माझी प्रोफाइल" })}
          title={tx({ hi: "मेरी प्रोफ़ाइल", en: "My profile", mr: "माझी प्रोफाइल" })}
        >
          {name ? (
            <span className="c-avatar" style={{ width: "100%", height: "100%", fontSize: "1rem" }} aria-hidden="true">
              {name.trim().charAt(0).toUpperCase()}
            </span>
          ) : (
            <CircleUserRound size={22} aria-hidden="true" />
          )}
        </Link>
      </div>
    </div>
  );
}

/** Mobile bottom navigation: 4 items. */
export function CollectorBottomNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const tx = useTxt();
  const isActive = useIsActive();

  return (
    <nav className="collector-bottom-nav mobile-only" aria-label="Main">
      <div className="collector-bottom-nav-inner">
        {NAV.map(({ href, label, Icon, exact, alerts }) => (
          <Link
            key={href}
            href={href}
            className={`collector-nav-item c-nav-item ${isActive(href, exact) ? "active" : ""}`}
            aria-current={isActive(href, exact) ? "page" : undefined}
          >
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={24} aria-hidden="true" />
              {alerts && <UnreadDot count={unreadNotifications} />}
            </span>
            <span>{tx(label)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
