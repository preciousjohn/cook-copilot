"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "../store/wizardStore";
import type { Sex, ActivityLevel, Allergen, MedicalCondition, DietaryPreference } from "../lib/types";
import { uid } from "../lib/formatters";

// ─── Types ────────────────────────────────────────────────────────────────────

type NoodleKind = "swirl" | "wave" | "knot";

interface Profile {
  id: string;
  name: string;
  tag: string;
  kind: NoodleKind;
  meta?: ProfileMeta;
}

interface ProfileMeta {
  name: string;
  diet: string;
  sex: string;
  age: string;
  height: string;
  weight: string;
  activity: string;
  allergies: string[];
  medicalConditions: string[];
}

interface FormErrors {
  name?: string;
  sex?: string;
  age?: string;
  height?: string;
  weight?: string;
  medicalConditions?: string;
}

interface Theme {
  ink: string;
  muted: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentInk: string;
  profileColors: string[];
  noodleColors: string[];
  tagBg: string;
  tagInk: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME: Theme = {
  ink: "#1A1410",
  muted: "#6B5D50",
  card: "#FFFFFF",
  cardBorder: "#1A1410",
  accent: "#FF5A3C",
  accentInk: "#FFF4E6",
  profileColors: ["#FFC83D", "#3DB96B", "#7B5BE8"],
  noodleColors: ["#FF5A3C", "#1A1410", "#FFC83D"],
  tagBg: "#1A1410",
  tagInk: "#FFF4E6",
};

const MEAL_WORDS = ["a meal.", "breakfast.", "dinner.", "a snack.", "lunch.", "dessert."];
const NOODLE_KINDS: NoodleKind[] = ["swirl", "wave", "knot"];

const DIETS = ["Omnivore", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Halal", "Kosher"];
const SEXES = ["Female", "Male", "Non-binary", "Prefer not to say"];
const ACTIVITIES = [
  { v: "Sedentary", d: "Desk job" },
  { v: "Light", d: "1–3×/week" },
  { v: "Moderate", d: "3–5×/week" },
  { v: "Active", d: "6–7×/week" },
  { v: "Very Active", d: "Daily + training" },
];
const ALLERGIES = ["Peanuts", "Tree nuts", "Dairy", "Eggs", "Wheat/Gluten", "Soy", "Fish", "Shellfish", "Sesame"];
const MEDICAL_CONDITIONS = [
  "None",
  "Pregnancy",
  "Gestational Diabetes",
  "Type 1 Diabetes",
  "Type 2 Diabetes",
  "Hypertension",
  "Cardiovascular Disease",
  "Celiac Disease",
  "IBS / IBD",
  "Kidney Disease",
];

const DEFAULT_PROFILES: Profile[] = [
  {
    id: "alex", name: "Alex", tag: "Vegetarian", kind: "swirl",
    meta: {
      name: "Alex", diet: "Vegetarian", sex: "Prefer not to say",
      age: "28", height: "168", weight: "62",
      activity: "Moderate", allergies: ["Dairy"],
      medicalConditions: ["None"],
    },
  },
  {
    id: "jordan", name: "Jordan", tag: "Gluten-free", kind: "knot",
    meta: {
      name: "Jordan", diet: "Omnivore", sex: "Prefer not to say",
      age: "34", height: "180", weight: "78",
      activity: "Active", allergies: ["Wheat/Gluten"],
      medicalConditions: ["Celiac Disease"],
    },
  },
];

const EMPTY_FORM: ProfileMeta = {
  name: "",
  diet: "Omnivore",
  sex: "",
  age: "",
  height: "",
  weight: "",
  activity: "Moderate",
  allergies: [],
  medicalConditions: ["None"],
};

// ─── SVG Glyphs ───────────────────────────────────────────────────────────────

function NoodleGlyph({
  kind,
  color,
  shadowColor,
  animated,
}: {
  kind: NoodleKind;
  color: string;
  shadowColor: string;
  animated: boolean;
}) {
  const s = { fill: "none", strokeWidth: 12, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (kind === "swirl")
    return (
      <svg viewBox="0 0 160 160" width="100%" height="100%" aria-hidden>
        <g transform="translate(2,5)">
          <path d="M140,80 C140,115 112,138 80,138 C52,138 30,118 30,90 C30,67 48,50 70,50 C88,50 102,63 102,80 C102,93 92,103 80,103 C71,103 65,97 65,89 C65,83 70,79 76,79" {...s} stroke={shadowColor} opacity={0.35} />
        </g>
        <path d="M140,80 C140,115 112,138 80,138 C52,138 30,118 30,90 C30,67 48,50 70,50 C88,50 102,63 102,80 C102,93 92,103 80,103 C71,103 65,97 65,89 C65,83 70,79 76,79" {...s} stroke={color} style={animated ? { strokeDasharray: 400, animation: "noodleDraw 1.2s ease-out" } : {}} />
        <circle cx="128" cy="45" r="5" fill={color} />
        <circle cx="30" cy="38" r="3.5" fill={color} opacity={0.7} />
      </svg>
    );

  if (kind === "wave")
    return (
      <svg viewBox="0 0 160 160" width="100%" height="100%" aria-hidden>
        <path d="M20,110 Q40,70 60,110 T100,110 T140,110" {...s} stroke={color} style={animated ? { strokeDasharray: 300, animation: "noodleDraw 1.3s ease-out" } : {}} />
        <path d="M20,80 Q40,40 60,80 T100,80 T140,80" {...s} stroke={color} style={animated ? { strokeDasharray: 300, animation: "noodleDraw 1.4s .1s ease-out both" } : {}} />
        <path d="M20,50 Q40,10 60,50 T100,50 T140,50" {...s} stroke={color} style={animated ? { strokeDasharray: 300, animation: "noodleDraw 1.5s .2s ease-out both" } : {}} />
      </svg>
    );

  if (kind === "knot")
    return (
      <svg viewBox="0 0 160 160" width="100%" height="100%" aria-hidden>
        <g transform="translate(3,5)">
          <path d="M40,60 C40,30 70,20 90,40 C110,60 60,100 40,100 C20,100 20,70 50,70 C80,70 130,70 130,100 C130,130 100,130 80,110 C60,90 100,50 120,50" {...s} stroke={shadowColor} opacity={0.35} />
        </g>
        <path d="M40,60 C40,30 70,20 90,40 C110,60 60,100 40,100 C20,100 20,70 50,70 C80,70 130,70 130,100 C130,130 100,130 80,110 C60,90 100,50 120,50" {...s} stroke={color} style={animated ? { strokeDasharray: 500, animation: "noodleDraw 1.4s ease-out" } : {}} />
      </svg>
    );

  return null;
}

function PlusGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%" aria-hidden>
      <line x1="80" y1="36" x2="80" y2="124" stroke={color} strokeWidth="12" strokeLinecap="round" />
      <line x1="36" y1="80" x2="124" y2="80" stroke={color} strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  idx,
  selected,
  onClick,
  onEdit,
  onDelete,
}: {
  profile: Profile & { type?: string };
  idx: number;
  selected: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isAdd = profile.type === "add";
  const color = isAdd ? THEME.muted : THEME.profileColors[idx % THEME.profileColors.length];
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        width: 200,
        borderRadius: 20,
        background: selected ? color : THEME.card,
        border: `1.5px solid ${THEME.cardBorder}`,
        overflow: "hidden",
        transition: "transform .15s ease, background .2s",
        transform: hover || selected ? "translateY(-3px)" : "translateY(0)",
        cursor: "pointer",
      }}
    >
      {/* Glyph tile — clicking selects the profile */}
      <div
        onClick={onClick}
        role="button"
        aria-pressed={selected}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        style={{
          aspectRatio: "1 / 1",
          background: selected ? "rgba(255,255,255,0.2)" : isAdd ? "rgb(244,244,232)" : color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          borderBottom: `1.5px solid ${THEME.cardBorder}`,
          position: "relative",
          outline: "none",
        }}
      >
        {/* Grid lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.1 }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {[20, 40, 60, 80].map((v) => <line key={"h" + v} x1="0" y1={v} x2="100" y2={v} stroke={THEME.ink} strokeWidth="0.4" />)}
          {[20, 40, 60, 80].map((v) => <line key={"v" + v} x1={v} y1="0" x2={v} y2="100" stroke={THEME.ink} strokeWidth="0.4" />)}
        </svg>

        <div style={{ width: "75%", height: "75%", position: "relative", zIndex: 1 }}>
          {isAdd ? (
            <PlusGlyph color={THEME.ink} />
          ) : (
            <NoodleGlyph
              kind={profile.kind}
              color={selected ? THEME.ink : THEME.noodleColors[0]}
              shadowColor={selected ? "rgba(255,255,255,.4)" : THEME.cardBorder}
              animated={hover || selected}
            />
          )}
        </div>

        {selected && !isAdd && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            width: 22, height: 22, borderRadius: "50%",
            background: THEME.ink, color: THEME.accentInk,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, zIndex: 2,
          }}>✓</div>
        )}
      </div>

      {/* Label row — name + inline edit/delete */}
      <div
        onClick={onClick}
        style={{ padding: "12px 14px 14px", background: selected ? color : THEME.card, textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, lineHeight: 1, color: THEME.ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.name}
          </div>

          {/* Edit / Delete — always visible, inline with name */}
          {!isAdd && (
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onEdit}
                title="Edit profile"
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: `1px solid ${THEME.cardBorder}25`,
                  background: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: THEME.muted,
                  transition: "background .12s, color .12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = THEME.cardBorder + "10"; e.currentTarget.style.color = THEME.ink; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.muted; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                title="Delete profile"
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: `1px solid ${THEME.cardBorder}25`,
                  background: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: THEME.muted,
                  transition: "background .12s, color .12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.color = "#DC2626"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.muted; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 4, fontSize: 11,
          fontFamily: "'Geist Mono', monospace",
          color: selected ? THEME.ink : THEME.muted,
          letterSpacing: ".04em", textTransform: "uppercase",
        }}>
          {profile.tag}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({
  visible,
  onClose,
  onSave,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ProfileMeta) => void;
  initialData?: ProfileMeta;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProfileMeta>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) { setStep(0); setData(initialData ?? EMPTY_FORM); setErrors({}); }
  }, [visible, initialData]);

  // Focus name field once when modal opens — not on every re-render
  useEffect(() => {
    if (visible && step === 0) {
      const t = setTimeout(() => nameRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [visible, step]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const upd = (patch: Partial<ProfileMeta>) => {
    setData((d) => ({ ...d, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k as keyof FormErrors]);
      return next;
    });
  };

  const toggleAllergy = (a: string) =>
    setData((d) => ({
      ...d,
      allergies: d.allergies.includes(a) ? d.allergies.filter((x) => x !== a) : [...d.allergies, a],
    }));

  const toggleCondition = (c: string) => {
    setData((d) => {
      if (c === "None") return { ...d, medicalConditions: ["None"] };
      const without = d.medicalConditions.filter((x) => x !== "None");
      return { ...d, medicalConditions: without.includes(c) ? without.filter((x) => x !== c) : [...without, c] };
    });
    setErrors((prev) => { const next = { ...prev }; delete next.medicalConditions; return next; });
  };

  const validateStep0 = () => {
    const e: FormErrors = {};
    if (!data.name.trim()) e.name = "Name is required";
    if (!data.sex) e.sex = "Please select a sex";
    if (!data.age || Number(data.age) <= 0) e.age = "Enter a valid age";
    if (!data.height || Number(data.height) <= 0) e.height = "Enter a valid height";
    if (!data.weight || Number(data.weight) <= 0) e.weight = "Enter a valid weight";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e: FormErrors = {};
    if (!data.medicalConditions.length) e.medicalConditions = "Select at least one option (or None)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && validateStep0()) setStep(1);
    else if (step === 1 && validateStep1()) onSave(data);
  };

  // Sub-components scoped to modal
  const Chip = ({ active, onClick, children, sub }: { active: boolean; onClick: () => void; children: React.ReactNode; sub?: string }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
        padding: sub ? "9px 14px" : "8px 14px",
        borderRadius: 999,
        border: `1.5px solid ${active ? THEME.cardBorder : THEME.cardBorder + "40"}`,
        background: active ? THEME.ink : "transparent",
        color: active ? "#FFF4E6" : THEME.ink,
        fontSize: 13, fontWeight: 500, cursor: "pointer",
        fontFamily: "'Geist', sans-serif",
        transition: "background .12s, color .12s",
      }}
    >
      <span>{children}</span>
      {sub && <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{sub}</span>}
    </button>
  );

  const Label = ({ text, required }: { text: string; required?: boolean }) => (
    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: THEME.muted }}>
      {text}{required && <span style={{ color: "#DC2626", marginLeft: 2 }}>*</span>}
    </span>
  );

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <span style={{ fontSize: 12, color: "#DC2626", marginTop: 2 }}>{msg}</span> : null;

  const TextInput = ({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) => (
    <input
      {...props}
      style={{
        padding: "11px 13px", borderRadius: 10, width: "100%",
        border: `1.5px solid ${error ? "#DC2626" : THEME.cardBorder + "60"}`,
        background: "transparent", color: THEME.ink,
        fontFamily: "'Geist', sans-serif", fontSize: 15, outline: "none",
      }}
    />
  );

  const STEPS = ["About You", "Lifestyle"];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,20,16,.4)", backdropFilter: "blur(4px)", padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(580px, 100%)", background: THEME.card,
          border: `1.5px solid ${THEME.cardBorder}20`,
          borderRadius: 20, padding: "28px 32px 24px",
          color: THEME.ink, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: i <= step ? 1 : 0.35 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: i <= step ? THEME.ink : "transparent",
                    border: `1.5px solid ${THEME.ink}`,
                    color: i <= step ? "#FFF4E6" : THEME.ink,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 600, fontFamily: "'Geist Mono', monospace",
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 20, height: 1.5, background: THEME.cardBorder, opacity: 0.2 }} />}
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ fontSize: 20, color: THEME.muted, background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <h2 style={{ margin: "20px 0 4px", fontSize: 30, fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: THEME.ink }}>
          {step === 0 ? "About you" : "Your lifestyle"}
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: THEME.muted, lineHeight: 1.5 }}>
          {step === 0 ? "All fields are required to personalize your nutrition targets." : "Fine-tunes your portions and keeps allergens out."}
        </p>

        {/* ── Step 0: About You ── */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label text="Profile name" required />
              <input
                ref={nameRef}
                value={data.name}
                onChange={(e) => upd({ name: e.target.value })}
                placeholder="e.g. Alex"
                style={{
                  padding: "11px 13px", borderRadius: 10, width: "100%",
                  border: `1.5px solid ${errors.name ? "#DC2626" : THEME.cardBorder + "60"}`,
                  background: "transparent", color: THEME.ink,
                  fontFamily: "'Geist', sans-serif", fontSize: 15, outline: "none",
                }}
              />
              <ErrorMsg msg={errors.name} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label text="Diet" required />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DIETS.map((d) => <Chip key={d} active={data.diet === d} onClick={() => upd({ diet: d })}>{d}</Chip>)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label text="Sex" required />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SEXES.map((s) => <Chip key={s} active={data.sex === s} onClick={() => upd({ sex: s })}>{s}</Chip>)}
              </div>
              <ErrorMsg msg={errors.sex} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "Age (yrs)", field: "age" as const, error: errors.age },
                { label: "Height (cm)", field: "height" as const, error: errors.height },
                { label: "Weight (kg)", field: "weight" as const, error: errors.weight },
              ].map(({ label, field, error }) => (
                <div key={field} style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <Label text={label} required />
                  <TextInput
                    type="number" min="1"
                    value={data[field]}
                    onChange={(e) => upd({ [field]: e.target.value })}
                    placeholder="—"
                    error={error}
                  />
                  <ErrorMsg msg={error} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Lifestyle ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label text="Activity level" required />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ACTIVITIES.map((a) => <Chip key={a.v} active={data.activity === a.v} onClick={() => upd({ activity: a.v })} sub={a.d}>{a.v}</Chip>)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label text="Allergies & intolerances" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALLERGIES.map((a) => <Chip key={a} active={data.allergies.includes(a)} onClick={() => toggleAllergy(a)}>{a}</Chip>)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Label text="Medical conditions" required />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {MEDICAL_CONDITIONS.map((c) => <Chip key={c} active={data.medicalConditions.includes(c)} onClick={() => toggleCondition(c)}>{c}</Chip>)}
              </div>
              <ErrorMsg msg={errors.medicalConditions} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          <button
            onClick={() => (step === 0 ? onClose() : setStep(0))}
            style={{ padding: "11px 18px", borderRadius: 12, background: "transparent", color: THEME.muted, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "'Geist', sans-serif" }}
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          <button
            onClick={handleNext}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 14,
              background: "rgb(21, 60, 54)", color: "#FFF4E6",
              border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            {step === 1 ? (initialData ? "Save changes" : "Create profile") : "Continue"}
            <svg width="15" height="15" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 13 H20 M14 7 L20 13 L14 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile mapping helpers ──────────────────────────────────────────────────

const SEX_MAP: Record<string, Sex> = {
  Female: "female", Male: "male", "Non-binary": "other", "Prefer not to say": "other",
};
const ACTIVITY_MAP: Record<string, ActivityLevel> = {
  Sedentary: "sedentary", Light: "light", Moderate: "moderate", Active: "active", "Very Active": "very_active",
};
const ALLERGY_MAP: Record<string, Allergen> = {
  Peanuts: "peanuts", "Tree nuts": "tree_nuts", Dairy: "dairy", Eggs: "eggs",
  "Wheat/Gluten": "wheat_gluten", Soy: "soy", Fish: "fish", Shellfish: "shellfish", Sesame: "sesame",
};
const CONDITION_MAP: Record<string, MedicalCondition> = {
  None: "none", Pregnancy: "pregnancy", "Gestational Diabetes": "gestational_diabetes",
  "Type 1 Diabetes": "type1_diabetes", "Type 2 Diabetes": "type2_diabetes",
  Hypertension: "hypertension", "Cardiovascular Disease": "cardiovascular_disease",
  "Celiac Disease": "celiac_disease", "IBS / IBD": "ibs_ibd", "Kidney Disease": "kidney_disease",
};
const DIET_MAP: Record<string, DietaryPreference | undefined> = {
  Vegetarian: "vegetarian", Vegan: "vegan", Halal: "halal", Kosher: "kosher",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { addProfile, updateProfile, profiles: wizardProfiles, selectProfile, goToStep } = useWizardStore();

  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [mealIdx, setMealIdx] = useState(0);
  const [mealFading, setMealFading] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cc_profiles") || "null");
      if (Array.isArray(saved) && saved.length) setProfiles(saved);
      const sel = localStorage.getItem("cc_selected");
      if (sel) setSelected(sel);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cc_profiles", JSON.stringify(profiles)); } catch {}
  }, [profiles]);

  useEffect(() => {
    try {
      if (selected) localStorage.setItem("cc_selected", selected);
      else localStorage.removeItem("cc_selected");
    } catch {}
  }, [selected]);

  // Rotating meal word
  useEffect(() => {
    let i = 0;
    let fade: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setMealFading(true);
      fade = setTimeout(() => { i = (i + 1) % MEAL_WORDS.length; setMealIdx(i); setMealFading(false); }, 260);
    }, 2200);
    return () => { clearInterval(id); clearTimeout(fade); };
  }, []);

  const handleSave = (formData: ProfileMeta) => {
    if (editingProfile) {
      setProfiles((prev) =>
        prev.map((p) => p.id === editingProfile.id ? { ...p, name: formData.name.trim(), tag: formData.diet, meta: formData } : p)
      );
    } else {
      const id = formData.name.trim().toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2, 5);
      const kind = NOODLE_KINDS[profiles.length % 3];
      const newProfile: Profile = { id, name: formData.name.trim(), tag: formData.diet, kind, meta: formData };
      setProfiles((prev) => [...prev, newProfile]);
      setSelected(id);
    }
    setModalOpen(false);
    setEditingProfile(null);
  };

  const handleDelete = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (selected === id) setSelected(null);
  };

  const selectedProfile = profiles.find((p) => p.id === selected);
  const canBegin = selected !== null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        body { font-family: 'Geist', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        button { font-family: inherit; }
        @keyframes noodleDraw { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "rgb(244, 244, 232)", color: THEME.ink, position: "relative", overflow: "hidden" }}>

        {/* Subtle grid underlay */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.045, pointerEvents: "none" }} aria-hidden>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={THEME.ink} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Header */}
        <header style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="CookCopilot" style={{ width: 38, height: 38 }} />
            <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 17, color: THEME.ink }}>CookCopilot</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 12px", borderRadius: 999,
              background: THEME.card, border: `1px solid ${THEME.cardBorder}18`,
              fontSize: 12, fontFamily: "'Geist Mono', monospace", color: THEME.ink,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: THEME.accent, display: "inline-block" }} />
              PRINTER READY · 37°C
            </div>
            <button
              onClick={() => router.push("/settings")}
              style={{ fontSize: 13, color: THEME.muted, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
            >
              Settings
            </button>
          </div>
        </header>

        {/* Main */}
        <main style={{
          position: "relative", zIndex: 2,
          maxWidth: 1100, margin: "0 auto",
          padding: "24px 40px 80px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          {/* Eyebrow tag */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 999,
            background: THEME.tagBg, color: THEME.tagInk,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
            marginBottom: 22,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: THEME.accent, display: "inline-block" }} />
            Welcome back
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: "clamp(44px, 7.5vw, 88px)", lineHeight: 1.0,
            letterSpacing: "-0.02em", maxWidth: 900,
            fontFamily: "'Instrument Serif', serif", fontWeight: 400,
            color: "rgb(24, 29, 41)",
          }}>
            <div style={{ whiteSpace: "nowrap" }}>Make with CookCopilot</div>
            <div>
              <span style={{ position: "relative", display: "inline-block", minWidth: "4.2em", textAlign: "center", color: "rgb(21, 60, 54)" }}>
                <span aria-hidden style={{ visibility: "hidden", pointerEvents: "none" }}>breakfast.</span>
                <span style={{
                  position: "absolute", left: 0, right: 0, top: 0,
                  transition: "opacity .26s ease, transform .26s ease",
                  opacity: mealFading ? 0 : 1,
                  transform: mealFading ? "translateY(8px)" : "translateY(0)",
                }}>
                  {MEAL_WORDS[mealIdx]}
                </span>
                <svg style={{ position: "absolute", left: "15%", bottom: "-14%", width: "70%", height: "22%", pointerEvents: "none" }} viewBox="0 0 300 30" preserveAspectRatio="none">
                  <path d="M5,22 Q75,6 150,18 T295,14" fill="none" stroke="rgb(21, 60, 54)" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          </h1>

          <p style={{ marginTop: 26, maxWidth: 520, fontSize: 17, lineHeight: 1.5, color: THEME.muted }}>
            AI-powered personalized food fabrication
          </p>

          {/* Profile section */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            marginTop: 56, marginBottom: 22,
            color: THEME.muted, fontFamily: "'Geist Mono', monospace",
            fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase",
          }}>
            <span style={{ width: 36, height: 1, background: THEME.muted, opacity: .4, display: "inline-block" }} />
            Select your profile
            <span style={{ width: 36, height: 1, background: THEME.muted, opacity: .4, display: "inline-block" }} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", maxWidth: 920 }}>
            {profiles.map((p, i) => (
              <ProfileCard
                key={p.id} profile={p} idx={i}
                selected={selected === p.id}
                onClick={() => setSelected(p.id)}
                onEdit={() => { setEditingProfile(p); setModalOpen(true); }}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
            <ProfileCard
              profile={{ id: "__add", name: "Add new", tag: "New profile", kind: "swirl", type: "add" }}
              idx={profiles.length}
              selected={false}
              onClick={() => { setEditingProfile(null); setModalOpen(true); }}
            />
          </div>

          {/* CTA */}
          <div style={{ marginTop: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <button
              disabled={!canBegin}
              onClick={() => {
                if (!canBegin || !selectedProfile) return;
                const meta = selectedProfile.meta;
                const wizardProfile = {
                  profileName: selectedProfile.name,
                  sex: (SEX_MAP[meta?.sex ?? ""] ?? "other") as Sex,
                  weightKg: Number(meta?.weight ?? 0),
                  heightCm: Number(meta?.height ?? 0),
                  age: Number(meta?.age ?? 0),
                  activityLevel: (ACTIVITY_MAP[meta?.activity ?? ""] ?? "moderate") as ActivityLevel,
                  weightGoal: "maintain" as const,
                  allergies: (meta?.allergies ?? []).map((a) => ALLERGY_MAP[a]).filter(Boolean) as Allergen[],
                  allergyOther: "",
                  medicalConditions: (meta?.medicalConditions ?? ["None"]).map((c) => CONDITION_MAP[c]).filter(Boolean) as MedicalCondition[],
                  dietaryPreferences: [DIET_MAP[meta?.diet ?? ""]].filter(Boolean) as DietaryPreference[],
                  notes: "",
                };
                const existing = wizardProfiles.find((p) => p.profileName === selectedProfile.name);
                let wid: string;
                if (existing) { updateProfile(existing.id, wizardProfile); wid = existing.id; }
                else { wid = addProfile(wizardProfile).id; }
                selectProfile(wid);
                goToStep(3);
                router.push("/wizard");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "18px 28px 18px 32px", borderRadius: 16,
                background: canBegin ? "rgb(21, 60, 54)" : "transparent",
                color: canBegin ? "#FFF4E6" : THEME.muted,
                border: `1.5px solid ${canBegin ? "rgb(21,60,54)" : THEME.muted + "50"}`,
                fontSize: 20, fontFamily: "'Geist', sans-serif", fontWeight: 600,
                letterSpacing: "-0.01em", cursor: canBegin ? "pointer" : "not-allowed",
                transition: "all .18s", minWidth: 260, justifyContent: "center",
              }}
            >
              <span>
                {canBegin ? (
                  <>Begin with <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, fontSize: 22 }}>{selectedProfile?.name}</em></>
                ) : "Begin"}
              </span>
              <svg width="20" height="20" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: canBegin ? 1 : 0.4 }}>
                <path d="M4 13 H20 M14 7 L20 13 L14 19" />
              </svg>
            </button>

            {!canBegin && (
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: THEME.muted, letterSpacing: ".08em", textTransform: "uppercase" }}>
                Select a profile to continue
              </p>
            )}
          </div>
        </main>
      </div>

      <ProfileModal
        visible={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProfile(null); }}
        onSave={handleSave}
        initialData={editingProfile?.meta}
      />
    </>
  );
}
