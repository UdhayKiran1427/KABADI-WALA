"use client";

import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, MapPin, RefreshCw } from "lucide-react";
import { useTxt } from "../ui";

type LocationState =
  | { kind: "pending" }
  | { kind: "captured"; lat: number; lng: number; accuracy: number }
  | { kind: "unavailable" };

/**
 * Captures the device location into hidden latitude/longitude inputs so nearby
 * recyclers (5 km) can be found. Falls back to the registered area on the server.
 */
export function LocationCapture({ fallbackArea }: { fallbackArea: string }) {
  const [location, setLocation] = useState<LocationState>({ kind: "pending" });
  const tx = useTxt();

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocation({ kind: "unavailable" });
      return;
    }
    setLocation({ kind: "pending" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          kind: "captured",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      () => setLocation({ kind: "unavailable" }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(requestLocation, []);

  return (
    <div
      style={{
        padding: "0.6rem 0.85rem",
        borderRadius: "var(--radius)",
        border: "1px solid var(--slate-200)",
        backgroundColor: "var(--slate-50)",
        fontSize: "0.875rem",
        color: "var(--slate-700)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.75rem",
        minHeight: "48px",
      }}
    >
      <input type="hidden" name="latitude" value={location.kind === "captured" ? location.lat : ""} />
      <input type="hidden" name="longitude" value={location.kind === "captured" ? location.lng : ""} />

      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
        {location.kind === "pending" && (
          <>
            <LoaderCircle size={18} className="c-spin" aria-hidden="true" />
            {tx({ hi: "लोकेशन ले रहे हैं…", en: "Getting location…", mr: "लोकेशन घेत आहे…" })}
          </>
        )}
        {location.kind === "captured" && (
          <>
            <CircleCheck size={18} aria-hidden="true" style={{ color: "var(--primary)" }} />
            {tx({ hi: "लोकेशन मिल गई", en: "Location found", mr: "लोकेशन मिळाले" })}
          </>
        )}
        {location.kind === "unavailable" && (
          <>
            <MapPin size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>
              {tx({ hi: "GPS नहीं मिला", en: "No GPS", mr: "GPS मिळाले नाही" })}
              {fallbackArea && ` · ${fallbackArea}`}
            </span>
          </>
        )}
      </span>

      {location.kind === "unavailable" && (
        <button
          type="button"
          onClick={requestLocation}
          className="c-icon-btn"
          aria-label={tx({ hi: "फिर कोशिश करें", en: "Try again", mr: "पुन्हा प्रयत्न करा" })}
        >
          <RefreshCw size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
