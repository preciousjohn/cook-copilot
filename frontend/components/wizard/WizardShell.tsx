"use client";

import React, { useEffect, useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { Step1Landing } from "./Step1Landing";
import { Step2Profile } from "./Step2Profile";
import { Step3Prompt } from "./Step3Prompt";
import { Step4Dietitian } from "./Step4Dietitian";
import { Step5Chef } from "./Step5Chef";
import { Step6Engineer } from "./Step6Engineer";

// ─────────────────────────────────────────────────────────────────────────────
// WizardShell — top-level wizard container
//
// Manages theme switching between landing (dark) and app (light) modes, and
// renders the correct step component based on currentStep.
// ─────────────────────────────────────────────────────────────────────────────

// Step labels shown in the header progress bar (Steps 2-6 only)
const STEP_LABELS: Record<number, string> = {
  2: "Profile",
  3: "Prompt",
  4: "Nutrition",
  5: "Recipe",
  6: "G-code",
};

const HEADER_HEIGHT = 72;
const TRANSITION_MS = 900;

export function WizardShell() {
  const { currentStep, goToStep, startOver, dietitianOutput, chefOutput, engineerOutput } = useWizardStore();

  // A step is "accessible" (clickable in header) if we've passed it OR it has saved output
  function getStepState(step: number): { isDone: boolean; isClickable: boolean } {
    const hasOutput =
      step === 4 ? dietitianOutput !== null :
      step === 5 ? chefOutput !== null :
      step === 6 ? engineerOutput !== null :
      false;
    const isDone = currentStep > step || hasOutput;
    const isClickable = isDone && currentStep !== step;
    return { isDone, isClickable };
  }

  // Landing overlay state — controls the slide-up exit animation
  const [landingVisible, setLandingVisible] = useState(() => currentStep === 1);
  const [landingExiting, setLandingExiting] = useState(false);

  // Re-show landing instantly when navigating back to step 1
  useEffect(() => {
    if (currentStep === 1) {
      setLandingVisible(true);
      setLandingExiting(false);
    }
  }, [currentStep]);

  // ── Theme switching ──────────────────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    // Use app theme as soon as the exit animation begins so underlying content looks right
    html.setAttribute("data-theme", currentStep === 1 && !landingExiting ? "landing" : "app");
  }, [currentStep, landingExiting]);

  // ── Landing "Begin" handler — advances step and starts slide-up animation ────
  function handleEnter() {
    goToStep(2); // render Step2Profile underneath immediately
    setLandingExiting(true);
    setTimeout(() => {
      setLandingVisible(false);
      setLandingExiting(false);
    }, TRANSITION_MS);
  }

  // ── Steps 2-6: app chrome ─────────────────────────────────────────────────────
  return (
    <div style={{ height: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header — always rendered, stays dark like landing for visual continuity */}
      <header
        style={{
          zIndex: 100,
          flexShrink: 0,
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--header-border)",
          padding: "0 32px",
          height: `${HEADER_HEIGHT}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => goToStep(1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--header-fg)",
            letterSpacing: "-0.02em",
            padding: 0,
          }}
        >
          CookCopilot
        </button>

        {/* Step progress */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[2, 3, 4, 5, 6].map((step) => {
            const { isDone, isClickable } = getStepState(step);
            const isActive = currentStep === step;
            return (
              <React.Fragment key={step}>
                <button
                  onClick={() => isClickable ? goToStep(step as any) : undefined}
                  disabled={!isClickable}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    background: "none",
                    border: "none",
                    cursor: isClickable ? "pointer" : "default",
                    borderRadius: "6px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => isClickable && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                >
                  {/* Step number dot */}
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: isActive ? "var(--header-fg)" : isDone ? "rgba(240,240,240,0.3)" : "rgba(255,255,255,0.1)",
                      color: isActive ? "var(--header-bg)" : isDone ? "var(--header-bg)" : "var(--header-fg2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    {isDone ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      step - 1
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: isActive ? "var(--header-fg)" : "var(--header-fg2)",
                      fontWeight: isActive ? 600 : 400,
                      display: "inline",
                    }}
                  >
                    {STEP_LABELS[step]}
                  </span>
                </button>
                {step < 6 && (
                  <span
                    style={{
                      width: "16px",
                      height: "1px",
                      background: currentStep > step ? "rgba(240,240,240,0.3)" : "rgba(255,255,255,0.1)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {currentStep > 2 && (
            <button
              onClick={startOver}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--header-fg2)",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              Start over
            </button>
          )}
          {/* Hidden settings link — visible as small gear icon */}
          <a
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              color: "var(--header-fg2)",
              textDecoration: "none",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--header-fg)";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--header-fg2)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            title="Researcher Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 1h4M7 1v5L3.5 13.5h9L9 6V1"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="6.5" cy="11" r="0.8" fill="currentColor" />
              <circle cx="9.2" cy="9.8" r="0.55" fill="currentColor" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {currentStep === 2 && <Step2Profile />}
        {currentStep === 3 && <Step3Prompt />}
        {currentStep === 4 && <Step4Dietitian />}
        {currentStep === 5 && <Step5Chef />}
        {currentStep === 6 && <Step6Engineer />}
      </main>

      {/* Landing overlay — dissolves away on "Begin" */}
      {landingVisible && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            opacity: landingExiting ? 0 : 1,
            transform: landingExiting ? "translateY(-48px) scale(1.03)" : "translateY(0) scale(1)",
            transition: landingExiting
              ? `opacity ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.6, 1), transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.6, 1)`
              : "none",
          }}
        >
          <Step1Landing onEnter={handleEnter} />
        </div>
      )}
    </div>
  );
}
