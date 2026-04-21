"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "../../store/wizardStore";
import { Step3Prompt } from "./Step3Prompt";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { Step4Dietitian } from "./Step4Dietitian";
import { Step5ChefV2 as Step5Chef } from "./Step5ChefV2";
import { Step6Engineer } from "./Step6Engineer";

const STEP_LABELS: Record<number, string> = {
  3: "Prompt",
  4: "Nutrition",
  5: "Recipe",
  6: "G-code",
};

const HEADER_HEIGHT = 72;

export function WizardShell() {
  const router = useRouter();
  const { currentStep, goToStep, startOver, dietitianOutput, chefOutput, engineerOutput } = useWizardStore();

  // If somehow we land on step 1 or 2, bump to 3
  useEffect(() => {
    if (currentStep < 3) goToStep(3);
  }, [currentStep, goToStep]);

  // Always use app theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "app");
  }, []);

  function getStepState(step: number) {
    const hasOutput =
      step === 4 ? dietitianOutput !== null :
      step === 5 ? chefOutput !== null :
      step === 6 ? engineerOutput !== null : false;
    const isDone = currentStep > step || hasOutput;
    return { isDone, isClickable: isDone && currentStep !== step };
  }

  return (
    <div style={{ height: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
        {/* Logo — back to landing */}
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" style={{ width: 30, height: 30 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--header-fg)", letterSpacing: "-0.02em" }}>
            CookCopilot
          </span>
        </button>

        {/* Step progress — steps 3-6 */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[3, 4, 5, 6].map((step) => {
            const { isDone, isClickable } = getStepState(step);
            const isActive = currentStep === step;
            return (
              <React.Fragment key={step}>
                <button
                  onClick={() => isClickable ? goToStep(step as any) : undefined}
                  disabled={!isClickable}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "4px 8px", background: "none", border: "none",
                    cursor: isClickable ? "pointer" : "default",
                    borderRadius: "6px", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => isClickable && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: isActive ? "var(--header-fg)" : isDone ? "rgba(240,240,240,0.3)" : "rgba(255,255,255,0.1)",
                    color: isActive ? "var(--header-bg)" : "var(--header-fg2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>
                    {isDone && !isActive ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : step - 2}
                  </span>
                  <span style={{ fontSize: 12, color: isActive ? "var(--header-fg)" : "var(--header-fg2)", fontWeight: isActive ? 600 : 400 }}>
                    {STEP_LABELS[step]}
                  </span>
                </button>
                {step < 6 && (
                  <span style={{ width: 16, height: 1, background: currentStep > step ? "rgba(240,240,240,0.3)" : "rgba(255,255,255,0.1)", flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {currentStep > 3 && (
            <button
              onClick={startOver}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer", fontSize: 12, fontWeight: 500,
                color: "var(--header-fg)",
                padding: "5px 12px", borderRadius: 999,
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"}
            >
              Start over
            </button>
          )}
          <ProfileSwitcher />
          <a
            href="/settings"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, color: "var(--header-fg2)", textDecoration: "none", transition: "color 0.15s, background 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--header-fg)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--header-fg2)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 1h4M7 1v5L3.5 13.5h9L9 6V1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6.5" cy="11" r="0.8" fill="currentColor" />
              <circle cx="9.2" cy="9.8" r="0.55" fill="currentColor" />
            </svg>
          </a>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {currentStep === 3 && <Step3Prompt />}
        {currentStep === 4 && <Step4Dietitian />}
        {currentStep === 5 && <Step5Chef />}
        {currentStep === 6 && <Step6Engineer />}
      </main>
    </div>
  );
}
