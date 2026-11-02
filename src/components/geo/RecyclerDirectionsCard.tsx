"use client";

import React, { useState } from "react";
import {
  Bike,
  Car,
  CheckCircle2,
  Footprints,
  MapPin,
  Navigation,
  Phone,
  Send,
  Share2,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";
import {
  type TravelMode,
  calculateTravelMinutes,
  getDirectionsUrl,
  buildLocationShareMessage,
  checkArrivalProximity,
} from "@/lib/domain/geoDirections";
import { kg } from "@/lib/format";

export interface RecyclerDirectionsCardProps {
  recycler: {
    id: string;
    name: string;
    address: string;
    landmark?: string | null;
    latitude: number;
    longitude: number;
    contactPhone?: string | null;
    whatsappPhone?: string | null;
  };
  distanceKm: number;
  lotId?: string;
  lotRef?: string;
  userLat?: number | null;
  userLng?: number | null;
  onArrivalConfirmed?: (distanceMeters: number) => void;
  showArrivalButton?: boolean;
}

export function RecyclerDirectionsCard({
  recycler,
  distanceKm,
  lotId,
  lotRef = "LOT",
  userLat,
  userLng,
  onArrivalConfirmed,
  showArrivalButton = false,
}: RecyclerDirectionsCardProps) {
  const [selectedMode, setSelectedMode] = useState<TravelMode>("vehicle");
  const [arrivalStatus, setArrivalStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "arrived"; distanceMeters: number }
    | { state: "far"; distanceMeters: number }
  >({ state: "idle" });

  const walkMin = calculateTravelMinutes(distanceKm, "walk");
  const bikeMin = calculateTravelMinutes(distanceKm, "bike");
  const vehicleMin = calculateTravelMinutes(distanceKm, "vehicle");

  function openDirections(mode: TravelMode) {
    const url = getDirectionsUrl(recycler.latitude, recycler.longitude, mode, userLat, userLng);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleShareLocation() {
    const text = buildLocationShareMessage({
      recyclerName: recycler.name,
      lotRef,
      destLat: recycler.latitude,
      destLng: recycler.longitude,
      landmark: recycler.landmark,
      language: "HI",
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `E-Waste Saathi: ${recycler.name}`,
          text,
        });
        return;
      } catch {
        // Fallback to WhatsApp
      }
    }
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function handleCheckArrival() {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported in this browser");
      return;
    }
    setArrivalStatus({ state: "checking" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const proximity = checkArrivalProximity(
          pos.coords.latitude,
          pos.coords.longitude,
          recycler.latitude,
          recycler.longitude
        );

        if (proximity.arrived) {
          setArrivalStatus({ state: "arrived", distanceMeters: proximity.distanceMeters });
        } else {
          setArrivalStatus({ state: "far", distanceMeters: proximity.distanceMeters });
        }

        if (lotId) {
          fetch(`/api/v1/lots/${lotId}/arrived`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          }).catch(() => {});
        }

        if (onArrivalConfirmed) {
          onArrivalConfirmed(proximity.distanceMeters);
        }
      },
      () => {
        setArrivalStatus({ state: "idle" });
        alert("Could not access location. Please check GPS settings.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const phoneHref = recycler.contactPhone ? `tel:${recycler.contactPhone}` : null;
  const whatsappNumber = recycler.whatsappPhone || recycler.contactPhone;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/91${whatsappNumber.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Namaste, I have a pickup/handover for Lot ${lotRef}`)}`
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        backgroundColor: "var(--slate-50, #f8fafc)",
        border: "1px solid var(--slate-200, #e2e8f0)",
        borderRadius: "var(--radius-md, 12px)",
        padding: "1rem",
      }}
    >
      {/* Address & Landmark */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
          <MapPin size={18} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "0.15rem" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--slate-900)" }}>{recycler.name}</div>
            <div style={{ fontSize: "0.825rem", color: "var(--slate-600)" }}>{recycler.address}</div>
            {recycler.landmark && (
              <div style={{ fontSize: "0.8rem", color: "var(--primary-800)", fontWeight: 600, marginTop: "0.2rem" }}>
                📍 लैंडमार्क / Landmark: {recycler.landmark}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode Choice & Estimated Travel Time */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.6rem 0.75rem",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid var(--slate-200)",
        }}
      >
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
          अनुमानित समय / Travel Time ({distanceKm.toFixed(1)} km)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
          <button
            type="button"
            onClick={() => {
              setSelectedMode("walk");
              openDirections("walk");
            }}
            className={`btn btn-sm ${selectedMode === "walk" ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", padding: "0.4rem" }}
            title="Walk mode (4.5 km/h)"
          >
            <Footprints size={16} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>~{walkMin} min</span>
            <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>पैदल</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode("bike");
              openDirections("bike");
            }}
            className={`btn btn-sm ${selectedMode === "bike" ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", padding: "0.4rem" }}
            title="Bike mode (12 km/h)"
          >
            <Bike size={16} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>~{bikeMin} min</span>
            <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>बाइक</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode("vehicle");
              openDirections("vehicle");
            }}
            className={`btn btn-sm ${selectedMode === "vehicle" ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", padding: "0.4rem" }}
            title="Vehicle mode (20 km/h)"
          >
            <Car size={16} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>~{vehicleMin} min</span>
            <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>गाड़ी</span>
          </button>
        </div>
      </div>

      {/* Primary Action Buttons: Go There, Call, WhatsApp, Share */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => openDirections(selectedMode)}
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.6rem" }}
        >
          <Navigation size={18} />
          <span>रास्ता देखें (Go there)</span>
        </button>

        <button
          type="button"
          onClick={handleShareLocation}
          className="btn btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.6rem" }}
        >
          <Share2 size={16} />
          <span>शेयर / Share</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {phoneHref && (
          <a
            href={phoneHref}
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.5rem" }}
          >
            <Phone size={16} />
            <span>कॉल / Call</span>
          </a>
        )}

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.5rem" }}
          >
            <Send size={16} />
            <span>WhatsApp</span>
          </a>
        )}
      </div>

      {/* GEO G4.5: "I have reached" Button on C8 Handover */}
      {showArrivalButton && (
        <div style={{ marginTop: "0.4rem", borderTop: "1px dashed var(--slate-300)", paddingTop: "0.75rem" }}>
          {arrivalStatus.state === "idle" && (
            <button
              type="button"
              onClick={handleCheckArrival}
              className="btn btn-block btn-secondary"
              style={{ padding: "0.7rem", fontWeight: 700 }}
            >
              <MapPin size={18} style={{ color: "var(--primary)" }} />
              <span>मैं पहुंच गया हूँ / I have reached</span>
            </button>
          )}

          {arrivalStatus.state === "checking" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.5rem" }}>
              <LoaderCircle size={18} className="c-spin" />
              <span style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>GPS से पुष्टि कर रहे हैं…</span>
            </div>
          )}

          {arrivalStatus.state === "arrived" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 0.85rem",
                backgroundColor: "var(--primary-50, #f0fdf4)",
                border: "1px solid var(--primary-border, #86efac)",
                borderRadius: "8px",
                color: "var(--primary-800, #166534)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <div>
                आप रीसाइक्लर केंद्र पर पहुंच गए हैं! ({arrivalStatus.distanceMeters}m away)
              </div>
            </div>
          )}

          {arrivalStatus.state === "far" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                padding: "0.6rem 0.85rem",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                color: "#92400e",
                fontSize: "0.825rem",
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
              <div>
                <strong>आप रीसाइक्लर से दूर लग रहे हैं</strong> ({kg(arrivalStatus.distanceMeters)} km दूर). कृपया पता जांचें।
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
