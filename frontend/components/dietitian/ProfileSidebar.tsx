"use client";

import React from "react";
import type { UserProfile } from "../../lib/types";

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very Active",
};

const GOAL_LABELS: Record<string, string> = {
  maintain: "Maintain",
  lose: "Lose weight",
  gain: "Gain weight",
};

export function ProfileSidebar({ profile, onEdit }: { profile: UserProfile; onEdit?: () => void }) {
  const sections: { label: string; value: string }[] = [
    { label: "Sex", value: profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) },
    { label: "Age", value: `${profile.age} yrs` },
    { label: "Height", value: `${profile.heightCm} cm` },
    { label: "Weight", value: `${profile.weightKg} kg` },
    { label: "Activity", value: ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel },
    { label: "Goal", value: GOAL_LABELS[profile.weightGoal] ?? profile.weightGoal },
  ];

  const hasMedical = profile.medicalConditions.length > 0 && !profile.medicalConditions.every((c) => c === "none");
  const hasDiet = profile.dietaryPreferences.length > 0;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "20px 16px",
        minWidth: "240px",
        maxWidth: "260px",
        width: "260px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0",
      }}
    >
      {/* Name row with edit icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--fg)", wordBreak: "break-word" }}>
          {profile.profileName}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            title="Edit profile"
            style={{
              width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(26,20,16,0.1)",
              background: "transparent", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6B5D50", transition: "background .12s, color .12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(26,20,16,0.06)"; (e.currentTarget as HTMLElement).style.color = "#1A1410"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B5D50"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Basic info rows */}
      {sections.map((s) => (
        <div
          key={s.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "5px 0",
            borderBottom: "1px solid var(--border-light, rgba(0,0,0,0.06))",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {s.label}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--fg)" }}>{s.value}</span>
        </div>
      ))}

      {/* Medical conditions */}
      {hasMedical && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
            Medical
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {profile.medicalConditions
              .filter((c) => c !== "none")
              .map((c) => (
                <span
                  key={c}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    background: "var(--bg2)",
                    color: "var(--fg2)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  {c.replace(/_/g, " ")}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Dietary preferences */}
      {hasDiet && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
            Diet
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {profile.dietaryPreferences.map((d) => (
              <span
                key={d}
                style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  background: "var(--bg2)",
                  color: "var(--fg2)",
                  border: "1px solid var(--card-border)",
                }}
              >
                {d.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {profile.notes && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
            Notes
          </div>
          <div style={{ fontSize: "12px", color: "var(--fg2)", lineHeight: 1.4 }}>{profile.notes}</div>
        </div>
      )}
    </div>
  );
}
