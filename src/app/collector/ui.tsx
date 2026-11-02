"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Languages, PackageCheck, Square, Truck, Volume2 } from "lucide-react";
import { kg } from "@/lib/format";
import { useVoice } from "@/components/voice/VoiceLanguageContext";
import type { AppLanguage } from "@/lib/voice/speech";

/* ------------------------------------------------------------------ */
/* Text: show only the language the collector picked                   */
/* ------------------------------------------------------------------ */

export type Txt = { hi: string; en: string; mr?: string | null };

/** Returns a picker that shows only the selected language (Marathi falls back to Hindi). */
export function useTxt() {
  const { textLanguage, voiceLanguage } = useVoice();
  return (x: Txt) => {
    if (textLanguage === "EN") return x.en;
    if (voiceLanguage === "MR" && x.mr) return x.mr;
    return x.hi;
  };
}

/** Inline text in the selected language. Usable from server components. */
export function T(props: Txt) {
  const tx = useTxt();
  return <>{tx(props)}</>;
}

/* ------------------------------------------------------------------ */
/* Page narration: pages register what the header speaker should say   */
/* ------------------------------------------------------------------ */

type Narration = { hi: string; en: string; mr: string };

let currentNarration: Narration | null = null;
const listeners = new Set<() => void>();

function setNarration(n: Narration | null) {
  currentNarration = n;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Renders nothing; tells the header speaker button what to read for this page. */
export function PageVoice({ hi, en, mr }: Narration) {
  useEffect(() => {
    setNarration({ hi, en, mr });
    return () => setNarration(null);
  }, [hi, en, mr]);
  return null;
}

const DEFAULT_NARRATION: Narration = {
  en: "Kabadi Wala. Tap New lot to sell your scrap.",
  hi: "कबाड़ीवाला। अपना कबाड़ बेचने के लिए नया लॉट दबाएं।",
  mr: "कबाडीवाला. आपला भंगार विकण्यासाठी नवीन लॉट दाबा.",
};

/** Small round speaker button: reads the current page aloud in the chosen voice language. */
export function ListenButton() {
  const narration = useSyncExternalStore(subscribe, () => currentNarration, () => null);
  const { voiceLanguage, speak, speakingId, stop } = useVoice();
  const tx = useTxt();
  const id = "collector-page-voice";
  const isOn = speakingId === id;

  const onClick = () => {
    if (isOn) {
      stop();
      return;
    }
    const n = narration ?? DEFAULT_NARRATION;
    speak(voiceLanguage === "EN" ? n.en : voiceLanguage === "MR" ? n.mr : n.hi, id);
  };

  const label = isOn ? tx({ hi: "आवाज़ बंद करें", en: "Stop audio", mr: "आवाज बंद करा" }) : tx({ hi: "सुनें", en: "Listen", mr: "ऐका" });

  return (
    <button type="button" onClick={onClick} className={`c-icon-btn ${isOn ? "is-on" : ""}`} aria-label={label} title={label}>
      {isOn ? <Square size={18} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
    </button>
  );
}

/** Compact language picker (text + voice). */
export function LanguageSelect() {
  const { voiceLanguage, setVoiceLanguage, setTextLanguage } = useVoice();

  const onChange = (lang: AppLanguage) => {
    setVoiceLanguage(lang);
    setTextLanguage(lang as "EN" | "HI" | "MR");
  };

  return (
    <label className="c-lang">
      <Languages size={18} aria-hidden="true" />
      <select
        aria-label="भाषा / Language"
        value={voiceLanguage}
        onChange={(e) => onChange(e.target.value as AppLanguage)}
        className="c-lang-select"
      >
        <option value="HI">हिंदी</option>
        <option value="MR">मराठी</option>
        <option value="EN">English</option>
      </select>
    </label>
  );
}

/** Speaker + language, used in the header and on the login/register screens. */
export function VoiceControls() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <ListenButton />
      <LanguageSelect />
    </div>
  );
}

