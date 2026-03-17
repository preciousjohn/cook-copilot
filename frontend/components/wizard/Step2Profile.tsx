"use client";

import React, { useState } from "react";
import { useWizardStore, makeEmptyProfile } from "../../store/wizardStore";
import { Button } from "../ui/Button";
import type {
  UserProfile,
  Allergen,
  MedicalCondition,
  DietaryPreference,
  ActivityLevel,
  WeightGoal,
  Sex,
} from "../../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Profile Selection + Clinical Intake Form
//
// Left: saved profile list (select or delete)
// Right: create/edit form with 5 sections:
//   1. Basic (name, sex, age, height, weight)
//   2. Health Metrics (activity level, weight goal)
//   3. Allergies (checkbox grid + free text)
//   4. Medical Conditions (checkbox list)
//   5. Dietary Preferences (checkbox chips)
// ─────────────────────────────────────────────────────────────────────────────

// ── Option constants ──────────────────────────────────────────────────────────

const ALLERGEN_OPTIONS: { value: Allergen; label: string }[] = [
  { value: "peanuts", label: "Peanuts" },
  { value: "tree_nuts", label: "Tree nuts" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "wheat_gluten", label: "Wheat / Gluten" },
  { value: "soy", label: "Soy" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
];

const MEDICAL_OPTIONS: { value: MedicalCondition; label: string }[] = [
  { value: "none", label: "None" },
  { value: "pregnancy", label: "Pregnancy" },
  { value: "gestational_diabetes", label: "Gestational Diabetes" },
  { value: "type1_diabetes", label: "Type 1 Diabetes" },
  { value: "type2_diabetes", label: "Type 2 Diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "cardiovascular_disease", label: "Cardiovascular Disease" },
  { value: "celiac_disease", label: "Celiac Disease" },
  { value: "ibs_ibd", label: "IBS / IBD" },
  { value: "kidney_disease", label: "Kidney Disease" },
];

const DIET_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "gluten_free", label: "Gluten Free" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
  { value: "light", label: "Light", desc: "Light exercise 1–3×/week" },
  { value: "moderate", label: "Moderate", desc: "Moderate exercise 3–5×/week" },
  { value: "active", label: "Active", desc: "Hard exercise 6–7×/week" },
  { value: "very_active", label: "Very Active", desc: "Physical job or 2× training" },
];

const WEIGHT_GOAL_OPTIONS: { value: WeightGoal; label: string }[] = [
  { value: "maintain", label: "Maintain" },
  { value: "lose", label: "Lose weight" },
  { value: "gain", label: "Gain weight" },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function validateForm(form: Omit<UserProfile, "id" | "createdAtIso">): string | null {
  if (!form.profileName.trim()) return "Profile name is required.";
  if (form.age < 1 || form.age > 120) return "Age must be between 1 and 120.";
  if (form.weightKg < 1 || form.weightKg > 500) return "Weight must be between 1 and 500 kg.";
  if (form.heightCm < 50 || form.heightCm > 300) return "Height must be between 50 and 300 cm.";
  return null;
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--fg3)",
        marginBottom: "12px",
      }}
    >
      {children}
    </div>
  );
}

// ── Checkbox chip ─────────────────────────────────────────────────────────────

function CheckChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        padding: "5px 12px",
        borderRadius: "20px",
        fontSize: "13px",
        border: `1px solid ${checked ? "var(--fg)" : "var(--border)"}`,
        background: checked ? "var(--fg)" : "transparent",
        color: checked ? "var(--bg)" : "var(--fg2)",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  half,
}: {
  label: string;
  children: React.ReactNode;
  half?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: half ? "1 1 45%" : "1 1 100%" }}>
      <label style={{ fontSize: "12px", color: "var(--fg3)", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

// ── Profile card (left panel) ─────────────────────────────────────────────────

function ProfileCard({
  profile,
  selected,
  onSelect,
  onDelete,
}: {
  profile: UserProfile;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        border: `1px solid ${selected ? "var(--fg)" : "var(--border)"}`,
        background: selected ? "var(--fg)" : "var(--bg)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        transition: "all 0.15s",
      }}
      onClick={onSelect}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: selected ? "var(--bg)" : "var(--fg)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {profile.profileName}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: selected ? "rgba(255,255,255,0.6)" : "var(--fg3)",
            marginTop: "2px",
          }}
        >
          {profile.age}y · {profile.weightKg}kg · {profile.heightCm}cm
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: selected ? "rgba(255,255,255,0.5)" : "var(--fg3)",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
        title="Delete profile"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step2Profile() {
  const {
    profiles,
    selectedProfileId,
    addProfile,
    deleteProfile,
    selectProfile,
    goToStep,
  } = useWizardStore();

  const [form, setForm] = useState<Omit<UserProfile, "id" | "createdAtIso">>(makeEmptyProfile());
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(profiles.length === 0);

  // Update a single field
  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  }

  function handleSave() {
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      return;
    }
    const profile = addProfile(form);
    selectProfile(profile.id);
    setForm(makeEmptyProfile());
    setShowForm(false);
  }

  function handleUseProfile() {
    if (!selectedProfileId) return;
    goToStep(3);
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        gap: "0",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Left: profile list ─────────────────────────────────────────────── */}
      <div
        style={{
          width: "240px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "32px 32px 32px 24px",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg2)", marginBottom: "4px" }}>
          Profiles
        </div>

        {profiles.length === 0 && (
          <div style={{ fontSize: "13px", color: "var(--fg3)" }}>No profiles yet.</div>
        )}

        {profiles.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            selected={selectedProfileId === p.id}
            onSelect={() => {
              selectProfile(p.id);
              setShowForm(false);
            }}
            onDelete={() => deleteProfile(p.id)}
          />
        ))}

        <button
          type="button"
          onClick={() => {
            setForm(makeEmptyProfile());
            setShowForm(true);
            selectProfile(null);
          }}
          style={{
            marginTop: "4px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px dashed var(--border)",
            background: "none",
            color: "var(--fg3)",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New profile
        </button>

      </div>

      {/* ── Right: form ────────────────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            flex: 1,
            padding: "32px 24px 32px 40px",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            overflowY: "auto",
          }}
        >
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>New profile</h2>
            <p style={{ fontSize: "14px", color: "var(--fg3)", margin: 0 }}>
              This information helps the AI dietitian calculate personalized nutrition targets.
            </p>
          </div>

          {/* ── Section 1: Basic ──────────────────────────────────────────── */}
          <section>
            <SectionLabel>Basic Information</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Field label="Profile name" half>
                <input
                  style={inputStyle}
                  placeholder="e.g. Alice"
                  value={form.profileName}
                  onChange={(e) => setField("profileName", e.target.value)}
                />
              </Field>
              <Field label="Sex" half>
                <select
                  style={selectStyle}
                  value={form.sex}
                  onChange={(e) => setField("sex", e.target.value as Sex)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Prefer not to say</option>
                </select>
              </Field>
              <Field label="Age (years)" half>
                <input
                  type="number"
                  style={inputStyle}
                  min={1}
                  max={120}
                  value={form.age || ""}
                  onChange={(e) => setField("age", Number(e.target.value))}
                />
              </Field>
              <Field label="Height (cm)" half>
                <input
                  type="number"
                  style={inputStyle}
                  min={50}
                  max={300}
                  value={form.heightCm || ""}
                  onChange={(e) => setField("heightCm", Number(e.target.value))}
                />
              </Field>
              <Field label="Weight (kg)" half>
                <input
                  type="number"
                  style={inputStyle}
                  min={1}
                  max={500}
                  value={form.weightKg || ""}
                  onChange={(e) => setField("weightKg", Number(e.target.value))}
                />
              </Field>
            </div>
          </section>

          {/* ── Section 2: Health Metrics ─────────────────────────────────── */}
          <section>
            <SectionLabel>Health Metrics</SectionLabel>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--fg2)", marginBottom: "8px" }}>
                Activity level
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("activityLevel", opt.value)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: `1px solid ${form.activityLevel === opt.value ? "var(--fg)" : "var(--border)"}`,
                      background: form.activityLevel === opt.value ? "var(--fg)" : "transparent",
                      color: form.activityLevel === opt.value ? "var(--bg)" : "var(--fg2)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{opt.label}</div>
                    <div
                      style={{
                        fontSize: "11px",
                        opacity: 0.7,
                        marginTop: "2px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "13px", color: "var(--fg2)", marginBottom: "8px" }}>
                Weight goal
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {WEIGHT_GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("weightGoal", opt.value)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: `1px solid ${form.weightGoal === opt.value ? "var(--fg)" : "var(--border)"}`,
                      background: form.weightGoal === opt.value ? "var(--fg)" : "transparent",
                      color: form.weightGoal === opt.value ? "var(--bg)" : "var(--fg2)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 3: Allergies ──────────────────────────────────────── */}
          <section>
            <SectionLabel>Allergies & Intolerances</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              {ALLERGEN_OPTIONS.map((opt) => (
                <CheckChip
                  key={opt.value}
                  label={opt.label}
                  checked={form.allergies.includes(opt.value)}
                  onChange={() => setField("allergies", toggleArrayItem(form.allergies, opt.value))}
                />
              ))}
            </div>
            <input
              style={{ ...inputStyle, maxWidth: "360px" }}
              placeholder="Other allergies (free text)"
              value={form.allergyOther}
              onChange={(e) => setField("allergyOther", e.target.value)}
            />
          </section>

          {/* ── Section 4: Medical Conditions ─────────────────────────────── */}
          <section>
            <SectionLabel>Medical Conditions</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {MEDICAL_OPTIONS.map((opt) => (
                <CheckChip
                  key={opt.value}
                  label={opt.label}
                  checked={form.medicalConditions.includes(opt.value)}
                  onChange={() => {
                    if (opt.value === "none") {
                      setField("medicalConditions", ["none"]);
                    } else {
                      const next = toggleArrayItem(
                        form.medicalConditions.filter((x) => x !== "none"),
                        opt.value
                      );
                      setField("medicalConditions", next);
                    }
                  }}
                />
              ))}
            </div>
          </section>

          {/* ── Section 5: Dietary Preferences ────────────────────────────── */}
          <section>
            <SectionLabel>Dietary Preferences</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {DIET_OPTIONS.map((opt) => (
                <CheckChip
                  key={opt.value}
                  label={opt.label}
                  checked={form.dietaryPreferences.includes(opt.value)}
                  onChange={() =>
                    setField("dietaryPreferences", toggleArrayItem(form.dietaryPreferences, opt.value))
                  }
                />
              ))}
            </div>
          </section>

          {/* ── Notes ─────────────────────────────────────────────────────── */}
          <section>
            <SectionLabel>Additional Notes</SectionLabel>
            <textarea
              style={{
                ...inputStyle,
                height: "80px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              placeholder="Any other information for the AI dietitian..."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </section>

          {/* ── Save button ───────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "32px" }}>
            <Button variant="primary" size="md" onClick={handleSave}>
              Save profile
            </Button>
            {profiles.length > 0 && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
            )}
            {formError && (
              <span style={{ fontSize: "13px", color: "#c0392b" }}>{formError}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Right: selected profile summary (no form) ──────────────────────── */}
      {!showForm && selectedProfileId && (
        <SelectedProfileSummary
          profile={profiles.find((p) => p.id === selectedProfileId)!}
          onUseProfile={handleUseProfile}
          onEdit={() => {
            const p = profiles.find((x) => x.id === selectedProfileId)!;
            setForm({
              profileName: p.profileName,
              sex: p.sex,
              weightKg: p.weightKg,
              heightCm: p.heightCm,
              age: p.age,
              activityLevel: p.activityLevel,
              weightGoal: p.weightGoal,
              allergies: p.allergies,
              allergyOther: p.allergyOther,
              medicalConditions: p.medicalConditions,
              dietaryPreferences: p.dietaryPreferences,
              notes: p.notes,
            });
            setShowForm(true);
          }}
        />
      )}

      {/* ── Right: empty state ─────────────────────────────────────────────── */}
      {!showForm && !selectedProfileId && (
        <div
          style={{
            flex: 1,
            paddingLeft: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg3)",
            fontSize: "14px",
          }}
        >
          Select a profile or create a new one.
        </div>
      )}
    </div>
  );
}

// ── Selected profile summary ──────────────────────────────────────────────────

function SelectedProfileSummary({
  profile,
  onEdit,
  onUseProfile,
}: {
  profile: UserProfile;
  onEdit: () => void;
  onUseProfile: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "32px 24px 32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>{profile.profileName}</h2>
          <p style={{ fontSize: "14px", color: "var(--fg3)", margin: 0 }}>
            {profile.age}y · {profile.sex} · {profile.weightKg}kg · {profile.heightCm}cm
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "12px",
            color: "var(--fg2)",
            cursor: "pointer",
          }}
        >
          Edit
        </button>
      </div>

      {/* Summary grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <SummaryRow label="Activity" value={profile.activityLevel.replace("_", " ")} />
        <SummaryRow label="Goal" value={profile.weightGoal} />
        {profile.allergies.length > 0 && (
          <SummaryRow
            label="Allergies"
            value={profile.allergies.map((a) => a.replace(/_/g, " ")).join(", ")}
          />
        )}
        {profile.allergyOther && (
          <SummaryRow label="Other allergies" value={profile.allergyOther} />
        )}
        {profile.medicalConditions.length > 0 && profile.medicalConditions[0] !== "none" && (
          <SummaryRow
            label="Conditions"
            value={profile.medicalConditions.map((c) => c.replace(/_/g, " ")).join(", ")}
          />
        )}
        {profile.dietaryPreferences.length > 0 && (
          <SummaryRow
            label="Diet"
            value={profile.dietaryPreferences.map((d) => d.replace(/_/g, " ")).join(", ")}
          />
        )}
        {profile.notes && <SummaryRow label="Notes" value={profile.notes} />}
      </div>

      <div style={{ marginTop: "8px" }}>
        <p style={{ fontSize: "14px", color: "var(--fg3)", margin: "0 0 16px" }}>
          Ready to print food for {profile.profileName}?
        </p>
        <Button
          variant="primary"
          size="lg"
          style={{ minWidth: "220px", fontSize: "16px", padding: "14px 28px" }}
          onClick={onUseProfile}
        >
          Use this profile →
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg3)", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", color: "var(--fg)", textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}
