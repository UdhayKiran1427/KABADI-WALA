"use client";

import { useState } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { useTxt } from "../ui";

export interface PickerMaterial {
  id: number;
  nameHi: string;
  nameEn: string;
  nameMr: string | null;
  isHazardous: boolean;
  /** Today's price in paise per kg; null when the admin has not set one. */
  ratePaise: number | null;
}

const PRESETS = [1, 5, 10, 25];
const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

/**
 * Tap one or more materials, then enter the kg for each (e.g. PCB 5 kg + Wires 2 kg).
 * Sends one "weight_<categoryId>" field per selected material, and shows the running total.
 */
export function LotItemsPicker({ materials, initialCategoryId }: { materials: PickerMaterial[]; initialCategoryId?: number }) {
  const tx = useTxt();
  const [weights, setWeights] = useState<Array<{ id: number; kg: string }>>(() =>
    materials.some((m) => m.id === initialCategoryId && m.ratePaise) ? [{ id: initialCategoryId!, kg: "" }] : []
  );

  const isSelected = (id: number) => weights.some((w) => w.id === id);
  const toggle = (id: number) =>
    setWeights((prev) => (prev.some((w) => w.id === id) ? prev.filter((w) => w.id !== id) : [...prev, { id, kg: "" }]));
  const setKg = (id: number, kg: string) => setWeights((prev) => prev.map((w) => (w.id === id ? { ...w, kg } : w)));

  const lines = weights.map((w) => {
    const material = materials.find((m) => m.id === w.id)!;
    const kg = parseFloat(w.kg);
    const amount = Number.isFinite(kg) && kg > 0 && material.ratePaise ? Math.round(material.ratePaise * kg) : 0;
    return { ...w, material, amount };
  });
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const name = (m: PickerMaterial) => tx({ hi: m.nameHi, en: m.nameEn, mr: m.nameMr });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="c-section-title" style={{ marginBottom: "0.6rem" }}>
          1. {tx({ hi: "सामान चुनें (एक से ज़्यादा चुन सकते हैं)", en: "Materials (pick one or more)", mr: "साहित्य निवडा (एकापेक्षा जास्त)" })}
        </legend>
        <div className="c-choice-grid">
          {materials.map((m) => {
            const selected = isSelected(m.id);
            const disabled = !m.ratePaise;
            return (
              <label key={m.id} className={`c-choice c-multi ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}>
                <input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggle(m.id)} className="c-multi-input" />
                {selected && (
                  <span className="c-multi-check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
                <span className="c-choice-name">
                  {name(m)}
                  {m.isHazardous && (
                    <TriangleAlert size={14} aria-label="खतरनाक / Hazardous" style={{ color: "#c2410c", marginLeft: "0.25rem", verticalAlign: "-2px" }} />
                  )}
                </span>
                <span className="c-choice-price">
                  {m.ratePaise ? (
                    <>
                      {inr(m.ratePaise)}
                      <small>/kg</small>
                    </>
                  ) : (
                    <small style={{ color: "var(--slate-400)" }}>{tx({ hi: "आज भाव नहीं", en: "No price today", mr: "आज भाव नाही" })}</small>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <h2 className="c-section-title" style={{ margin: 0 }}>
          2. {tx({ hi: "हर सामान का वजन (किलो)", en: "Weight of each (kg)", mr: "प्रत्येकाचे वजन (किलो)" })}
        </h2>

        {lines.length === 0 ? (
          <div className="c-hint">{tx({ hi: "ऊपर से सामान चुनें", en: "Pick a material above", mr: "वरून साहित्य निवडा" })}</div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="card c-item-row">
              <div className="c-item-head">
                <strong style={{ minWidth: 0, overflowWrap: "anywhere" }}>{name(line.material)}</strong>
                <button
                  type="button"
                  className="c-icon-btn"
                  style={{ width: 36, height: 36, minWidth: 36 }}
                  onClick={() => toggle(line.id)}
                  aria-label={tx({ hi: "हटाएं", en: "Remove", mr: "काढा" }) + " " + name(line.material)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="c-item-weight">
                <input
                  type="number"
                  name={`weight_${line.id}`}
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  required
                  value={line.kg}
                  onChange={(e) => setKg(line.id, e.target.value)}
                  placeholder="kg"
                  aria-label={`${name(line.material)} kg`}
                  className="form-control c-item-kg"
                />
                <span className="c-item-amount">{line.amount ? inr(line.amount) : "–"}</span>
              </div>
              <div className="c-item-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${line.kg === String(p) ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setKg(line.id, String(p))}
                  >
                    {p} kg
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {lines.length > 0 && (
          <div className="c-items-total">
            <span>{tx({ hi: "आज के भाव से कुल", en: "Total at today's rate", mr: "आजच्या भावाने एकूण" })}</span>
            <strong>{inr(total)}</strong>
          </div>
        )}

        {lines.length > 0 && (
          <label className="c-asking">
            <span className="c-asking-label">
              {tx({ hi: "आप कितने में बेचना चाहते हैं? (वैकल्पिक)", en: "Your selling price (optional)", mr: "तुम्हाला किती ला विकायचे आहे? (ऐच्छिक)" })}
            </span>
            <span className="c-asking-row">
              <span aria-hidden="true">₹</span>
              <input
                type="number"
                name="askingPrice"
                inputMode="decimal"
                min="1"
                step="any"
                placeholder={String(Math.round(total / 100))}
                className="form-control"
              />
            </span>
            <small className="c-hint">
              {tx({
                hi: "खाली छोड़ें तो आज के भाव से बिकेगा। खरीदार यह भाव देखेंगे और अपना भाव दे सकते हैं।",
                en: "Leave blank to sell at today's rate. Buyers see this price and can make their own offer.",
                mr: "रिकामे ठेवल्यास आजच्या भावाने विकले जाईल. खरेदीदार हा भाव पाहतील आणि त्यांचा भाव देऊ शकतात.",
              })}
            </small>
          </label>
        )}
      </section>
    </div>
  );
}
