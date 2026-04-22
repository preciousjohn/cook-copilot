"use client";

import { useState, useEffect } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { Button } from "../ui/Button";
import { StageLoader } from "../ui/StageLoader";
import { RevisePanel } from "../ui/RevisePanel";
import { runDietitian, runChef } from "../../lib/api";
import { ProfileSidebar } from "../dietitian/ProfileSidebar";

const T = {
  cream: "rgb(244, 244, 232)",
  card: "#FFFFFF",
  border: "rgba(26,20,16,0.1)",
  ink: "#1A1410",
  muted: "#6B5D50",
  forest: "rgb(21, 60, 54)",
  forestInk: "#FFF4E6",
  orange: "#D15200",
  teal: "#29787C",
  amber: "#FFB341",
  warnBg: "#FFFBEB",
  warnBorder: "#FDE68A",
  errorBg: "#FFF0F0",
  errorBorder: "#FECACA",
  errorText: "#C0392B",
} as const;

const ALL_ALLERGENS = [
  { key: "peanuts", label: "Peanuts" },
  { key: "tree_nuts", label: "Tree Nuts" },
  { key: "dairy", label: "Dairy" },
  { key: "eggs", label: "Eggs" },
  { key: "wheat_gluten", label: "Wheat / Gluten" },
  { key: "soy", label: "Soy" },
  { key: "fish", label: "Fish" },
  { key: "shellfish", label: "Shellfish" },
  { key: "sesame", label: "Sesame" },
];

const ALL_DIETARY = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "halal", label: "Halal" },
  { key: "kosher", label: "Kosher" },
  { key: "gluten_free", label: "Gluten-free" },
  { key: "low_sodium", label: "Low sodium" },
  { key: "low_sugar", label: "Low sugar" },
  { key: "nut_free", label: "Nut-free" },
];

