"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Compass, Info, MapPin, Navigation, Sparkles, TrendingUp, XCircle } from "lucide-react";
import { VoicePriceRow } from "@/components/voice/VoicePriceRow";
import { compareAreaPrice, DEFAULT_TRAVEL_COST_PER_KM_PAISE } from "@/lib/domain/nearbyPrices";
import { T, useTxt } from "../ui";

export interface CategoryBoardItem {
  id: string;
  nameEn: string;
  nameHi: string;
  nameMr?: string;
  code: string;
  rateRupees: string;
  lowRupees: string;
  highRupees: string;
  trend: "UP" | "DOWN" | "FLAT";
  isHazardous: boolean;
  ratePaise: number;
}

export interface NearbyAreaItem {
  areaName: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  // Prices per categoryId (paise)
  rates: Record<string, number>;
}

export function PricesBoardClient({
  categories,
  nearbyAreas,
}: {
  categories: CategoryBoardItem[];
  nearbyAreas: NearbyAreaItem[];
}) {
  const tx = useTxt();
  const [viewMode, setViewMode] = useState<"LOCAL" | "NEARBY">("LOCAL");
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || "1");
  const [weightKg, setWeightKg] = useState<number>(15);

  const selectedCategory = categories.find((c) => c.id === selectedCatId) || categories[0];
  const localRatePaise = selectedCategory?.ratePaise || 30000;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* View Mode Toggle: My Area vs Nearby Areas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          backgroundColor: "var(--slate-100, #f1f5f9)",
          padding: "0.3rem",
          borderRadius: "var(--radius-md, 10px)",
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("LOCAL")}
          className={`btn btn-sm ${viewMode === "LOCAL" ? "btn-primary" : "btn-secondary"}`}
          style={{
            borderRadius: "8px",
            border: "none",
            boxShadow: viewMode === "LOCAL" ? "var(--shadow-sm)" : "none",
            fontWeight: 700,
          }}
        >
          <T hi="मेरा इलाका (आज के भाव)" en="My Area (Today's Rates)" mr="माझे क्षेत्र (आजचे भाव)" />
        </button>

        <button
          type="button"
          onClick={() => setViewMode("NEARBY")}
          className={`btn btn-sm ${viewMode === "NEARBY" ? "btn-primary" : "btn-secondary"}`}
          style={{
            borderRadius: "8px",
            border: "none",
            boxShadow: viewMode === "NEARBY" ? "var(--shadow-sm)" : "none",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
          }}
        >
          <Sparkles size={14} />
          <T hi="आस-पास के इलाके" en="Nearby Areas" mr="जवळपासचे भाग" />
        </button>
      </div>

      {/* VIEW 1: Local Today's Price Board */}
      {viewMode === "LOCAL" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {categories.map((cat) => (
            <VoicePriceRow
              key={cat.id}
              id={cat.id}
              nameEn={cat.nameEn}
              nameHi={cat.nameHi}
              nameMr={cat.nameMr}
              code={cat.code}
              rateRupees={cat.rateRupees}
              lowRupees={cat.lowRupees}
              highRupees={cat.highRupees}
              trend={cat.trend}
              isHazardous={cat.isHazardous}
            />
          ))}
        </div>
      )}

      {/* VIEW 2: GEO G7.3 Nearby Areas Comparison & Travel Cost Reminder */}
      {viewMode === "NEARBY" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Material chips */}
          <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className={`btn btn-sm ${cat.id === selectedCatId ? "btn-primary" : "btn-secondary"}`}
                style={{ whiteSpace: "nowrap", borderRadius: "20px", fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
              >
                {tx({ hi: cat.nameHi, en: cat.nameEn, mr: cat.nameMr || cat.nameHi })}
              </button>
            ))}
          </div>

          {/* Weight stepper for Net Gain Calculation */}
          <div
            className="card"
            style={{
              padding: "0.85rem 1rem",
              backgroundColor: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", fontWeight: 600 }}>
                {tx({ hi: "कबाड़ का वजन", en: "Lot weight to compare", mr: "भंगाराचे वजन" })}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--slate-900)" }}>
                {weightKg} kg {tx({ hi: selectedCategory.nameHi, en: selectedCategory.nameEn, mr: selectedCategory.nameMr })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.35rem" }}>
              {[10, 20, 50].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeightKg(w)}
                  className={`btn btn-sm ${weightKg === w ? "btn-primary" : "btn-secondary"}`}
                  style={{ minWidth: "44px" }}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>

          {/* Nearby areas comparison cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {nearbyAreas.map((area) => {
              const nearbyRatePaise = area.rates[selectedCatId] || localRatePaise + 2000;
              const comparison = compareAreaPrice(
                area.areaName,
                area.distanceKm,
                localRatePaise,
                nearbyRatePaise,
                weightKg * 1000
              );

              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${area.latitude},${area.longitude}`;

              return (
                <div
                  key={area.areaName}
                  className="card"
                  style={{
                    padding: "1rem",
                    borderLeft: comparison.isRecommended ? "4px solid var(--primary, #16a34a)" : "4px solid var(--slate-300)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--slate-900)" }}>
                        {area.areaName}
                      </div>
                      <div className="c-hint" style={{ marginTop: "0.15rem" }}>
                        <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <span>{comparison.distanceKm} km {tx({ hi: "दूरी", en: "away", mr: "लांब" })}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--primary-800)" }}>
                        ₹{(comparison.nearbyRatePaise / 100).toFixed(0)}/kg
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: comparison.rateDiffRupees > 0 ? "var(--primary)" : "var(--slate-500)",
                        }}
                      >
                        {comparison.rateDiffRupees > 0 ? `+₹${comparison.rateDiffRupees}/kg ${tx({ hi: "ज़्यादा", en: "higher", mr: "जास्त" })}` : tx({ hi: "समान भाव", en: "Same rate", mr: "समान भाव" })}
                      </div>
                    </div>
                  </div>

                  {/* Travel cost & net profit assessment */}
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      backgroundColor: comparison.isRecommended ? "var(--primary-50, #f0fdf4)" : "var(--slate-50, #f8fafc)",
                      border: `1px solid ${comparison.isRecommended ? "var(--primary-200, #bbf7d0)" : "var(--slate-200, #e2e8f0)"}`,
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {comparison.isRecommended ? (
                        <CheckCircle2 size={16} style={{ color: "var(--primary)" }} />
                      ) : (
                        <Info size={16} style={{ color: "var(--slate-500)" }} />
                      )}
                      <span>
                        {comparison.isRecommended
                          ? tx({
                              hi: `किराया काटकर शुद्ध मुनाफा: ${comparison.gainRupees}`,
                              en: `Net extra earnings after travel: ${comparison.gainRupees}`,
                              mr: `प्रवास खर्च वजा करून निव्वळ नफा: ${comparison.gainRupees}`,
                            })
                          : tx({
                              hi: "सफर का खर्च ज़्यादा है — अपने इलाके में बेचना बेहतर है",
                              en: "Travel cost exceeds price difference — sell locally!",
                              mr: "प्रवासाचा खर्च जास्त आहे — स्थानिक पातळीवर विकणे चांगले",
                            })}
                      </span>
                    </div>

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <Navigation size={12} />
                      {tx({ hi: "रास्ता", en: "Map", mr: "रस्ता" })}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
