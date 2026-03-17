"use client";

import React from "react";
import type { SyringeRecipe } from "../../lib/types";

export function SyringeRecipeCard({ recipe }: { recipe: SyringeRecipe }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <span
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "var(--bg2)",
              color: "var(--fg2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {recipe.syringe_id}
          </span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>{recipe.title}</div>
            <div style={{ fontSize: "11px", color: "var(--fg3)" }}>{recipe.label}</div>
          </div>
        </div>

        {/* Ingredients */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--fg3)",
              marginBottom: "6px",
            }}
          >
            Ingredients
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ fontSize: "13px", color: "var(--fg2)", lineHeight: "1.7" }}>
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        {recipe.instructions.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--fg3)",
                marginBottom: "6px",
              }}
            >
              Preparation
            </div>
            <ol style={{ margin: 0, padding: "0 0 0 16px" }}>
              {recipe.instructions.map((step, i) => (
                <li key={i} style={{ fontSize: "13px", color: "var(--fg2)", lineHeight: "1.7" }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}


      </div>
    </div>
  );
}
