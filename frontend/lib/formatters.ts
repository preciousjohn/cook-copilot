// ─────────────────────────────────────────────────────────────────────────────
// Formatting utility functions
// ─────────────────────────────────────────────────────────────────────────────

import type { UserProfile } from "./types";

/** Generate a unique ID from timestamp + random hex */
export function uid(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Clamp a number between lo and hi, defaulting to lo if NaN */
export function clamp(v: number, lo: number, hi: number): number {
  return Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v));
}

/** Format seconds into a human-readable duration string */
export function formatPrintTime(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  if (m < 60) return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** One-line profile summary for display */
export function formatProfileSummary(p: UserProfile): string {
  const parts = [`${p.sex}`, `${p.age}y`, `${p.heightCm}cm`, `${p.weightKg}kg`, p.activityLevel];
  return `${p.profileName} — ${parts.join(", ")}`;
}

/**
 * Build the profile payload sent to the Dietitian API.
 * Field names must match the backend UserProfileCreate schema (camelCase).
 */
export function formatProfileForAPI(p: UserProfile): Record<string, unknown> {
  return {
    profileName: p.profileName,
    sex: p.sex,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activityLevel: p.activityLevel,
    weightGoal: p.weightGoal,
    allergies: p.allergies,
    allergyOther: p.allergyOther || "",
    medicalConditions: p.medicalConditions,
    dietaryPreferences: p.dietaryPreferences,
    notes: p.notes || "",
  };
}

/** Format a number to at most 1 decimal place, removing trailing zeros */
export function formatNum(n: number, decimals = 1): string {
  return parseFloat(n.toFixed(decimals)).toString();
}

/** Capitalize the first letter of a string */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert snake_case or kebab-case to Title Case */
export function toTitleCase(s: string): string {
  return s
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
