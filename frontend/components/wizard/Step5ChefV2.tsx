"use client";

import { useState, useEffect } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { LoadingBlock } from "../ui/Spinner";
import { Button } from "../ui/Button";
import { RevisePanel } from "../ui/RevisePanel";
import { runParse, runChef, runEngineer, runSilhouettes } from "../../lib/api";
import { NutritionFactsTable } from "../chef/NutritionFactsTable";
import type { SyringeRecipe } from "../../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — matches homepage / profile page aesthetic
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  ink:       "#1A1410",
  muted:     "#6B5D50",
  card:      "#FFFFFF",
  border:    "rgba(26, 20, 16, 0.12)",
  forest:    "rgb(21, 60, 54)",
  forestInk: "#FFF4E6",
  cream:     "rgb(244, 244, 232)",
  badge:     "#354f22",
  danger:    "#c0392b",
  dangerBg:  "#fff0f0",
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────

function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SyringeRecipeCard
// ─────────────────────────────────────────────────────────────────────────────

function SyringeRecipeCardV2({ recipe }: { recipe: SyringeRecipe }) {
  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{
            width: 30, height: 30, borderRadius: "50%",
            background: T.badge, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            fontFamily: "'Geist Mono', monospace",
          }}>
            {recipe.syringe_id}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: "'Geist', sans-serif" }}>
              {recipe.title}
            </div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "'Geist Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 1 }}>
              {recipe.label}
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: T.border, margin: "0 0 14px" }} />

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
            color: T.muted, marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>
            Ingredients
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ fontSize: 13, color: T.ink, lineHeight: 1.7, fontFamily: "'Geist', sans-serif" }}>
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {recipe.instructions.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
              color: T.muted, marginBottom: 6, fontFamily: "'Geist Mono', monospace" }}>
              Preparation
            </div>
            <ol style={{ margin: 0, padding: "0 0 0 16px" }}>
              {recipe.instructions.map((step, i) => (
                <li key={i} style={{ fontSize: 13, color: T.ink, lineHeight: 1.7, fontFamily: "'Geist', sans-serif" }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape preview — 3 AI-generated variants fetched from /api/silhouettes
// ─────────────────────────────────────────────────────────────────────────────

type ShapeVariant = { label: string; description: string; b64: string | null };

function ThumbSkeleton() {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 6,
      background: `linear-gradient(90deg, ${T.border} 25%, rgba(26,20,16,0.06) 50%, ${T.border} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease infinite",
    }} />
  );
}

function ContourPreviewV2({ defaultB64, shapeName }: { defaultB64: string | null; shapeName: string }) {
  const [selected, setSelected] = useState(0);
  const [variants, setVariants] = useState<ShapeVariant[]>([
    { label: "Classic",    description: "Standard form",   b64: defaultB64 },
    { label: "Rounded",    description: "Soft & plump",    b64: null },
    { label: "Geometric",  description: "Angular & bold",  b64: null },
  ]);
  const [loading, setLoading] = useState(true);

  const formattedName = shapeName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) + " Form";

  useEffect(() => {
    if (!shapeName) { setLoading(false); return; }
    setLoading(true);
    runSilhouettes(shapeName)
      .then(({ variants: fetched }) => {
        setVariants(fetched.map((v) => ({ label: v.label, description: v.description, b64: v.b64 })));
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setLoading(false));
  }, [shapeName]);

  const active = variants[selected];
  const activeSrc = active?.b64 ? `data:image/png;base64,${active.b64}` : null;

  return (
    <div style={{
      background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16,
      padding: 16, display: "flex", flexDirection: "column", gap: 10,
      height: "100%", boxSizing: "border-box",
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: "'Geist', sans-serif" }}>
          Shape Preview
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2,
          fontFamily: "'Geist Mono', monospace", letterSpacing: "0.04em" }}>
          {formattedName}{active ? ` · ${active.label}` : ""}
        </div>
      </div>

      {/* Main image */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", borderRadius: 10, background: T.cream, padding: 8,
      }}>
        {activeSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeSrc}
            alt={`Food silhouette — ${active?.label}`}
            style={{ width: "100%", maxHeight: 180, objectFit: "contain", imageRendering: "pixelated", transition: "opacity 0.2s" }}
          />
        ) : (
          <div style={{
            width: "100%", height: 160,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 8, color: T.muted,
          }}>
            {loading ? (
              <div style={{
                width: 80, height: 80, borderRadius: 8,
                background: `linear-gradient(90deg, ${T.border} 25%, rgba(26,20,16,0.06) 50%, ${T.border} 75%)`,
                backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite",
              }} />
            ) : (
              <>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <ellipse cx="12" cy="14" rx="7" ry="6" /><circle cx="12" cy="7" r="3" />
                </svg>
                <span style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>No shape</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail row */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {variants.map((v, idx) => (
          <button key={idx} onClick={() => v.b64 && setSelected(idx)}
            title={v.description}
            style={{
              width: 72, height: 72, borderRadius: 10,
              cursor: v.b64 ? "pointer" : "default",
              border: selected === idx ? `2px solid ${T.forest}` : `1.5px solid ${T.border}`,
              background: T.cream,
              padding: 6, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
              transition: "border 0.15s",
              overflow: "hidden",
            }}>
            {v.b64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${v.b64}`} alt={v.label}
                style={{ width: 40, height: 40, objectFit: "contain", imageRendering: "pixelated" }} />
            ) : (
              <ThumbSkeleton />
            )}
            <span style={{
              fontSize: 9,
              color: selected === idx ? T.forest : T.muted,
              fontWeight: selected === idx ? 700 : 400,
              fontFamily: "'Geist Mono', monospace", letterSpacing: "0.04em",
            }}>
              {v.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type ReviseKind = "recipe" | "shape";

export function Step5ChefV2() {
  const {
    dietitianOutput, chefOutput, prompt, parsedPrompt,
    getSelectedProfile, setParsedPrompt, setChefOutput,
    setEngineerOutput, setStepLoading, setStepError,
    stepLoading, stepError, appendLog, goToStep,
  } = useWizardStore();

  const profile = getSelectedProfile();
  const [showRevise, setShowRevise] = useState<ReviseKind | null>(null);

  const isLoading = stepLoading.chef || stepLoading.engineer;
  const error = stepError.engineer;

  async function handleConfirm() {
    if (!chefOutput) return;
    setStepLoading("engineer", true);
    setStepError("engineer", null);
    const t0 = Date.now();
    try {
      const result = await runEngineer(prompt, chefOutput, profile?.age ?? 0, parsedPrompt?.meal_type ?? "");
      appendLog({ stage: "engineer",
        request: { prompt, chef_output: chefOutput },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0, duration_ms: Date.now() - t0 });
      setEngineerOutput(result);
      goToStep(6);
    } catch (err) {
      setStepError("engineer", err instanceof Error ? err.message : "Failed to run engineer.");
    } finally {
      setStepLoading("engineer", false);
    }
  }

  async function handleRevisePrompt(revision: string) {
    if (!dietitianOutput) return;
    setStepLoading("chef", true);
    setStepError("chef", null);
    const tag = showRevise === "shape" ? "[Shape revision]" : "[Recipe revision]";
    const revisedPrompt = `${prompt}\n\n${tag}: ${revision}`;
    const t0 = Date.now();
    try {
      const parsed = await runParse(revisedPrompt);
      setParsedPrompt(parsed);
      const result = await runChef(
        dietitianOutput.nutrition_targets, dietitianOutput.allergens,
        profile?.age ?? 0, profile?.sex ?? "", profile?.dietaryPreferences ?? [],
        parsed.shape, parsed.meal_type, parsed.ingredients, parsed.menu
      );
      appendLog({ stage: "chef",
        request: { prompt: revisedPrompt, nutrition_targets: dietitianOutput.nutrition_targets },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0, duration_ms: Date.now() - t0 });
      setChefOutput(result);
      setShowRevise(null);
    } catch (err) {
      setStepError("chef", err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setStepLoading("chef", false);
    }
  }

  // Manual slider overrides: build a descriptive prompt and route through AI
  async function handleReviseManual(overrides: Record<string, number>) {
    if (showRevise === "recipe") {
      const parts: string[] = [];
      if (overrides.calories !== undefined) parts.push(`${overrides.calories} kcal`);
      if (overrides.protein !== undefined) parts.push(`${overrides.protein}g protein`);
      if (overrides.sugar !== undefined) parts.push(`max ${overrides.sugar}g sugar`);
      await handleRevisePrompt(`Adjust the recipe to target: ${parts.join(", ")}.`);
    } else if (showRevise === "shape") {
      const scale = overrides.scale ?? 1;
      const desc = scale < 1 ? "smaller" : scale > 1 ? "larger" : "the same size";
      await handleRevisePrompt(`Adjust the printed shape to be ${desc} (scale ${scale}x).`);
    }
  }

  // Derive slider fields from current chef output
  const recipeSliders = chefOutput?.nutrition_facts ? [
    { key: "calories", label: "Calories", min: 50, max: 500, step: 5,
      value: Math.round(chefOutput.nutrition_facts.calories ?? 150), unit: "kcal" },
    { key: "protein", label: "Protein", min: 0, max: 40, step: 0.5,
      value: parseFloat((chefOutput.nutrition_facts.protein_g ?? 5).toFixed(1)), unit: "g" },
    { key: "sugar", label: "Sugar", min: 0, max: 30, step: 0.5,
      value: parseFloat((chefOutput.nutrition_facts.total_sugars_g ?? 3).toFixed(1)), unit: "g" },
  ] : [];

  const shapeSliders = [
    { key: "scale", label: "Scale", min: 0.5, max: 2.0, step: 0.1, value: 1.0, unit: "×" },
  ];

  if (!chefOutput && stepLoading.chef) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label="Designing your recipe..." />
      </div>
    );
  }
  if (!chefOutput) return null;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } } @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden",
        background: "var(--bg)" }}>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "32px 28px",
          maxWidth: 1240, margin: "0 auto", width: "100%",
          display: "flex", flexDirection: "column", gap: 24,
          boxSizing: "border-box",
        }}>

          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{
              margin: 0, fontSize: 32,
              fontFamily: "'Instrument Serif', serif",
              fontWeight: 400, color: T.ink,
              letterSpacing: "-0.01em",
            }}>
              {chefOutput.menu_name}
            </h2>
            <BookmarkIcon />
          </div>

          {/* 4-column row */}
          <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
            {/* Recipe cards */}
            <div style={{
              flex: 1, minWidth: 0, display: "grid",
              gridTemplateColumns: `repeat(${Math.min(chefOutput.syringe_recipes.length, 2)}, minmax(0, 1fr))`,
              gap: 16,
            }}>
              {chefOutput.syringe_recipes.map((r) => (
                <SyringeRecipeCardV2 key={r.syringe_id} recipe={r} />
              ))}
            </div>

            {/* Shape preview */}
            <div style={{ flexShrink: 0, width: 260, display: "flex" }}>
              <ContourPreviewV2
                defaultB64={chefOutput.silhouette_image_b64}
                shapeName={parsedPrompt?.shape ?? ""}
              />
            </div>

            {/* Nutrition facts */}
            {chefOutput.nutrition_facts && (
              <div style={{ flexShrink: 0, display: "flex" }}>
                <NutritionFactsTable facts={chefOutput.nutrition_facts} />
              </div>
            )}
          </div>

          {/* Post-processing */}
          {chefOutput.post_processing?.length > 0 && (
            <div style={{
              padding: "14px 18px", borderRadius: 14,
              background: T.card, border: `1.5px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: T.muted, marginBottom: 6,
                fontFamily: "'Geist Mono', monospace" }}>
                After printing
              </div>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.7,
                fontFamily: "'Geist', sans-serif" }}>
                {chefOutput.post_processing[0]}
              </div>
            </div>
          )}

          {/* KB chunks */}
          {chefOutput.retrieved_chunks && chefOutput.retrieved_chunks.length > 0 && (
            <details>
              <summary style={{
                cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.muted,
                userSelect: "none", marginBottom: 8,
                fontFamily: "'Geist Mono', monospace",
              }}>
                Retrieved KB Chunks ({chefOutput.retrieved_chunks.length})
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {chefOutput.retrieved_chunks.map((chunk, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: T.card, border: `1.5px solid ${T.border}`,
                    fontSize: 12, color: T.ink, lineHeight: 1.6,
                    fontFamily: "'Geist', sans-serif",
                  }}>
                    <div style={{ fontWeight: 600, color: T.muted, marginBottom: 4, fontSize: 11,
                      fontFamily: "'Geist Mono', monospace" }}>
                      score: {chunk.score.toFixed(4)}
                      {chunk.metadata?.source ? ` · ${chunk.metadata.source}` : ""}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{chunk.content}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Engineer error */}
          {error && (
            <div style={{
              padding: "12px 16px", borderRadius: 10,
              background: T.dangerBg, border: `1px solid #fcc`,
              color: T.danger, fontSize: 13, fontFamily: "'Geist', sans-serif",
            }}>
              {error}
            </div>
          )}

          {/* ── Inline RevisePanel (replaces modal overlay) ── */}
          {showRevise && (
            <div style={{ animation: "fadeUp 0.2s ease" }}>
              <RevisePanel
                onRevisePrompt={handleRevisePrompt}
                onReviseManual={handleReviseManual}
                sliderFields={showRevise === "recipe" ? recipeSliders : shapeSliders}
                loading={stepLoading.chef}
                error={stepError.chef}
                onCancel={() => { setShowRevise(null); setStepError("chef", null); }}
              />
            </div>
          )}
        </div>

        {/* Bottom bar — hidden while RevisePanel is open (matches Step 4 pattern) */}
        {!showRevise && (
          <div style={{
            flexShrink: 0,
            background: T.card,
            borderTop: `1.5px solid ${T.border}`,
            padding: "14px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowRevise("recipe")}
                disabled={isLoading}
              >
                Recipe feedback
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowRevise("shape")}
                disabled={isLoading}
              >
                Shape feedback
              </Button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif" }}>
                Review the recipe, then confirm to generate print instructions.
              </p>
              <Button
                variant="primary"
                size="md"
                loading={stepLoading.engineer}
                disabled={isLoading}
                onClick={handleConfirm}
                style={{
                  background: isLoading ? undefined : T.forest,
                  borderColor: isLoading ? undefined : T.forest,
                  color: isLoading ? undefined : T.forestInk,
                  borderRadius: 12,
                  fontWeight: 600,
                  padding: "11px 24px",
                }}
              >
                {stepLoading.engineer ? "Generating…" : "Confirm →"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
