"use client";

import type { DailyReference } from "../../lib/types";

export function DailyNutritionCard({
  daily,
  mealFractionLabel,
}: {
  daily: DailyReference;
  mealFractionLabel?: string;
}) {
  const dailyTarget = Math.round(daily.daily_target);
  const mealRatio = Math.max(0, Math.min(1, daily.meal_fraction));
  const mealPercent = Math.round(mealRatio * 100);

  const radius = 96;
  const cx = 114;
  const cy = 110;
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const svgTop = 36;
  const endTheta = Math.PI * (1 - mealRatio);
  const arcEndX = cx + radius * Math.cos(endTheta);
  const arcEndY = cy - radius * Math.sin(endTheta);
  const calloutWidth = 130;
  const calloutLeft = Math.max(0, Math.min(228 - calloutWidth, arcEndX - calloutWidth / 2));
  const calloutBottomY = 32;
  const connectorTop = calloutBottomY;
  const connectorHeight = Math.max(0, svgTop + arcEndY - connectorTop);

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg2)", marginBottom: "14px" }}>
        Daily Nutrition Target
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 0",
          }}
        >
          <div style={{ position: "relative", width: "228px", height: "172px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${calloutLeft}px`,
                padding: "4px 10px",
                borderRadius: "8px",
                border: "1px solid var(--card-border)",
                background: "var(--bg2)",
                fontSize: "13px",
                color: "var(--fg2)",
                whiteSpace: "nowrap",
                width: `${calloutWidth}px`,
                textAlign: "center",
              }}
            >
              {(mealFractionLabel ?? "Meal Target") + `: ${mealPercent}%`}
            </div>
            <div
              style={{
                position: "absolute",
                top: `${connectorTop}px`,
                left: `${arcEndX}px`,
                width: 0,
                height: `${connectorHeight}px`,
                borderLeft: "1px dashed var(--fg3)",
              }}
            />
            <svg
              width="228"
              height="136"
              viewBox="0 0 228 136"
              role="img"
              aria-label="Daily target arc"
              style={{ position: "absolute", left: 0, top: `${svgTop}px` }}
            >
              <path
                d={arcPath}
                fill="none"
                stroke="var(--border-light, rgba(0,0,0,0.18))"
                strokeWidth="14"
                strokeLinecap="round"
                pathLength={100}
              />
              <path
                d={arcPath}
                fill="none"
                stroke="#D15200"
                strokeWidth="14"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${mealRatio * 100} 100`}
              />
              <text x="114" y="68" textAnchor="middle" style={{ fill: "var(--fg3)", fontSize: "10px", letterSpacing: "0.06em" }}>
                DAILY TARGET
              </text>
              <text x="114" y="100" textAnchor="middle" style={{ fill: "var(--fg)", fontSize: "30px", fontWeight: 700 }}>
                {dailyTarget}
              </text>
              <text x="114" y="118" textAnchor="middle" style={{ fill: "var(--fg3)", fontSize: "13px" }}>
                kcal/day
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
