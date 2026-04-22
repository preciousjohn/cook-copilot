"use client";

import React, { useRef, useEffect, useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { runParse, runDietitian } from "../../lib/api";
import { Button } from "../ui/Button";

const EXAMPLES = [
  "Crispy chickpea chips shaped like little stars",
  "A soft oat cookie with honey and cinnamon for breakfast",
  "Savory pasta bites with tomato and basil, high protein",
  "A colorful fruit-flavored cube for an afternoon snack",
  "Dark chocolate and nut energy bar, low sugar",
  "Fluffy pancake rounds with berry filling",
];

const PRINT_MSGS = [
  "Analyzing your food idea…",
  "Checking nutrition guidelines…",
  "Building your meal profile…",
  "Crunching the numbers…",
  "Almost ready…",
];

export function Step3Prompt() {
  const {
    getSelectedProfile,
    prompt, setPrompt,
    setParsedPrompt, setDietitianOutput,
    setStepLoading, setStepError,
    stepLoading, stepError,
    appendLog, goToStep,
  } = useWizardStore();

  const profile = getSelectedProfile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  }, [prompt]);

  async function handleSubmit() {
    if (!prompt.trim() || !profile) return;
    setStepLoading("dietitian", true);
    setStepError("dietitian", null);
    const t0 = Date.now();
    try {
      const parsed = await runParse(prompt);
      setParsedPrompt(parsed);
      const result = await runDietitian(profile, parsed.meal_type);
      appendLog({ stage: "dietitian", request: { profile }, response: result as unknown as Record<string, unknown>, timestamp: t0, duration_ms: Date.now() - t0 });
      setDietitianOutput(result);
      goToStep(4);
    } catch (err) {
      setStepError("dietitian", err instanceof Error ? err.message : "Failed to run dietitian.");
    } finally {
      setStepLoading("dietitian", false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  }

  function handleExampleClick(ex: string) {
    setSelectedExample(ex);
    setPrompt(ex);
    textareaRef.current?.focus();
  }

  const isLoading = stepLoading.dietitian;
  const error = stepError.dietitian;
  const canSubmit = prompt.trim().length > 0 && !isLoading;
  const name = profile?.profileName ?? "you";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      `}</style>

      {isLoading && (
        <div style={{ position: "fixed", top: 72, left: 0, right: 0, height: 3, zIndex: 50, background: "linear-gradient(90deg, transparent, rgb(21,60,54), transparent)", backgroundSize: "400px 100%", animation: "shimmer 1.2s ease infinite" }} />
      )}

      <div style={{ flex: 1, background: "rgb(244, 244, 232)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", overflowY: "auto", fontFamily: "'Geist', system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>

          {/* Greeting */}
          <div style={{ marginBottom: 32, animation: "fadeUp 0.35s ease both" }}>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 46px)", fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: "rgb(24, 29, 41)", margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Let&apos;s print food for{" "}
              <em style={{ color: "rgb(21, 60, 54)", fontStyle: "italic" }}>{name}</em>!
            </h1>
            <p style={{ fontSize: 16, color: "#6B5D50", margin: 0, lineHeight: 1.5 }}>
              Describe what you&apos;d like — our AI will design and fabricate it for you.
            </p>
          </div>

          {/* Textarea card */}
          <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1410", borderRadius: 16, overflow: "hidden", opacity: isLoading ? 0.75 : 1, transition: "opacity .2s", animation: "fadeUp 0.35s 0.08s ease both" }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setSelectedExample(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Describe your food idea… e.g. crispy chickpea chips shaped like little stars"
              disabled={isLoading}
              rows={4}
              style={{ width: "100%", padding: "18px 20px 10px", fontSize: 16, lineHeight: 1.6, border: "none", background: "transparent", color: "rgb(24, 29, 41)", resize: "none", outline: "none", fontFamily: "'Geist', sans-serif", minHeight: 120, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 14px 12px" }}>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={isLoading}
                loadingMessages={PRINT_MSGS}
                style={{
                  borderRadius: 999,
                  background: canSubmit ? "rgb(21, 60, 54)" : "transparent",
                  color: canSubmit ? "#FFF4E6" : "#6B5D50",
                  border: `1.5px solid ${canSubmit ? "rgb(21,60,54)" : "#6B5D5050"}`,
                  fontSize: 14, fontWeight: 600,
                  fontFamily: "'Geist', sans-serif",
                }}
              >
                Print →
              </Button>
            </div>
          </div>

          {/* Example prompts */}
          <div style={{ marginTop: 14, animation: "fadeUp 0.35s 0.16s ease both" }}>
            <p style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "#6B5D50", margin: "0 0 9px" }}>
              Try an example
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXAMPLES.map((ex) => {
                const isActive = selectedExample === ex;
                return (
                  <button
                    key={ex}
                    onClick={() => handleExampleClick(ex)}
                    disabled={isLoading}
                    style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${isActive ? "rgb(21,60,54)" : "#1A141028"}`, background: isActive ? "rgb(21, 60, 54)" : "transparent", color: isActive ? "#FFF4E6" : "#1A1410", fontSize: 13, fontFamily: "'Geist', sans-serif", cursor: isLoading ? "not-allowed" : "pointer", transition: "all .12s", textAlign: "left" }}
                    onMouseEnter={(e) => { if (!isActive && !isLoading) { (e.currentTarget as HTMLElement).style.borderColor = "rgb(21,60,54)"; (e.currentTarget as HTMLElement).style.background = "rgba(21,60,54,0.06)"; } }}
                    onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.borderColor = "#1A141028"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
                  >
                    {ex}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontFamily: "'Geist', sans-serif" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
