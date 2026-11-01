"use client";

import { useState } from "react";

export function WeightSelector({ defaultValue = "5" }: { defaultValue?: string }) {
  const [weight, setWeight] = useState(defaultValue);

  const presets = [1, 5, 10, 25, 50];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "0.4rem", marginBottom: "0.5rem" }}>
        {presets.map((w) => (
          <button
            type="button"
            key={w}
            onClick={() => setWeight(String(w))}
            aria-pressed={weight === String(w)}
            className={`btn ${weight === String(w) ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "0.7rem 0.1rem", fontSize: "0.95rem", fontWeight: 700, minHeight: "48px" }}
          >
            {w}
          </button>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <input
          id="weightInput"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0.1"
          name="weightKg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          placeholder="kg"
          className="input form-control"
          style={{ fontSize: "1.5rem", fontWeight: 800, padding: "0.7rem 3rem", textAlign: "center" }}
        />
        <span
          aria-hidden="true"
          style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--slate-500)", fontWeight: 700 }}
        >
          kg
        </span>
      </div>
    </div>
  );
}