/** Hidden form field that sends the language picked in the header (HI / MR / EN). */
export function PreferredLanguageInput({ name }: { name: string }) {
  const { voiceLanguage } = useVoice();
  return <input type="hidden" name={name} value={voiceLanguage} />;
}

/* ------------------------------------------------------------------ */
/* Layout bits                                                          */
/* ------------------------------------------------------------------ */

/** Page title with an optional back arrow. */
export function PageTitle({ title, back, sub }: { title: Txt; back?: string; sub?: string }) {
  const tx = useTxt();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      {back && (
        <Link href={back} className="c-icon-btn" aria-label={tx({ hi: "वापस", en: "Back", mr: "मागे" })}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
      )}
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, lineHeight: 1.2 }}>{tx(title)}</h1>
        {sub && <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lot status                                                           */
/* ------------------------------------------------------------------ */

const LOT_STATUS: Record<string, Txt & { cls: string }> = {
  DRAFT: { hi: "पक्का करें", en: "Confirm", mr: "निश्चित करा", cls: "badge-warning" },
  READY: { hi: "खरीदार खोज रहे", en: "Finding buyer", mr: "खरेदीदार शोधत आहे", cls: "badge-info" },
  MATCHED: { hi: "पैसे लें", en: "Get paid", mr: "पैसे घ्या", cls: "badge-info" },
  HANDED_OVER: { hi: "सौंप दिया", en: "Handed over", mr: "दिले", cls: "badge-info" },
  COMPLETED: { hi: "पैसे मिले", en: "Paid", mr: "पैसे मिळाले", cls: "badge-success" },
  DISPUTED: { hi: "विवाद", en: "Dispute", mr: "वाद", cls: "badge-danger" },
};
const CLOSED: Txt & { cls: string } = { hi: "बंद", en: "Closed", mr: "बंद", cls: "badge-neutral" };

export type LotPickup = {
  status: "WAITING" | "ON_THE_WAY" | "PICKED_UP";
  vehicleNumber?: string;
  /** What the vehicle took, shown once picked up */
  materials?: Array<Txt & { grams: number }>;
};

/** One line under a lot row: waiting for the buyer's vehicle, vehicle coming, or what was picked up. */
export function LotPickupLine({ pickup }: { pickup: LotPickup | null }) {
  const tx = useTxt();
  if (!pickup) return null;

  if (pickup.status === "WAITING") {
    return (
      <div className="c-pickup-line is-waiting">
        <Clock size={14} aria-hidden="true" />
        {tx({ hi: "गाड़ी का इंतज़ार", en: "Waiting for vehicle", mr: "गाडीची वाट" })}
      </div>
    );
  }
  if (pickup.status === "ON_THE_WAY") {
    return (
      <div className="c-pickup-line is-coming">
        <Truck size={14} aria-hidden="true" />
        {tx({ hi: "गाड़ी आ रही है", en: "Vehicle coming", mr: "गाडी येत आहे" })} · {pickup.vehicleNumber}
      </div>
    );
  }
  const what = (pickup.materials ?? []).map((m) => `${tx(m)} ${kg(m.grams)} kg`).join(", ");
  return (
    <div className="c-pickup-line is-done">
      <PackageCheck size={14} aria-hidden="true" />
      <span>
        {tx({ hi: "उठा लिया", en: "Picked up", mr: "उचलले" })}
        {what && <>: {what}</>}
      </span>
    </div>
  );
}

export function LotStatusBadge({ status }: { status: string }) {
  const tx = useTxt();
  const s = LOT_STATUS[status] ?? CLOSED;
  return (
    <span className={`badge ${s.cls}`} style={{ whiteSpace: "nowrap" }}>
      {tx(s)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                              */
/* ------------------------------------------------------------------ */

/** Submit button that asks "are you sure?" first (for destructive actions). */
export function ConfirmSubmit({
  children,
  question,
  className,
}: {
  children: React.ReactNode;
  question: Txt;
  className?: string;
}) {
  const tx = useTxt();
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(tx(question))) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