function EditRestrictionsModal({
  allergens,
  onSave,
  onClose,
}: {
  allergens: string[];
  onSave: (updated: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(allergens));

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const chipBase: React.CSSProperties = {
    padding: "8px 16px", borderRadius: 999, fontSize: 13,
    fontFamily: "'Geist', sans-serif", fontWeight: 500,
    cursor: "pointer", transition: "all 0.15s", border: "1.5px solid",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(26,20,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 20, padding: "32px 32px 24px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 6px", fontFamily: "'Instrument Serif', serif", fontSize: 24, fontWeight: 400, color: T.ink }}>
          Dietary Restrictions
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif" }}>
          Toggle restrictions to include or exclude from your recipe.
        </p>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: T.muted, marginBottom: 12, fontFamily: "'Geist', sans-serif" }}>
            Allergens
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {ALL_ALLERGENS.map(({ key, label }) => {
              const active = selected.has(key);
              return (
                <button key={key} onClick={() => toggle(key)} style={{ ...chipBase, borderColor: active ? T.orange : T.border, background: active ? "#FDF0E8" : T.card, color: active ? T.orange : T.muted }}>
                  {active ? "✕ " : "+ "}{label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: T.muted, marginBottom: 12, fontFamily: "'Geist', sans-serif" }}>
            Dietary Preferences
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {ALL_DIETARY.map(({ key, label }) => {
              const active = selected.has(key);
              return (
                <button key={key} onClick={() => toggle(key)} style={{ ...chipBase, borderColor: active ? T.forest : T.border, background: active ? "rgba(21,60,54,0.08)" : T.card, color: active ? T.forest : T.muted }}>
                  {active ? "✓ " : "+ "}{label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${T.border}`, paddingTop: 20 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 999, fontSize: 13, fontWeight: 500, fontFamily: "'Geist', sans-serif", cursor: "pointer", border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted }}>
            Cancel
          </button>
          <button onClick={() => onSave([...selected])} style={{ padding: "10px 24px", borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif", cursor: "pointer", border: `1.5px solid ${T.forest}`, background: T.forest, color: T.forestInk }}>
            Save restrictions
          </button>
        </div>
      </div>
    </div>
  );
}

export function Step4Dietitian() {
  const {
    dietitianOutput,
    parsedPrompt,
    getSelectedProfile,
    prompt,
    setChefOutput,
    setStepLoading,
    setStepError,
    setDietitianOutput,
    stepLoading,
    stepError,
    appendLog,
    goToStep,
  } = useWizardStore();

  const [showRevise, setShowRevise] = useState(false);
  const [showEditRestrictions, setShowEditRestrictions] = useState(false);
  const profile = getSelectedProfile();

  const isLoading = stepLoading.dietitian || stepLoading.chef;
  const error = stepError.dietitian || stepError.chef;

  // ── Daily target slider state
  const originalDailyTarget = dietitianOutput?.daily_reference?.daily_target ?? 2000;
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);

  useEffect(() => {
    if (dietitianOutput?.daily_reference?.daily_target) {
      setDailyTarget(Math.round(dietitianOutput.daily_reference.daily_target));
    }
  }, [dietitianOutput?.daily_reference?.daily_target]);

  const effectiveDailyTarget = dailyTarget ?? Math.round(originalDailyTarget);
  const ratio = originalDailyTarget > 0 ? effectiveDailyTarget / originalDailyTarget : 1;
  const displayKcalMin = Math.round((dietitianOutput?.nutrition_targets.kcal.min ?? 0) * ratio);
  const displayKcalMax = Math.round((dietitianOutput?.nutrition_targets.kcal.max ?? 0) * ratio);

  const isTooLow = effectiveDailyTarget < 1200;
  const isTooHigh = effectiveDailyTarget > 3500;
  const hasWarning = isTooLow || isTooHigh;

  // ── Confirm
  async function handleConfirm() {
    if (!dietitianOutput) return;
    setStepLoading("chef", true);
    setStepError("chef", null);
    const t0 = Date.now();
    const adjustedOutput = {
      ...dietitianOutput,
      nutrition_targets: { ...dietitianOutput.nutrition_targets, kcal: { min: displayKcalMin, max: displayKcalMax } },
      daily_reference: { ...dietitianOutput.daily_reference, daily_target: effectiveDailyTarget },
    };
    try {
      const result = await runChef(
        adjustedOutput.nutrition_targets, adjustedOutput.allergens,
        profile?.age ?? 0, profile?.sex ?? "", profile?.dietaryPreferences ?? [],
        parsedPrompt?.shape ?? "", parsedPrompt?.meal_type ?? adjustedOutput.meal_type,
        parsedPrompt?.ingredients ?? [], parsedPrompt?.menu ?? ""
      );
      appendLog({ stage: "chef", request: { prompt, nutrition_targets: adjustedOutput.nutrition_targets }, response: result as unknown as Record<string, unknown>, timestamp: t0, duration_ms: Date.now() - t0 });
      setChefOutput(result);
      goToStep(5);
    } catch (err) {
      setStepError("chef", err instanceof Error ? err.message : "Failed to run chef.");
    } finally {
      setStepLoading("chef", false);
    }
  }

  // ── Revise
  async function handleRevisePrompt(revision: string) {
    if (!profile) return;
    setStepLoading("dietitian", true);
    setStepError("dietitian", null);
    const t0 = Date.now();
    try {
      const result = await runDietitian(profile, parsedPrompt?.meal_type ?? "");
      appendLog({ stage: "dietitian", request: { revision, profile }, response: result as unknown as Record<string, unknown>, timestamp: t0, duration_ms: Date.now() - t0 });
      setDietitianOutput(result);
      setShowRevise(false);
    } catch (err) {
      setStepError("dietitian", err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setStepLoading("dietitian", false);
    }
  }

  function handleReviseManual(overrides: Record<string, number>) {
    if (!dietitianOutput) return;
    const nt = dietitianOutput.nutrition_targets;
    setDietitianOutput({
      ...dietitianOutput,
      nutrition_targets: {
        ...nt,
        kcal: { ...nt.kcal, min: overrides.kcal_min ?? nt.kcal.min, max: overrides.kcal_max ?? nt.kcal.max },
        sugar_g: { ...nt.sugar_g, max: overrides.sugar_max ?? nt.sugar_g.max },
      },
    });
    setShowRevise(false);
  }

  function handleSaveRestrictions(updated: string[]) {
    if (!dietitianOutput) return;
    setDietitianOutput({ ...dietitianOutput, allergens: updated });
    setShowEditRestrictions(false);
  }

  if (!dietitianOutput && stepLoading.dietitian) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StageLoader stage="dietitian" />
      </div>
    );
  }
  if (!dietitianOutput) return null;

  const nt = dietitianOutput.nutrition_targets;
  const { macro_percent } = nt.composition;
  const mealType = dietitianOutput.meal_type;
  const allergens = dietitianOutput.allergens;

  const sliderMin = Math.max(800, Math.round(originalDailyTarget * 0.4));
  const sliderMax = Math.round(originalDailyTarget * 1.8);
  const sliderPct = Math.max(0, Math.min(100, ((effectiveDailyTarget - sliderMin) / (sliderMax - sliderMin)) * 100));
  const sliderColor = isTooLow ? "#EF4444" : isTooHigh ? "#F59E0B" : T.forest;

  const carbDeg = (macro_percent.carbs / 100) * 360;
  const proteinDeg = (macro_percent.protein / 100) * 360;
  const donutGradient = `conic-gradient(${T.teal} 0deg ${carbDeg}deg, ${T.orange} ${carbDeg}deg ${carbDeg + proteinDeg}deg, ${T.amber} ${carbDeg + proteinDeg}deg 360deg)`;

  const dietitianSliders = [
    { key: "kcal_min", label: "Kcal min", min: 100, max: 800, step: 10, value: nt.kcal.min, unit: "kcal" },
    { key: "kcal_max", label: "Kcal max", min: 100, max: 800, step: 10, value: nt.kcal.max, unit: "kcal" },
    { key: "sugar_max", label: "Sugar max", min: 0, max: 50, step: 1, value: nt.sugar_g.max, unit: "g" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", background: T.cream }}>
      <style>{`
        input[type=range].nt-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; outline: none; cursor: pointer; width: 100%; display: block; }
        input[type=range].nt-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2.5px solid ${T.forest}; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.15); margin-top: -8px; }
        input[type=range].nt-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; }
        input[type=range].nt-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2.5px solid ${T.forest}; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
      `}</style>

      <div style={{ flex: 1, overflowY: "auto", padding: "36px 32px", maxWidth: 960, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontFamily: "'Instrument Serif', serif", fontSize: 30, fontWeight: 400, color: T.ink, letterSpacing: "-0.01em" }}>
            Your Nutrition Targets
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif" }}>
            Review your targets, then confirm to generate your recipe.
          </p>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left: Profile sidebar */}
          {profile && <ProfileSidebar profile={profile} />}

          {/* Right: 2 cards */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* ── Card 1: Calories + Sugar cap ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 28px" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <span style={{ fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif", fontWeight: 500 }}>Calories</span>
                <span style={{
                  padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "'Geist', sans-serif",
                  background: mealType === "snack" ? "#E8F4FD" : "#F0FDF4",
                  color: mealType === "snack" ? "#1A6FA8" : "#166534",
                }}>
                  {mealType}
                </span>
              </div>

              {/* Donut + legend */}
              <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
                <div style={{ width: 148, height: 148, borderRadius: "50%", background: donutGradient, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 94, height: 94, borderRadius: "50%", background: T.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: "'Geist', sans-serif", lineHeight: 1.1, textAlign: "center" }}>
                      {displayKcalMin}–{displayKcalMax}
                    </span>
                    <span style={{ fontSize: 10, color: T.muted, fontFamily: "'Geist', sans-serif", marginTop: 2 }}>kcal</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(() => {
                    const avgKcal = (displayKcalMin + displayKcalMax) / 2;
                    return [
                      { color: T.teal,   label: "Carbs",   pct: Math.round(macro_percent.carbs),   g: Math.round((macro_percent.carbs   / 100) * avgKcal / 4) },
                      { color: T.orange, label: "Protein", pct: Math.round(macro_percent.protein), g: Math.round((macro_percent.protein / 100) * avgKcal / 4) },
                      { color: T.amber,  label: "Fat",     pct: Math.round(macro_percent.fat),     g: Math.round((macro_percent.fat     / 100) * avgKcal / 9) },
                    ].map((m) => (
                      <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: m.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: T.ink, fontFamily: "'Geist', sans-serif", width: 56 }}>{m.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: "'Geist', sans-serif", width: 38 }}>{m.pct}%</span>
                        <span style={{ fontSize: 12, color: T.muted, fontFamily: "'Geist', sans-serif" }}>~{m.g}g</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Sugar cap divider row */}
              {nt.sugar_g.max > 0 && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: T.muted, fontFamily: "'Geist', sans-serif" }}>Sugar cap</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: "'Geist', sans-serif" }}>
                    &lt; {nt.sugar_g.max}g
                  </span>
                </div>
              )}
            </div>

            {/* ── Card 2: Daily target slider + Restrictions ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 28px" }}>
              {/* Daily target section */}
              <div style={{ fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif", fontWeight: 500, marginBottom: 18 }}>
                Daily Nutrition Targets
              </div>

              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 44, fontWeight: 700, color: T.ink, fontFamily: "'Geist', sans-serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {effectiveDailyTarget.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif", marginTop: 5 }}>kcal/day</div>
              </div>

              <input
                type="range"
                className="nt-slider"
                min={sliderMin}
                max={sliderMax}
                step={10}
                value={effectiveDailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${sliderPct}%, #E5E7EB ${sliderPct}%, #E5E7EB 100%)`,
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: "'Geist', sans-serif" }}>{sliderMin.toLocaleString()} kcal</span>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: "'Geist', sans-serif" }}>{sliderMax.toLocaleString()} kcal</span>
              </div>

              {hasWarning && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: isTooLow ? T.errorBg : T.warnBg, border: `1px solid ${isTooLow ? T.errorBorder : T.warnBorder}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, lineHeight: "1.3" }}>{isTooLow ? "⚠️" : "💡"}</span>
                  <span style={{ fontSize: 13, color: isTooLow ? T.errorText : "#92400E", fontFamily: "'Geist', sans-serif", lineHeight: 1.5 }}>
                    {isTooLow
                      ? "Below the typical safe minimum (1,200 kcal/day). Very low targets should be supervised by a healthcare professional."
                      : "This exceeds a typical daily energy need. Make sure this target fits your goals."}
                  </span>
                </div>
              )}

              {/* Restrictions divider */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif", fontWeight: 500 }}>
                    Restrictions
                  </span>
                  <button
                    onClick={() => setShowEditRestrictions(true)}
                    style={{ padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif", cursor: "pointer", border: `1.5px solid ${T.ink}`, background: T.ink, color: "#FFF4E6" }}
                  >
                    Edit
                  </button>
                </div>
                {allergens.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif", fontStyle: "italic" }}>
                    No restrictions set — click Edit to add some.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                    {allergens.map((a) => (
                      <span key={a} style={{ padding: "6px 14px", borderRadius: 999, fontSize: 13, fontFamily: "'Geist', sans-serif", fontWeight: 500, background: "#FDF0E8", color: T.orange, border: "1px solid #F5C8A0" }}>
                        No {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Revise panel */}
            {showRevise && (
              <RevisePanel
                onRevisePrompt={handleRevisePrompt}
                onReviseManual={handleReviseManual}
                sliderFields={dietitianSliders}
                loading={stepLoading.dietitian}
                error={stepError.dietitian}
                onCancel={() => setShowRevise(false)}
              />
            )}

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: T.errorBg, border: `1px solid ${T.errorBorder}`, color: T.errorText, fontSize: 13, fontFamily: "'Geist', sans-serif" }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      {!showRevise && (
        <div style={{ position: "sticky", bottom: 0, background: T.cream, borderTop: `1px solid ${T.border}`, padding: "14px 32px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="md" onClick={() => goToStep(3)} disabled={isLoading}>
            ← Previous
          </Button>
          <Button
            variant="primary" size="md"
            loading={stepLoading.chef}
            loadingMessages={["Designing your recipe…", "Balancing the ingredients…", "Crafting the perfect blend…", "Assigning syringe layers…", "Almost there…"]}
            disabled={isLoading}
            onClick={handleConfirm}
          >
            Confirm — generate recipe →
          </Button>
        </div>
      )}

      {/* Modals */}
      {showEditRestrictions && (
        <EditRestrictionsModal
          allergens={allergens}
          onSave={handleSaveRestrictions}
          onClose={() => setShowEditRestrictions(false)}
        />
      )}

    </div>
  );
}
