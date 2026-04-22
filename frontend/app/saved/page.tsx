"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedRecipes, deleteSavedRecipe, type SavedRecipe } from "../../lib/savedRecipes";
import type { SyringeRecipe } from "../../lib/types";

const T = {
  ink:    "#1A1410",
  muted:  "#6B5D50",
  subtle: "#9B8E85",
  border: "rgba(26,20,16,0.1)",
  card:   "#FFFFFF",
  forest: "rgb(21,60,54)",
  forestInk: "#FFF4E6",
  cream:  "#F7F5F0",
  danger: "#c0392b",
  dangerBg: "#FFF0EE",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ── Syringe card (in modal) ────────────────────────────────────────────────────

function SyringeCard({ recipe }: { recipe: SyringeRecipe }) {
  return (
    <div style={{
      background: T.cream, border: `1.5px solid ${T.border}`,
      borderRadius: 14, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "#354f22", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          fontFamily: "'Geist Mono', monospace",
        }}>
          {recipe.syringe_id}
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: "'Geist', sans-serif" }}>
            {recipe.title}
          </div>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: "'Geist Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 1 }}>
            {recipe.label}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: T.border, margin: "0 0 12px" }} />

      <div style={{ marginBottom: recipe.instructions.length > 0 ? 12 : 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
          color: T.muted, marginBottom: 5, fontFamily: "'Geist Mono', monospace" }}>
          Ingredients
        </div>
        <ul style={{ margin: 0, padding: "0 0 0 14px" }}>
          {recipe.ingredients.map((ing, i) => (
            <li key={i} style={{ fontSize: 12, color: T.ink, lineHeight: 1.7, fontFamily: "'Geist', sans-serif" }}>
              {ing}
            </li>
          ))}
        </ul>
      </div>

      {recipe.instructions.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
            color: T.muted, marginBottom: 5, fontFamily: "'Geist Mono', monospace" }}>
            Preparation
          </div>
          <ol style={{ margin: 0, padding: "0 0 0 14px" }}>
            {recipe.instructions.map((step, i) => (
              <li key={i} style={{ fontSize: 12, color: T.ink, lineHeight: 1.7, fontFamily: "'Geist', sans-serif" }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Recipe Detail Modal ────────────────────────────────────────────────────────

function RecipeDetailModal({ recipe, onClose, onDelete }: {
  recipe: SavedRecipe;
  onClose: () => void;
  onDelete: () => void;
}) {
  const nf = recipe.chefOutput.nutrition_facts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(26,20,16,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <style>{`@media print { body > *:not(#recipe-print) { display: none !important; } #recipe-print { display: block !important; } }`}</style>
      <div
        id="recipe-print"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)", background: T.card,
          borderRadius: 20, border: `1.5px solid ${T.border}`,
          boxShadow: "0 16px 60px rgba(0,0,0,0.18)",
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          overflow: "hidden", fontFamily: "'Geist', sans-serif",
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: "22px 24px 18px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            {/* Silhouette */}
            {recipe.chefOutput.silhouette_image_b64 && (
              <div style={{
                width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                background: T.cream, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${recipe.chefOutput.silhouette_image_b64}`}
                  alt=""
                  style={{ width: 40, height: 40, objectFit: "contain", imageRendering: "pixelated" }}
                />
              </div>
            )}

            {/* Title + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{
                  margin: 0, fontSize: 22,
                  fontFamily: "'Instrument Serif', serif",
                  fontWeight: 400, color: T.ink, letterSpacing: "-0.01em",
                }}>
                  {recipe.name}
                </h2>
                {/* Download */}
                <button
                  onClick={() => window.print()}
                  title="Download as PDF"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 999,
                    background: "transparent",
                    border: `1.5px solid ${T.border}`,
                    color: T.muted, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "'Geist', sans-serif",
                    transition: "background .15s, color .15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = T.cream;
                    (e.currentTarget as HTMLElement).style.color = T.ink;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = T.muted;
                  }}
                >
                  <DownloadIcon size={13} />
                  PDF
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.subtle }}>For {recipe.profileName}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D4CFC9", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.subtle }}>
                  {recipe.chefOutput.num_syringes} syringe{recipe.chefOutput.num_syringes !== 1 ? "s" : ""}
                </span>
                {nf && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D4CFC9", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.forest, fontWeight: 500 }}>
                      {Math.round(nf.calories)} kcal
                    </span>
                  </>
                )}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D4CFC9", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.subtle }}>Saved {formatDate(recipe.savedAt)}</span>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                background: "transparent", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.muted, fontSize: 18, lineHeight: 1,
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = T.cream}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Nutrition row */}
          {nf && (
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap",
            }}>
              {[
                { label: "Calories", value: `${Math.round(nf.calories)} kcal` },
                { label: "Protein", value: `${(nf.protein_g ?? 0).toFixed(1)}g` },
                { label: "Carbs", value: `${(nf.total_carbs_g ?? 0).toFixed(1)}g` },
                { label: "Fat", value: `${(nf.total_fat_g ?? 0).toFixed(1)}g` },
                ...(nf.total_sugars_g != null ? [{ label: "Sugar", value: `${nf.total_sugars_g.toFixed(1)}g` }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{
                  flex: "1 1 80px",
                  background: T.cream, border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: "10px 12px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, fontFamily: "'Geist Mono', monospace", marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: "'Geist', sans-serif", letterSpacing: "-0.02em" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Syringe recipe cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(recipe.chefOutput.syringe_recipes.length, 2)}, 1fr)`,
            gap: 12,
          }}>
            {recipe.chefOutput.syringe_recipes.map((r) => (
              <SyringeCard key={r.syringe_id} recipe={r} />
            ))}
          </div>

          {/* Post-processing */}
          {recipe.chefOutput.post_processing?.length > 0 && (
            <div style={{
              padding: "12px 16px", borderRadius: 12,
              background: T.cream, border: `1.5px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
                color: T.muted, marginBottom: 5, fontFamily: "'Geist Mono', monospace" }}>
                After printing
              </div>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.7, fontFamily: "'Geist', sans-serif" }}>
                {recipe.chefOutput.post_processing[0]}
              </div>
            </div>
          )}

          {/* Original prompt */}
          {recipe.prompt && (
            <div style={{
              padding: "12px 16px", borderRadius: 12,
              background: "rgba(21,60,54,0.04)", border: "1px solid rgba(21,60,54,0.1)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
                color: T.forest, marginBottom: 4, fontFamily: "'Geist Mono', monospace", opacity: 0.7 }}>
                Original prompt
              </div>
              <div style={{ fontSize: 13, color: T.muted, fontFamily: "'Geist', sans-serif", fontStyle: "italic" }}>
                "{recipe.prompt}"
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: "14px 24px",
          borderTop: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button
            onClick={onDelete}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              background: "transparent", border: `1px solid ${T.border}`,
              color: T.subtle, fontSize: 13, cursor: "pointer",
              fontFamily: "'Geist', sans-serif",
              transition: "color .15s, background .15s, border-color .15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = T.danger;
              el.style.background = T.dangerBg;
              el.style.borderColor = "#fcc";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = T.subtle;
              el.style.background = "transparent";
              el.style.borderColor = T.border;
            }}
          >
            <TrashIcon />
            Remove from saved
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: T.forest, color: T.forestInk,
              border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Geist', sans-serif",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SavedPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [selected, setSelected] = useState<SavedRecipe | null>(null);

  useEffect(() => {
    setRecipes(getSavedRecipes());
  }, []);

  function handleDelete(id: string) {
    deleteSavedRecipe(id);
    const updated = getSavedRecipes();
    setRecipes(updated);
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#FAFAF8", fontFamily: "'Geist', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{
        background: T.forest, padding: "0 32px", height: 72,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" style={{ width: 30, height: 30 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(240,240,240,0.95)", letterSpacing: "-0.02em" }}>
            CookCopilot
          </span>
        </button>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(240,240,240,0.9)", borderRadius: 999, padding: "0 14px", height: 34,
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.18)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
        >
          ← Back
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={T.forest} stroke={T.forest}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <h1 style={{ margin: 0, fontSize: 26, fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: T.ink }}>
            Saved Recipes
          </h1>
          {recipes.length > 0 && (
            <span style={{
              marginLeft: 4, fontSize: 12, fontWeight: 600, color: T.forest,
              background: "#DFF0E8", border: "1px solid #B2DBBF",
              borderRadius: 999, padding: "2px 10px",
            }}>
              {recipes.length}
            </span>
          )}
        </div>

        {recipes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", color: T.subtle }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4CFC9"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ margin: 0, fontSize: 15, color: T.subtle }}>No saved recipes yet.</p>
            <p style={{ margin: "6px 0 24px", fontSize: 13, color: "#BBAEA5" }}>
              Tap the bookmark icon on any recipe to save it here.
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "10px 20px", borderRadius: 999,
                background: T.forest, color: T.forestInk,
                border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Create a recipe
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setSelected(recipe)}
                style={{
                  background: T.card, border: `1.5px solid ${T.border}`,
                  borderRadius: 16, padding: "18px 20px",
                  display: "flex", alignItems: "flex-start", gap: 16,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "border-color .15s, box-shadow .15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(21,60,54,0.3)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(21,60,54,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = T.border;
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {/* Silhouette thumbnail */}
                <div style={{
                  width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                  background: T.cream,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {recipe.chefOutput.silhouette_image_b64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/png;base64,${recipe.chefOutput.silhouette_image_b64}`}
                      alt=""
                      style={{ width: 44, height: 44, objectFit: "contain", imageRendering: "pixelated" }}
                    />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4CFC9" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4, lineHeight: 1.3 }}>
                    {recipe.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: T.subtle }}>For {recipe.profileName}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D4CFC9", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.subtle }}>
                      {recipe.chefOutput.num_syringes} syringe{recipe.chefOutput.num_syringes !== 1 ? "s" : ""}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D4CFC9", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.subtle }}>{formatDate(recipe.savedAt)}</span>
                    {recipe.chefOutput.nutrition_facts && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D4CFC9", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: T.forest, fontWeight: 500 }}>
                          {Math.round(recipe.chefOutput.nutrition_facts.calories)} kcal
                        </span>
                      </>
                    )}
                  </div>
                  {recipe.chefOutput.syringe_recipes.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {recipe.chefOutput.syringe_recipes.map((r) => (
                        <span key={r.syringe_id} style={{
                          fontSize: 11, padding: "3px 9px", borderRadius: 999,
                          background: T.cream, color: T.muted, fontWeight: 500,
                          border: `1px solid ${T.border}`,
                        }}>
                          {r.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete — stop propagation so it doesn't open modal */}
                <div
                  role="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                  style={{
                    flexShrink: 0, width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "#C9C1BA", borderRadius: 8,
                    transition: "color .15s, background .15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = T.danger;
                    (e.currentTarget as HTMLElement).style.background = T.dangerBg;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#C9C1BA";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <TrashIcon />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Detail modal */}
      {selected && (
        <RecipeDetailModal
          recipe={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected.id)}
        />
      )}
    </div>
  );
}
