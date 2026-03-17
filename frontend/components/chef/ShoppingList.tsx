"use client";

import React from "react";

export function ShoppingList({
  items,
  tools,
}: {
  items: string[];
  tools: string[];
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--fg3)",
              marginBottom: "8px",
            }}
          >
            Shopping list
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {items.map((item, i) => (
              <li key={i} style={{ fontSize: "13px", color: "var(--fg2)", lineHeight: "1.8" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--fg3)",
              marginBottom: "8px",
            }}
          >
            Cooking tools
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tools.map((tool, i) => (
              <li key={i} style={{ fontSize: "13px", color: "var(--fg2)", lineHeight: "1.8" }}>
                {tool}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
