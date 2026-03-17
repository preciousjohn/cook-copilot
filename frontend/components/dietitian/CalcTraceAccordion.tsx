"use client";

import React from "react";
import type { DietitianResponse } from "../../lib/types";

export function CalcTraceAccordion({ data }: { data: DietitianResponse }) {
  const traceCount = (data.calculation_trace?.length ?? 0) + (data.assumptions?.length ?? 0);

  return (
    <details style={{ marginTop: "4px" }}>
      <summary
        style={{
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--fg3)",
          userSelect: "none",
          marginBottom: "8px",
        }}
      >
        Calculation Trace ({traceCount})
      </summary>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Daily reference */}
        {data.daily_reference && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              fontSize: "12px",
              color: "var(--fg2)",
              lineHeight: "1.6",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--fg3)", marginBottom: "6px", fontSize: "11px" }}>
              BMR → TDEE → Targets
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[
                { label: "BMR", value: Math.round(data.daily_reference.bmr), unit: "kcal/day" },
                { label: "TDEE", value: Math.round(data.daily_reference.tdee), unit: "kcal/day" },
                { label: "Meal target", value: Math.round(data.daily_reference.daily_target * data.daily_reference.meal_fraction), unit: "kcal" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: "1 1 80px",
                    padding: "8px 12px",
                    background: "var(--bg2)",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--fg)" }}>{item.value}</div>
                  <div style={{ fontSize: "10px", color: "var(--fg3)" }}>{item.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        {data.calculation_trace?.map((step, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              fontSize: "12px",
              color: "var(--fg2)",
              lineHeight: "1.6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: "var(--fg2)" }}>{step.step}:</span>{" "}
              <span style={{ color: "var(--fg3)" }}>{step.formula || step.note}</span>
            </div>
            {step.value !== undefined && (
              <span style={{ fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap" }}>{step.value}</span>
            )}
          </div>
        ))}

        {/* Assumptions */}
        {data.assumptions?.length > 0 && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              fontSize: "12px",
              color: "var(--fg2)",
              lineHeight: "1.6",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--fg3)", marginBottom: "4px", fontSize: "11px" }}>
              Assumptions
            </div>
            {data.assumptions.map((a, i) => (
              <div key={i} style={{ color: "var(--fg3)", paddingLeft: "8px" }}>
                · {a}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
