"use client";

import React, { useState } from "react";
import { Button } from "./Button";

interface SliderField {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
}

interface RevisePanelProps {
  /** Called when user submits a prompt-based revision */
  onRevisePrompt: (text: string) => void;
  /** Called when user applies manual slider overrides */
  onReviseManual?: (overrides: Record<string, number>) => void;
  /** Slider fields for Manual tab (optional) */
  sliderFields?: SliderField[];
  loading?: boolean;
  /** Error message to display inside the panel (e.g. API failure) */
  error?: string | null;
  onCancel: () => void;
}

export function RevisePanel({
  onRevisePrompt,
  onReviseManual,
  sliderFields,
  loading,
  error,
  onCancel,
}: RevisePanelProps) {
  const [tab, setTab] = useState<"prompt" | "manual">("prompt");
  const [text, setText] = useState("");
  const [sliderValues, setSliderValues] = useState<Record<string, number>>(
    () => Object.fromEntries((sliderFields ?? []).map((f) => [f.key, f.value]))
  );

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    border: "none",
    borderBottom: active ? "2px solid var(--fg)" : "2px solid transparent",
    background: "transparent",
    color: active ? "var(--fg)" : "var(--fg3)",
    cursor: "pointer",
    transition: "color 0.15s",
  });

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        overflow: "hidden",
        animation: "fadeUp 0.2s ease",
      }}
    >
      {/* Tab header */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          padding: "0 16px",
        }}
      >
        <button style={tabStyle(tab === "prompt")} onClick={() => setTab("prompt")}>
          Prompt
        </button>
        {sliderFields && sliderFields.length > 0 && (
          <button style={tabStyle(tab === "manual")} onClick={() => setTab("manual")}>
            Manual
          </button>
        )}
      </div>

      <div style={{ padding: "20px" }}>
        {tab === "prompt" ? (
          <>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--fg2)" }}>
              Describe what you want to change:
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "Lower sugar to max 8g, keep protein ratio high"'
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "14px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg2)",
                color: "var(--fg)",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            {error && (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#c0392b" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => text.trim() && onRevisePrompt(text.trim())}
                disabled={!text.trim() || loading}
                loading={loading}
              >
                Revise
              </Button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--fg2)" }}>
              Adjust values directly:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {sliderFields?.map((field) => (
                <div key={field.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "var(--fg2)" }}>{field.label}</span>
                    <span style={{ fontWeight: 600, color: "var(--fg)" }}>
                      {sliderValues[field.key]}
                      <span style={{ color: "var(--fg3)", fontWeight: 400 }}>
                        {" "}{field.unit}
                      </span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={sliderValues[field.key]}
                    onChange={(e) =>
                      setSliderValues((prev) => ({
                        ...prev,
                        [field.key]: parseFloat(e.target.value),
                      }))
                    }
                    style={{ width: "100%", accentColor: "var(--fg)" }}
                  />
                </div>
              ))}
            </div>
            {error && (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#c0392b" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onReviseManual?.(sliderValues)}
                disabled={loading}
                loading={loading}
              >
                Apply
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
