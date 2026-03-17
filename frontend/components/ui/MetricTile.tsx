"use client";

import React from "react";

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
  style?: React.CSSProperties;
  labelColor?: string;
}

export function MetricTile({ label, value, unit, accent, style, labelColor }: MetricTileProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "16px 20px",
        background: accent ? "var(--fg)" : "var(--bg2)",
        borderRadius: "10px",
        minWidth: "120px",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: labelColor ?? (accent ? "var(--bg)" : "var(--fg3)"),
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: accent ? "var(--bg)" : "var(--fg)",
          lineHeight: 1.1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "13px", fontWeight: 400, marginLeft: "3px" }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}
