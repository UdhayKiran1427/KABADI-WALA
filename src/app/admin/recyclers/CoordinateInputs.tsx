"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * Latitude/longitude inputs for a recycler facility. Collectors are matched to
 * recyclers within 5 km of these coordinates, so they must be accurate.
 */
export function CoordinateInputs({
  defaultLatitude,
  defaultLongitude,
  label = "Location (latitude, longitude)",
  helpText = "Collectors within 5 km will see this recycler.",
  required = true,
}: {
  defaultLatitude?: number | string | null;
  defaultLongitude?: number | string | null;
  label?: string;
  helpText?: string;
  required?: boolean;
} = {}) {
  const [lat, setLat] = useState(defaultLatitude != null ? String(defaultLatitude) : "");
  const [lng, setLng] = useState(defaultLongitude != null ? String(defaultLongitude) : "");
  const [status, setStatus] = useState("");

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("Location is not available in this browser.");
      return;
    }
    setStatus("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setStatus(`Captured (±${Math.round(pos.coords.accuracy)} m)`);
      },
      () => setStatus("Could not get location. Enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="form-group">
      <label className="form-label" style={{ fontWeight: 700 }}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem" }}>
        <input
          name="latitude"
          type="number"
          step="any"
          min="-90"
          max="90"
          required={required}
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="e.g. 19.0434"
          aria-label="Latitude"
          className="form-control"
        />
        <input
          name="longitude"
          type="number"
          step="any"
          min="-180"
          max="180"
          required={required}
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="e.g. 72.8567"
          aria-label="Longitude"
          className="form-control"
        />
        <button type="button" onClick={useCurrentLocation} className="btn btn-secondary" style={{ whiteSpace: "nowrap" }}>
          <MapPin size={16} aria-hidden="true" /> Use my location
        </button>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
        {status || helpText}
      </div>
    </div>
  );
}
