"use client";

import { useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { Button } from "../ui/Button";
import { LoadingBlock } from "../ui/Spinner";
import { RevisePanel } from "../ui/RevisePanel";
import { runParse, runChef, runEngineer } from "../../lib/api";
import { SyringeRecipeCard } from "../chef/SyringeRecipeCard";
import { ContourPreview } from "../chef/ContourPreview";
import { NutritionFactsTable } from "../chef/NutritionFactsTable";

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Chef Review
//
// Shows the AI chef's output: syringe recipe cards, shopping list,
// and contour preview. User can Confirm (→ Step 6) or Revise.
// Sub-components live in components/chef/.
// ─────────────────────────────────────────────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

export function Step5Chef() {
  const {
    dietitianOutput,
    chefOutput,
    prompt,
    parsedPrompt,
    getSelectedProfile,
    setParsedPrompt,
    setChefOutput,
    setEngineerOutput,
    setStepLoading,
    setStepError,
    stepLoading,
    stepError,
    appendLog,
    goToStep,
  } = useWizardStore();

  const profile = getSelectedProfile();

  const [showRevise, setShowRevise] = useState(false);

  const isLoading = stepLoading.chef || stepLoading.engineer;
  const error = stepError.chef || stepError.engineer;

  // ── Confirm: run engineer and go to step 6
  async function handleConfirm() {
    if (!chefOutput) return;
    setStepLoading("engineer", true);
    setStepError("engineer", null);
    const t0 = Date.now();
    try {
      const result = await runEngineer(prompt, chefOutput, profile?.age ?? 0, parsedPrompt?.meal_type ?? "");
      appendLog({
        stage: "engineer",
        request: { prompt, chef_output: chefOutput },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0,
        duration_ms: Date.now() - t0,
      });
      setEngineerOutput(result);
      goToStep(6);
    } catch (err) {
      setStepError("engineer", err instanceof Error ? err.message : "Failed to run engineer.");
    } finally {
      setStepLoading("engineer", false);
    }
  }

  // ── Revise: re-parse and re-run chef with revision text
  async function handleRevisePrompt(revision: string) {
    if (!dietitianOutput) return;
    setStepLoading("chef", true);
    setStepError("chef", null);
    const revisedPrompt = `${prompt}\n\n[Revision request]: ${revision}`;
    const t0 = Date.now();
    try {
      const parsed = await runParse(revisedPrompt);
      setParsedPrompt(parsed);
      const result = await runChef(dietitianOutput.nutrition_targets, dietitianOutput.allergens, profile?.age ?? 0, profile?.sex ?? "", profile?.dietaryPreferences ?? [], parsed.shape, parsed.meal_type, parsed.ingredients, parsed.menu);
      appendLog({
        stage: "chef",
        request: { prompt: revisedPrompt, nutrition_targets: dietitianOutput.nutrition_targets },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0,
        duration_ms: Date.now() - t0,
      });
      setChefOutput(result);
      setShowRevise(false);
    } catch (err) {
      setStepError("chef", err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setStepLoading("chef", false);
    }
  }

  if (!chefOutput && stepLoading.chef) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label="Designing your recipe..." />
      </div>
    );
  }

  if (!chefOutput) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              {chefOutput.menu_name}
            </h2>
            <span style={{ fontSize: "13px", color: "var(--fg3)" }}>
              {chefOutput.num_syringes} syringe{chefOutput.num_syringes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Syringe cards + nutrition facts + shape preview — all in one row */}
        <div style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
          {/* Recipe cards */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(chefOutput.syringe_recipes.length, 2)}, minmax(0, 1fr))`,
              gap: "16px",
            }}
          >
            {chefOutput.syringe_recipes.map((recipe) => (
              <SyringeRecipeCard key={recipe.syringe_id} recipe={recipe} />
            ))}
          </div>

          {/* Shape preview */}
          <div style={{ flexShrink: 0, width: "260px", display: "flex" }}>
            <ContourPreview b64={chefOutput.silhouette_image_b64} />
          </div>

          {/* Nutrition facts table */}
          {chefOutput.nutrition_facts && (
            <div style={{ flexShrink: 0, display: "flex" }}>
              <NutritionFactsTable facts={chefOutput.nutrition_facts} />
            </div>
          )}
        </div>

        {/* Post-processing */}
        {chefOutput.post_processing?.length > 0 && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "10px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg3)", marginBottom: "8px" }}>
              After printing
            </div>
            <div style={{ fontSize: "13px", color: "var(--fg2)", lineHeight: "1.7" }}>
              {chefOutput.post_processing[0]}
            </div>
          </div>
        )}

        {/* Retrieved KB chunks (collapsed by default) */}
        {chefOutput.retrieved_chunks && chefOutput.retrieved_chunks.length > 0 && (
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
              Retrieved KB Chunks ({chefOutput.retrieved_chunks.length})
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {chefOutput.retrieved_chunks.map((chunk, i) => (
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
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--fg3)", marginBottom: "4px", fontSize: "11px" }}>
                    score: {chunk.score.toFixed(4)}
                    {chunk.metadata?.source ? ` · ${chunk.metadata.source}` : ""}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{chunk.content}</div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Revise panel */}
        {showRevise && (
          <RevisePanel
            onRevisePrompt={handleRevisePrompt}
            loading={stepLoading.chef}
            error={stepError.chef}
            onCancel={() => setShowRevise(false)}
          />
        )}

        {/* Error */}
        {error && (
          <div
            style={{
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
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fg3)", flex: 1 }}>
            Review your recipe, then confirm to generate the G-code.
          </p>
          <Button variant="secondary" size="md" onClick={() => setShowRevise(true)} disabled={isLoading}>
            Feedback
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={stepLoading.engineer}
            disabled={isLoading}
            onClick={handleConfirm}
          >
            Confirm — generate G-code →
          </Button>
        </div>
      )}
    </div>
  );
}
