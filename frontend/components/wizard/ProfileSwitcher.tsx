"use client";

import React, { useRef, useEffect, useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import type { UserProfile, Sex, ActivityLevel, Allergen, MedicalCondition } from "../../lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Other / prefer not to say", value: "other" },
];

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel }[] = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light (1–3×/week)", value: "light" },
  { label: "Moderate (3–5×/week)", value: "moderate" },
  { label: "Active (6–7×/week)", value: "active" },
  { label: "Very Active (daily + training)", value: "very_active" },
];

const ALLERGEN_LABELS: Record<Allergen, string> = {
  peanuts: "Peanuts", tree_nuts: "Tree nuts", dairy: "Dairy", eggs: "Eggs",
  wheat_gluten: "Wheat/Gluten", soy: "Soy", fish: "Fish", shellfish: "Shellfish", sesame: "Sesame",
};

const CONDITION_LABELS: Record<MedicalCondition, string> = {
  none: "None", pregnancy: "Pregnancy", gestational_diabetes: "Gestational Diabetes",
  type1_diabetes: "Type 1 Diabetes", type2_diabetes: "Type 2 Diabetes",
  hypertension: "Hypertension", cardiovascular_disease: "Cardiovascular Disease",
  celiac_disease: "Celiac Disease", ibs_ibd: "IBS / IBD", kidney_disease: "Kidney Disease",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

export function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (data: Partial<UserProfile>) => void;
}) {
  const [name, setName] = useState(profile.profileName);
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [age, setAge] = useState(String(profile.age || ""));
  const [height, setHeight] = useState(String(profile.heightCm || ""));
  const [weight, setWeight] = useState(String(profile.weightKg || ""));
  const [activity, setActivity] = useState<ActivityLevel>(profile.activityLevel);
  const [allergies, setAllergies] = useState<Allergen[]>(profile.allergies);
  const [conditions, setConditions] = useState<MedicalCondition[]>(profile.medicalConditions);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleAllergen = (a: Allergen) =>
    setAllergies((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const toggleCondition = (c: MedicalCondition) => {
    if (c === "none") { setConditions(["none"]); return; }
    setConditions((prev) => {
      const without = prev.filter((x) => x !== "none");
      return without.includes(c) ? without.filter((x) => x !== c) : [...without, c];
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8, width: "100%",
    border: "1.5px solid #1A141030", background: "transparent",
    color: "#1A1410", fontFamily: "'Geist', sans-serif", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
      border: `1.5px solid ${active ? "rgb(21,60,54)" : "#1A141030"}`,
      background: active ? "rgb(21,60,54)" : "transparent",
      color: active ? "#FFF4E6" : "#1A1410",
      cursor: "pointer", fontFamily: "'Geist', sans-serif",
      transition: "background .1s, color .1s, border-color .1s",
    }}>{children}</button>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,20,16,.4)", backdropFilter: "blur(4px)", padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(540px, 100%)", background: "#FFFFFF",
          border: "1.5px solid #1A141020", borderRadius: 20,
          padding: "26px 28px 22px", color: "#1A1410",
          maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          fontFamily: "'Geist', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: "#1A1410" }}>Edit profile</h2>
          <button onClick={onClose} style={{ fontSize: 20, color: "#6B5D50", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5D50", display: "block", marginBottom: 6 }}>Name</label>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5D50", display: "block", marginBottom: 8 }}>Sex</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SEX_OPTIONS.map((o) => <Chip key={o.value} active={sex === o.value} onClick={() => setSex(o.value)}>{o.label}</Chip>)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Age (yrs)", val: age, set: setAge },
              { label: "Height (cm)", val: height, set: setHeight },
              { label: "Weight (kg)", val: weight, set: setWeight },
            ].map(({ label, val, set }) => (
              <div key={label} style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5D50", display: "block", marginBottom: 6 }}>{label}</label>
                <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} placeholder="—" style={inputStyle} />
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5D50", display: "block", marginBottom: 8 }}>Activity level</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ACTIVITY_OPTIONS.map((o) => <Chip key={o.value} active={activity === o.value} onClick={() => setActivity(o.value)}>{o.label}</Chip>)}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5D50", display: "block", marginBottom: 8 }}>Allergies</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(Object.entries(ALLERGEN_LABELS) as [Allergen, string][]).map(([k, v]) => (
                <Chip key={k} active={allergies.includes(k)} onClick={() => toggleAllergen(k)}>{v}</Chip>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5D50", display: "block", marginBottom: 8 }}>Medical conditions</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(Object.entries(CONDITION_LABELS) as [MedicalCondition, string][]).map(([k, v]) => (
                <Chip key={k} active={conditions.includes(k)} onClick={() => toggleCondition(k)}>{v}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: "10px 16px", borderRadius: 10, background: "transparent", color: "#6B5D50", fontSize: 14, border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}>Cancel</button>
          <button
            onClick={() => onSave({ profileName: name.trim() || profile.profileName, sex, age: Number(age), heightCm: Number(height), weightKg: Number(weight), activityLevel: activity, allergies, medicalConditions: conditions })}
            style={{ padding: "10px 20px", borderRadius: 10, background: "rgb(21,60,54)", color: "#FFF4E6", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Switcher ─────────────────────────────────────────────────────────

export function ProfileSwitcher() {
  const { profiles, selectedProfileId, selectProfile, updateProfile } = useWizardStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const current = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!profiles.length || !current) return null;

  return (
    <>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "5px 10px 5px 8px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            color: "var(--header-fg)",
            fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 500,
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"}
        >
          {/* Avatar */}
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
            color: "var(--header-fg)",
          }}>
            {current.profileName.charAt(0).toUpperCase()}
          </span>
          <span>{current.profileName}</span>
          <span style={{ opacity: 0.6, display: "flex", alignItems: "center", transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}>
            <ChevronDown />
          </span>
        </button>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            background: "#FFFFFF", border: "1px solid #1A141015",
            borderRadius: 14, minWidth: 220, zIndex: 200,
            boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "6px 6px" }}>
              {profiles.map((p) => {
                const isActive = p.id === selectedProfileId;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex", alignItems: "center",
                      borderRadius: 8,
                      background: isActive ? "rgba(21,60,54,0.07)" : "transparent",
                    }}
                  >
                    <button
                      onClick={() => { selectProfile(p.id); setOpen(false); }}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 8px", background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "'Geist', sans-serif",
                      }}
                    >
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: isActive ? "rgb(21,60,54)" : "#F0EDE8",
                        color: isActive ? "#FFF4E6" : "#6B5D50",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {p.profileName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: "#1A1410", lineHeight: 1.2 }}>
                          {p.profileName}
                        </div>
                        {isActive && (
                          <div style={{ fontSize: 10, color: "rgb(21,60,54)", fontFamily: "'Geist Mono', monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>
                            Active
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setOpen(false); setEditing(p); }}
                      title="Edit profile"
                      style={{
                        width: 30, height: 30, borderRadius: 7, border: "none",
                        background: "transparent", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#6B5D50", marginRight: 4, flexShrink: 0,
                        transition: "background .12s, color .12s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F0EDE8"; (e.currentTarget as HTMLElement).style.color = "#1A1410"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B5D50"; }}
                    >
                      <EditIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditProfileModal
          profile={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => { updateProfile(editing.id, data); setEditing(null); }}
        />
      )}
    </>
  );
}
