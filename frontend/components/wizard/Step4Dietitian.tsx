"use client";

import { useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { Button } from "../ui/Button";
import { StageLoader } from "../ui/StageLoader";
import { RevisePanel } from "../ui/RevisePanel";
import { runDietitian, runChef } from "../../lib/api";
import { NutritionTargetCard } from "../dietitian/NutritionTargetCard";
import { RestrictionsBadges } from "../dietitian/RestrictionsBadges";
import { CalcTraceAccordion } from "../dietitian/CalcTraceAccordion";
import { ProfileSidebar } from "../dietitian/ProfileSidebar";
import { DailyNutritionCard } from "../dietitian/DailyNutritionCard";

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Dietitian Review
//
// Shows the AI dietitian's output: nutrition targets, calculation trace,
// and restrictions. User can Confirm (→ Step 5) or Revise.
// Sub-components live in components/dietitian/.
// ─────────────────────────────────────────────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

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
  const profile = getSelectedProfile();

  const isLoading = stepLoading.dietitian || stepLoading.chef;
  const error = stepError.dietitian || stepError.chef;

  // ── Confirm: run chef and go to step 5
  async function handleConfirm() {
    if (!dietitianOutput) return;
    setStepLoading("chef", true);
    setStepError("chef", null);
    const t0 = Date.now();
    try {
      const result = await runChef(dietitianOutput.nutrition_targets, dietitianOutput.allergens, profile?.age ?? 0, profile?.sex ?? "", profile?.dietaryPreferences ?? [], parsedPrompt?.shape ?? "", parsedPrompt?.meal_type ?? dietitianOutput.meal_type, parsedPrompt?.ingredients ?? [], parsedPrompt?.menu ?? "");
      appendLog({
        stage: "chef",
        request: { prompt, nutrition_targets: dietitianOutput.nutrition_targets },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0,
        duration_ms: Date.now() - t0,
      });
      setChefOutput(result);
      goToStep(5);
    } catch (err) {
      setStepError("chef", err instanceof Error ? err.message : "Failed to run chef.");
    } finally {
      setStepLoading("chef", false);
    }
  }

  // ── Revise via prompt: re-run dietitian with revision text
  async function handleRevisePrompt(revision: string) {
    if (!profile) return;
    setStepLoading("dietitian", true);
    setStepError("dietitian", null);
    const t0 = Date.now();
    try {
      const result = await runDietitian(profile, parsedPrompt?.meal_type ?? "");
      appendLog({
        stage: "dietitian",
        request: { revision, profile },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0,
        duration_ms: Date.now() - t0,
      });
      setDietitianOutput(result);
      setShowRevise(false);
    } catch (err) {
      setStepError("dietitian", err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setStepLoading("dietitian", false);
    }
  }

  // ── Revise via manual overrides — directly patch nutrition targets (no AI call)
  function handleReviseManual(overrides: Record<string, number>) {
    if (!dietitianOutput) return;
    const nt = dietitianOutput.nutrition_targets;
    const patched = {
      ...dietitianOutput,
      nutrition_targets: {
        ...nt,
        kcal: {
          ...nt.kcal,
          min: overrides.kcal_min ?? nt.kcal.min,
          max: overrides.kcal_max ?? nt.kcal.max,
        },
        sugar_g: {
          ...nt.sugar_g,
          max: overrides.sugar_max ?? nt.sugar_g.max,
        },
      },
    };
    setDietitianOutput(patched);
    setShowRevise(false);
  }

  // ── Loading state (first run, no output yet)
  if (!dietitianOutput && stepLoading.dietitian) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StageLoader stage="dietitian" />
      </div>
    );
  }

  if (!dietitianOutput) return null;

  const nt = dietitianOutput.nutrition_targets;
  const dietitianSliders = [
    { key: "kcal_min", label: "Kcal min", min: 100, max: 800, step: 10, value: nt.kcal.min, unit: "kcal" },
    { key: "kcal_max", label: "Kcal max", min: 100, max: 800, step: 10, value: nt.kcal.max, unit: "kcal" },
    { key: "sugar_max", label: "Sugar max", min: 0, max: 50, step: 1, value: nt.sugar_g.max, unit: "g" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          maxWidth: "1100px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Top row: Profile sidebar (left) + Nutrition cards (right) */}
        <div style={{ display: "flex", gap: "24px", alignItems: "stretch" }}>
          {/* Left: Profile sidebar */}
          {profile && <ProfileSidebar profile={profile} />}

          {/* Right: Nutrition target (top) + Daily target (bottom) */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
            {/* Meal nutrition target + restrictions */}
            <NutritionTargetCard data={dietitianOutput} mealType={dietitianOutput.meal_type} />

            {/* Sugar cap (standalone card) */}
            {dietitianOutput.nutrition_targets.sugar_g.max > 0 && (
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--fg2)" }}>Sugar cap</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>
                  ≤ {dietitianOutput.nutrition_targets.sugar_g.max}g
                </span>
              </div>
            )}

            {/* Daily nutrition target */}
            {dietitianOutput.daily_reference && (
              <DailyNutritionCard daily={dietitianOutput.daily_reference} />
            )}

            <RestrictionsBadges allergens={dietitianOutput.allergens} age={profile?.age ?? 0} />
          </div>
        </div>

        {/* Calculation trace — full width, collapsible */}
        <div style={{ marginTop: "24px" }}>
          <CalcTraceAccordion data={dietitianOutput} />
        </div>

        {/* Revise panel (full width) */}
        {showRevise && (
          <div style={{ marginTop: "24px" }}>
            <RevisePanel
              onRevisePrompt={handleRevisePrompt}
              onReviseManual={handleReviseManual}
              sliderFields={dietitianSliders}
              loading={stepLoading.dietitian}
              error={stepError.dietitian}
              onCancel={() => setShowRevise(false)}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "#fff0f0",
              border: "1px solid #fcc",
              color: "#c0392b",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Confirm/Revise bar */}
      {!showRevise && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "var(--bg)",
            borderTop: "1px solid var(--border)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <Button variant="secondary" size="md" onClick={() => goToStep(3)} disabled={isLoading}>
            ← Previous
          </Button>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fg3)", flex: 1 }}>
            Review the nutrition targets, then confirm to generate your recipe.
          </p>
          <Button variant="secondary" size="md" onClick={() => setShowRevise(true)} disabled={isLoading}>
            Feedback
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={stepLoading.chef}
            loadingMessages={[
              "Designing your recipe…",
              "Balancing the ingredients…",
              "Crafting the perfect blend…",
              "Assigning syringe layers…",
              "Almost there…",
            ]}
            disabled={isLoading}
            onClick={handleConfirm}
          >
            Confirm — generate recipe →
          </Button>
        </div>
      )}
    </div>
  );
}
