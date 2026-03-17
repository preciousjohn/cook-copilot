"use client";

import React from "react";

export function MacroPieChart({
  carbs,
  protein,
  fat,
}: {
  carbs: number;
  protein: number;
  fat: number;
}) {
  const total = carbs + protein + fat || 1;
  const carbDeg = (carbs / total) * 360;
  const proteinDeg = (protein / total) * 360;

  const conicGradient = `conic-gradient(
    #29787C 0deg ${carbDeg}deg,
    #FFB341 ${carbDeg}deg ${carbDeg + proteinDeg}deg,
    #D15200 ${carbDeg + proteinDeg}deg 360deg
  )`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      {/* Donut */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: conicGradient,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "16px",
            borderRadius: "50%",
            background: "var(--card-bg)",
          }}
        />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {[
          { color: "#29787C", label: "Carbs", pct: Math.round(carbs) },
          { color: "#FFB341", label: "Protein", pct: Math.round(protein) },
          { color: "#D15200", label: "Fat", pct: Math.round(fat) },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "12px", color: "var(--fg2)" }}>{item.label}</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)", marginLeft: "auto" }}>
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
