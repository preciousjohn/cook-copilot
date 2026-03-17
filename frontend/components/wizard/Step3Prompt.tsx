"use client";

import React, { useRef, useEffect } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { Button } from "../ui/Button";
import { runParse, runDietitian } from "../../lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Prompt Input
//
// Personalized greeting (uses selected profile name), a clean free-form
// textarea describing the desired food, and a "Cook →" CTA that kicks off
// the Dietitian AI call and advances to Step 4.
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_EXAMPLES = [
  "A small protein-packed snack with dark chocolate and nuts...",
  "A savory pasta-shaped bite with tomato and basil...",
  "A colorful fruit-flavored cube for my afternoon snack...",
  "A soft cookie with oats and honey for breakfast...",
];

export function Step3Prompt() {
  const {
    getSelectedProfile,
    prompt,
    setPrompt,
    setParsedPrompt,
    setDietitianOutput,
    setStepLoading,
    setStepError,
    stepLoading,
    stepError,
    appendLog,
    goToStep,
  } = useWizardStore();

  const profile = getSelectedProfile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Pick a stable placeholder based on profile id (consistent within session)
  const placeholderIndex = profile
    ? profile.id.charCodeAt(0) % PLACEHOLDER_EXAMPLES.length
    : 0;
  const placeholder = PLACEHOLDER_EXAMPLES[placeholderIndex];

  async function handleCook() {
    if (!prompt.trim()) return;
    if (!profile) return;

    setStepLoading("dietitian", true);
    setStepError("dietitian", null);

    const t0 = Date.now();
    try {
      // 1. Parse prompt once — results held in store, passed directly to chef later
      const parsed = await runParse(prompt);
      setParsedPrompt(parsed);

      // 2. Run dietitian with pre-parsed meal_type (no re-parsing inside)
      const result = await runDietitian(profile, parsed.meal_type);
      appendLog({
        stage: "dietitian",
        request: { profile },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0,
        duration_ms: Date.now() - t0,
      });
      setDietitianOutput(result);
      goToStep(4);
    } catch (err) {
      setStepError("dietitian", err instanceof Error ? err.message : "Failed to run dietitian.");
    } finally {
      setStepLoading("dietitian", false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCook();
    }
  }

  const isLoading = stepLoading.dietitian;
  const error = stepError.dietitian;
  const canCook = prompt.trim().length > 0 && !isLoading;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        maxWidth: "680px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Greeting */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "40px",
          animation: "fadeUp 0.4s ease both",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 40px)",
            fontWeight: 700,
            color: "var(--fg)",
            margin: "0 0 8px",
            letterSpacing: "-0.03em",
          }}
        >
          Let&apos;s print food for {profile?.profileName ?? "you"}!
        </h1>
        <p style={{ fontSize: "16px", color: "var(--fg3)", margin: 0 }}>
          Describe what you&apos;d like, and our AI will design it for you.
        </p>
      </div>

      {/* Textarea */}
      <div
        style={{
          width: "100%",
          animation: "fadeUp 0.4s 0.1s ease both",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={5}
          style={{
            width: "100%",
            padding: "16px 18px",
            fontSize: "16px",
            lineHeight: "1.6",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--fg)",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--fg3)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          disabled={isLoading}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "12px",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--fg3)" }}>
            {prompt.length > 0 ? `${prompt.length} chars` : "⌘ + Enter to print"}
          </span>
          <Button
            variant="primary"
            size="lg"
            loading={isLoading}
            disabled={!canCook}
            onClick={handleCook}
          >
            {isLoading ? "Analyzing..." : "Print →"}
          </Button>
        </div>
      </div>

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
            width: "100%",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading hint */}
      {isLoading && (
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            animation: "pulse 1.5s ease infinite",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--fg3)", margin: 0 }}>
            Calculating nutrition targets for {profile?.profileName}...
          </p>
        </div>
      )}
    </div>
  );
}
