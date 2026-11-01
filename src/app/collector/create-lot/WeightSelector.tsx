"use client";

import { useState } from "react";

export function WeightSelector({ defaultValue = "5" }: { defaultValue?: string }) {
  const [weight, setWeight] = useState(defaultValue);

  const presets = [1, 5, 10, 25, 50];

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {presets.map((w) => (
          <button
            type="button"
            key={w}
            onClick={() => setWeight(String(w))}
            className={`btn ${weight === String(w) ? "btn-primary" : "btn-secondary"}`}
            style={{
              flex: 1,
              padding: "0.4rem 0.2rem",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            {w} kg
          </button>
        ))}
      </div>
      <input
        id="weightInput"
        type="number"
        step="0.1"
        min="0.1"
        name="weightKg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        required
        placeholder="वजन किलो में"
        className="input form-control"
        style={{ fontSize: "1.2rem", fontWeight: 700, padding: "0.75rem", textAlign: "center" }}
      />
    </div>
  );
}

