"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, LogOut, PackagePlus, Recycle, Wallet } from "lucide-react";
import { useTxt, VoiceControls, type Txt } from "./ui";

interface CollectorNavbarClientProps {
  unreadNotifications?: number;
  logoutAction: () => Promise<void>;
}

const NAV: Array<{ href: string; label: Txt; Icon: typeof House; exact?: boolean; alerts?: boolean }> = [
  { href: "/collector", label: { hi: "होम", en: "Home", mr: "होम" }, Icon: House, exact: true },
  { href: "/collector/create-lot", label: { hi: "नया लॉट", en: "New lot", mr: "नवीन लॉट" }, Icon: PackagePlus },
  { href: "/collector/ledger", label: { hi: "कमाई", en: "Earnings", mr: "कमाई" }, Icon: Wallet },
  { href: "/collector/notifications", label: { hi: "सूचना", en: "Alerts", mr: "सूचना" }, Icon: Bell, alerts: true },
];

function useIsActive() {
  const pathname = usePathname() || "";
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
}

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="c-nav-badge">{count > 9 ? "9+" : count}</span>;
}

/** Top bar: brand, desktop links, speaker, language, sign-out. */
export function CollectorNavbarClient({ unreadNotifications = 0, logoutAction }: CollectorNavbarClientProps) {
  const tx = useTxt();
  const isActive = useIsActive();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", minWidth: 0 }}>
        <Link href="/collector" className="brand" style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          <Recycle size={22} aria-hidden="true" style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tx({ hi: "कबाड़ीवाला", en: "Kabadi Wala", mr: "कबाडीवाला" })}
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
        <form action={logoutAction}>
          <button
            type="submit"
            className="c-icon-btn"
            aria-label={tx({ hi: "लॉगआउट", en: "Sign out", mr: "लॉगआउट" })}
            title={tx({ hi: "लॉगआउट", en: "Sign out", mr: "लॉगआउट" })}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </form>
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
