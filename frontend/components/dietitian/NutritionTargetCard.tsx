"use client";

import React from "react";
import { MacroPieChart } from "./MacroPieChart";
import type { DietitianResponse, NutritionTargets } from "../../lib/types";

export function NutritionTargetCard({
  data,
  mealType,
}: {
  data: DietitianResponse;
  mealType: string;
}) {
  const nt: NutritionTargets = data.nutrition_targets;
  const { macro_percent } = nt.composition;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg2)" }}>Nutrition Targets</div>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            background: mealType === "snack" ? "#e8f4fd" : "#f0fdf4",
            color: mealType === "snack" ? "#1a6fa8" : "#166534",
          }}
        >
          {mealType}
        </span>
      </div>

      {/* Kcal range + Macro pie side by side */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        {/* Left: Calories */}
        <div>
          <div style={{ fontSize: "11px", color: "var(--fg3)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Calories
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            {nt.kcal.min}–{nt.kcal.max}
            <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--fg3)", marginLeft: "4px" }}>kcal</span>
          </div>
        </div>

        {/* Right: Macro pie */}
        <MacroPieChart
          carbs={macro_percent.carbs}
          protein={macro_percent.protein}
          fat={macro_percent.fat}
        />
      </div>

    </div>
  );
}
