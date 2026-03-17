"use client";

import React from "react";
import type { NutritionFacts } from "../../lib/types";

// ── US FDA %DV reference amounts (2000 kcal diet) ──────────────────────────
const DV = {
  total_fat_g: 78,
  saturated_fat_g: 20,
  cholesterol_mg: 300,
  sodium_mg: 2300,
  total_carbs_g: 275,
  dietary_fiber_g: 28,
};

function pct(value: number, dv: number): string {
  return `${Math.round((value / dv) * 100)}%`;
}

function fmt(value: number, decimals = 1): string {
  return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

// ── Shared row components ──────────────────────────────────────────────────

function Divider({ thick = false }: { thick?: boolean }) {
  return (
    <div
      style={{
        borderTop: thick ? "4px solid var(--card-border)" : "0.5px solid var(--card-border)",
        margin: 0,
      }}
    />
  );
}

interface RowProps {
  label: React.ReactNode;
  value: string;
  dvPct?: string;
  indent?: boolean;
  bold?: boolean;
}

function NutrientRow({ label, value, dvPct, indent = false, bold = false }: RowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderTop: "1px solid var(--card-border)",
        padding: "1px 0",
        paddingLeft: indent ? "16px" : "0",
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: bold ? 600 : 400, color: "var(--fg2)" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", textAlign: "right", color: "var(--fg2)" }}>
        {dvPct ? (
          <>
            <span style={{ fontWeight: bold ? 600 : 400 }}>{value}</span>
            {"  "}
            <span style={{ fontWeight: 700 }}>{dvPct}</span>
          </>
        ) : (
          <span style={{ fontWeight: bold ? 600 : 400 }}>{value}</span>
        )}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function NutritionFactsTable({ facts }: { facts: NutritionFacts }) {
  return (
    <div
      style={{
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "16px 18px",
        width: "280px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--card-bg)",
        color: "var(--fg1)",
        boxSizing: "border-box",
      }}
    >
      {/* Title */}
      <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1, marginBottom: "4px" }}>
        Nutrition Facts
      </div>

      {/* Serving size */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          marginBottom: "2px",
        }}
      >
        <span>Serving size</span>
        <span style={{ fontWeight: 700 }}>{fmt(facts.serving_size_g, 0)}g</span>
      </div>

      <Divider thick />

      {/* Calories */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          padding: "2px 0",
        }}
      >
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>Calories</div>
        </div>
        <div style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1 }}>
          {Math.round(facts.calories)}
        </div>
      </div>

      <Divider thick />

      {/* %DV header */}
      <div style={{ textAlign: "right", fontSize: "11px", fontWeight: 700, padding: "1px 0" }}>
        % Daily Value*
      </div>

      {/* Nutrients */}
      <NutrientRow
        bold
        label={<><b>Total Fat</b> {fmt(facts.total_fat_g)}g</>}
        value=""
        dvPct={pct(facts.total_fat_g, DV.total_fat_g)}
      />
      <NutrientRow
        indent
        label={<>Saturated Fat {fmt(facts.saturated_fat_g)}g</>}
        value=""
        dvPct={pct(facts.saturated_fat_g, DV.saturated_fat_g)}
      />
      <NutrientRow
        indent
        label={<><i>Trans</i> Fat {fmt(facts.trans_fat_g)}g</>}
        value=""
      />
      <NutrientRow
        bold
        label={<><b>Cholesterol</b> {fmt(facts.cholesterol_mg, 0)}mg</>}
        value=""
        dvPct={pct(facts.cholesterol_mg, DV.cholesterol_mg)}
      />
      <NutrientRow
        bold
        label={<><b>Sodium</b> {fmt(facts.sodium_mg, 0)}mg</>}
        value=""
        dvPct={pct(facts.sodium_mg, DV.sodium_mg)}
      />
      <NutrientRow
        bold
        label={<><b>Total Carbohydrate</b> {fmt(facts.total_carbs_g)}g</>}
        value=""
        dvPct={pct(facts.total_carbs_g, DV.total_carbs_g)}
      />
      <NutrientRow
        indent
        label={<>Dietary Fiber {fmt(facts.dietary_fiber_g)}g</>}
        value=""
        dvPct={pct(facts.dietary_fiber_g, DV.dietary_fiber_g)}
      />
      <NutrientRow
        indent
        label={<>Total Sugars {fmt(facts.total_sugars_g)}g</>}
        value=""
      />
      <NutrientRow
        bold
        label={<><b>Protein</b> {fmt(facts.protein_g)}g</>}
        value=""
      />

      <Divider thick />

      {/* Footnote */}
      <div style={{ fontSize: "10px", lineHeight: 1.4, marginTop: "12px" }}>
        * The % Daily Value tells you how much a nutrient in a serving
        contributes to a daily diet. 2,000 calories a day is used for general
        nutrition advice.
      </div>
    </div>
  );
}
