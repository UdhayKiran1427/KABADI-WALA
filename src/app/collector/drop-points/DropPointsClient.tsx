"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Building,
  Calendar,
  Clock,
  LoaderCircle,
  MapPin,
  MapPinOff,
  Navigation,
  Phone,
  RefreshCw,
  Tent,
} from "lucide-react";
import { T, useTxt } from "../ui";

export interface SerializedDropPoint {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
  operatingHours: string | null;
  operatingDates: string | null;
  contactPhone: string | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function DropPointsClient({
  points,
  defaultLat,
  defaultLng,
  defaultAreaName,
}: {
  points: SerializedDropPoint[];
  defaultLat: number;
  defaultLng: number;
  defaultAreaName?: string;
}) {
  const tx = useTxt();
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [gpsStatus, setGpsStatus] = useState<"idle" | "getting" | "live" | "fallback">("idle");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);

  function requestLiveGps() {
    if (!("geolocation" in navigator)) {
      setGpsStatus("fallback");
      return;
    }
    setGpsStatus("getting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsStatus("live");
      },
      () => {
        setGpsStatus("fallback");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Attempt to acquire geolocation automatically on mount
  useEffect(() => {
    requestLiveGps();
  }, []);

  const pointsWithDistance = useMemo(() => {
    return points
      .map((p) => {
        const distanceKm = haversineKm(coords.lat, coords.lng, p.latitude, p.longitude);
        return { ...p, distanceKm };
      })
      .filter((p) => (maxDistanceKm ? p.distanceKm <= maxDistanceKm : true))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [points, coords, maxDistanceKm]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Geolocation Status Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: gpsStatus === "live" ? "var(--primary-50, #f0fdf4)" : "var(--slate-50, #f8fafc)",
          border: `1px solid ${gpsStatus === "live" ? "var(--primary-200, #bbf7d0)" : "var(--slate-200, #e2e8f0)"}`,
          borderRadius: "var(--radius, 10px)",
          padding: "0.6rem 0.85rem",
          fontSize: "0.825rem",
          color: "var(--slate-700)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          {gpsStatus === "getting" ? (
            <>
              <LoaderCircle size={16} className="c-spin" aria-hidden="true" />
              {tx({ hi: "लाइव GPS खोज रहे हैं…", en: "Acquiring live GPS…", mr: "लाइव्ह GPS शोधत आहे…" })}
            </>
          ) : gpsStatus === "live" ? (
            <>
              <MapPin size={16} style={{ color: "var(--primary)" }} aria-hidden="true" />
              <span>
                <strong>{tx({ hi: "लाइव GPS", en: "Live GPS", mr: "लाइव्ह GPS" })}</strong>
                {coords.accuracy ? ` (±${coords.accuracy}m)` : ""}: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            </>
          ) : (
            <>
              <MapPin size={16} aria-hidden="true" />
              <span>
                {tx({ hi: "डिफ़ॉल्ट इलाका", en: "Operating Area", mr: "कार्यक्षेत्र" })}
                {defaultAreaName ? `: ${defaultAreaName}` : ""}
              </span>
            </>
          )}
        </span>

        <button
          type="button"
          onClick={requestLiveGps}
          className="btn btn-secondary btn-sm"
          style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          aria-label={tx({ hi: "GPS रीफ़्रेश", en: "Refresh GPS", mr: "GPS रीफ्रेश" })}
        >
          <RefreshCw size={12} aria-hidden="true" />
          {tx({ hi: "रीफ़्रेश", en: "GPS", mr: "रीफ्रेश" })}
        </button>
      </div>

      {/* Distance Filter Pills */}
      <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.2rem" }}>
        {[
          { label: tx({ hi: "सभी", en: "All", mr: "सर्व" }), val: null },
          { label: tx({ hi: "< 2 km", en: "< 2 km", mr: "< 2 km" }), val: 2 },
          { label: tx({ hi: "< 5 km", en: "< 5 km", mr: "< 5 km" }), val: 5 },
          { label: tx({ hi: "< 10 km", en: "< 10 km", mr: "< 10 km" }), val: 10 },
        ].map((f) => {
          const isActive = maxDistanceKm === f.val;
          return (
            <button
              key={String(f.val)}
              type="button"
              onClick={() => setMaxDistanceKm(f.val)}
              className={`btn btn-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", borderRadius: "20px" }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Drop Points List */}
      {pointsWithDistance.length === 0 ? (
        <div className="card c-empty">
          <MapPinOff size={36} aria-hidden="true" />
          <T
            hi="इस दूरी में कोई ड्रॉप पॉइंट नहीं"
            en="No drop points within this distance"
            mr="या अंतरात कोणताही ड्रॉप पॉइंट नाही"
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {pointsWithDistance.map((p) => {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${p.latitude},${p.longitude}`;
            const TypeIcon = p.type === "CAMP" ? Tent : p.type === "CENTER" ? Building : Box;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span className="c-tile-icon">
                    <TypeIcon size={22} aria-hidden="true" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--slate-900)" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>{p.address}</div>
                  </div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "var(--primary-800)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.distanceKm.toFixed(1)} km
                  </div>
                </div>

                {(p.operatingHours || p.operatingDates) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 1rem" }}>
                    {p.operatingHours && (
                      <span className="c-hint">
                        <Clock size={14} aria-hidden="true" /> {p.operatingHours}
                      </span>
                    )}
                    {p.operatingDates && (
                      <span className="c-hint">
                        <Calendar size={14} aria-hidden="true" /> {p.operatingDates}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-lg"
                    style={{ flex: 1 }}
                  >
                    <Navigation size={18} aria-hidden="true" />
                    <T hi="रास्ता (GPS)" en="Directions (GPS)" mr="रस्ता (GPS)" />
                  </a>
                  {p.contactPhone && (
                    <a
                      href={`tel:${p.contactPhone}`}
                      className="btn btn-secondary btn-lg"
                      aria-label="कॉल / Call"
                    >
                      <Phone size={18} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
