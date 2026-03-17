"use client";

import React, { useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { Button } from "../ui/Button";
import { LoadingBlock } from "../ui/Spinner";
import { RevisePanel } from "../ui/RevisePanel";
import { regenerateGCode, runEngineer } from "../../lib/api";
import { formatPrintTime } from "../../lib/formatters";
import { GCodeCanvas, SYRINGE_COLORS } from "../engineer/GCodeCanvas";

// ─────────────────────────────────────────────────────────────────────────────
// Calibration G-code Generator

function generateCalibrationGCode(toolNumber: number, extrusionMultiplier: number, layerHeight: number): string {
  const extrusionValue = (50 * extrusionMultiplier).toFixed(4);
  return `; Calibration Gcode for Tool ${toolNumber} with EM=${extrusionMultiplier.toFixed(4)}, Layer Height=${layerHeight.toFixed(1)}mm
; --------- Start Gcode -------------
if !move.axes[0].homed || !move.axes[1].homed || !move.axes[2].homed || !move.axes[3].homed
    echo "Axes not homed. Start homing."
    G28
else
    echo "All axes already homed."
G21 ; Set units to millimeters
G90 ; Use absolute coordinates
M83 ; Use relative extrusion mode
G92 E0 ; Reset extrusion distance
; -----------------------------------
T${toolNumber} ; Attach tool
; Print a straight line
G1 Z20 F400 ; Secure Z height
G1 X160 Y190 F3000 ; Start point
G1 Z${layerHeight.toFixed(1)} F400
G1 Y240 E${extrusionValue} F300
; --------- End Gcode -------------
G91 ; Use relative coordinates
G1 Z20 F400 ; Move Z up to avoid collision
G90 ; Use absolute coordinates
; -----------------------------------`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calibration Panel

function CalibrationPanel({ numSyringes }: { numSyringes: number }) {
  const [calTool, setCalTool] = useState(0);
  const [calEM, setCalEM] = useState(0.02);
  const [calLH, setCalLH] = useState(1.0);
  const maxTool = Math.max((numSyringes || 1) - 1, 0);

  function downloadCalibration() {
    const gc = generateCalibrationGCode(calTool, calEM, calLH);
    const blob = new Blob([gc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calibration_T${calTool}_EM${calEM.toFixed(4)}_LH${calLH.toFixed(1)}.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const accentColor = SYRINGE_COLORS[calTool % SYRINGE_COLORS.length];
  const numInputStyle: React.CSSProperties = {
    width: 72,
    padding: "5px 6px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Fira Code', Consolas, monospace",
    textAlign: "center",
    background: "var(--bg)",
    color: "var(--fg)",
  };

  return (
    <div style={{ padding: 14, borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, lineHeight: 1.6, color: "var(--fg2)", marginBottom: 10 }}>
        The calibration file prints a 50mm straight line. Adjust the extrusion multiplier and layer height based on the result.
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--fg2)" }}>Syringe</label>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: maxTool + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setCalTool(i)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: calTool === i ? `2px solid ${SYRINGE_COLORS[i]}` : "1px solid var(--border)",
                background: calTool === i ? "var(--card-bg)" : "var(--bg)",
                color: calTool === i ? SYRINGE_COLORS[i] : "var(--fg3)",
              }}
            >
              Syringe {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--fg2)" }}>Extrusion Multiplier</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--fg2)" }}>0.001</span>
          <input type="range" min={0.001} max={1.0} step={0.001} value={calEM} onChange={e => setCalEM(Number(e.target.value))} style={{ flex: 1, accentColor }} />
          <span style={{ fontSize: 10, color: "var(--fg2)" }}>1.00</span>
          <input type="number" min={0.001} max={1.0} step={0.001} value={calEM} onChange={e => { const n = Number(e.target.value); if (n >= 0.001 && n <= 1.0) setCalEM(n); }} style={numInputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--fg2)" }}>Layer Height (mm)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--fg2)" }}>0.5</span>
          <input type="range" min={0.5} max={5.0} step={0.1} value={calLH} onChange={e => setCalLH(Number(e.target.value))} style={{ flex: 1, accentColor }} />
          <span style={{ fontSize: 10, color: "var(--fg2)" }}>5.0</span>
          <input type="number" min={0.5} max={5.0} step={0.1} value={calLH} onChange={e => { const n = Number(e.target.value); if (n >= 0.5 && n <= 5.0) setCalLH(n); }} style={numInputStyle} />
        </div>
      </div>
      <button
        onClick={downloadCalibration}
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: accentColor,
          color: "white",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        ⬇ Download Calibration G-code
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6: Engineer Review
//
// Shows the AI engineer's output: print metrics, GCode panel + 3D viewer,
// extrusion controls. User can Download G-code or Revise (re-run engineer).
// GCodeCanvas lives in components/engineer/GCodeCanvas.tsx.
// ─────────────────────────────────────────────────────────────────────────────

// ── PrintMetrics row ──────────────────────────────────────────────────────────

function MetricTile({ label, value, labelColor }: { label: string; value: string; labelColor?: string }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        padding: "12px 16px",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "10px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: labelColor ?? "var(--fg3)", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--fg)" }}>{value}</div>
    </div>
  );
}

// ── ExtrusionControls ─────────────────────────────────────────────────────────

function ExtrusionControls({
  emValues,
  lhValue,
  onChange,
  onLhChange,
  onRegenerate,
  regenerating,
}: {
  emValues: number[];
  lhValue: number;
  onChange: (values: number[]) => void;
  onLhChange: (v: number) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "16px 20px",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "flex-end",
      }}
    >
      {/* Per-syringe EM sliders */}
      {emValues.map((emVal, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "120px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: SYRINGE_COLORS[i % 4],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "11px", fontWeight: 700, color: SYRINGE_COLORS[i % 4] }}>Syringe {i + 1}</span>
            <span style={{ fontSize: "10px", color: "var(--fg3)" }}>Extrusion Multiplier</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="range"
              min={0.001}
              max={2.0}
              step={0.001}
              value={emVal}
              onChange={(e) => {
                const n = Number(e.target.value);
                onChange(emValues.map((x, j) => (j === i ? n : x)));
              }}
              style={{ width: "80px", accentColor: SYRINGE_COLORS[i % 4] }}
            />
            <input
              type="number"
              min={0.001}
              max={2.0}
              step={0.001}
              value={emVal}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 0.001 && n <= 2.0) onChange(emValues.map((x, j) => (j === i ? n : x)));
              }}
              style={{
                width: "72px",
                padding: "3px 6px",
                borderRadius: "6px",
                border: `1px solid ${SYRINGE_COLORS[i % 4]}60`,
                background: "var(--bg)",
                color: "var(--fg)",
                fontSize: "11px",
                fontWeight: 700,
                fontFamily: "monospace",
                textAlign: "center",
              }}
            />
          </div>
        </div>
      ))}

      {/* Layer height */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "120px" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg3)" }}>Layer height</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.1}
            value={lhValue}
            onChange={(e) => onLhChange(Number(e.target.value))}
            style={{ width: "80px", accentColor: "var(--fg)" }}
          />
          <input
            type="number"
            min={0.5}
            max={5.0}
            step={0.1}
            value={lhValue}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 0.5 && n <= 5.0) onLhChange(n);
            }}
            style={{
              width: "64px",
              padding: "3px 6px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--fg)",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "monospace",
              textAlign: "center",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--fg3)" }}>mm</span>
        </div>
      </div>

      {/* Regenerate button */}
      <Button
        variant="secondary"
        size="sm"
        loading={regenerating}
        disabled={regenerating}
        onClick={onRegenerate}
        style={{ alignSelf: "flex-end" }}
      >
        {regenerating ? "Regenerating..." : "↻ Regenerate G-code"}
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step6Engineer() {
  const {
    engineerOutput,
    chefOutput,
    prompt,
    parsedPrompt,
    gcode,
    setGcode,
    setEngineerOutput,
    emValues,
    lhValue,
    setEmValues,
    setLhValue,
    setStepLoading,
    setStepError,
    stepLoading,
    stepError,
    appendLog,
    goToStep,
  } = useWizardStore();

  const [showRevise, setShowRevise] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [gcodeVersion, setGcodeVersion] = useState(0);

  const error = stepError.engineer;
  const meta = engineerOutput?.metadata;
  const g = gcode || engineerOutput?.gcode || "";
  const lineCount = g ? g.split("\n").length : 0;

  // ── Download G-code
  function handleDownload() {
    const blob = new Blob([g], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cookpilot.gcode";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Regenerate GCode (EM/LH changed)
  async function handleRegenerate() {
    if (!chefOutput || !engineerOutput?.silhouette_image_b64) return;
    setRegenerating(true);
    try {
      const result = await regenerateGCode({
        syringe_recipes: chefOutput.syringe_recipes,
        silhouette_b64: engineerOutput.silhouette_image_b64,
        em_values: emValues,
        lh: lhValue,
      });
      setGcode(result.gcode);
      setGcodeVersion((v) => v + 1);
    } catch (err) {
      setStepError("engineer", err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setRegenerating(false);
    }
  }

  // ── Revise: re-run engineer with prompt revision
  async function handleRevisePrompt(revision: string) {
    if (!chefOutput) return;
    setStepLoading("engineer", true);
    setStepError("engineer", null);
    const revisedPrompt = `${prompt}\n\n[Revision request]: ${revision}`;
    const t0 = Date.now();
    try {
      const result = await runEngineer(revisedPrompt, chefOutput, 0, parsedPrompt?.meal_type ?? "");
      appendLog({
        stage: "engineer",
        request: { prompt: revisedPrompt, chef_output: chefOutput },
        response: result as unknown as Record<string, unknown>,
        timestamp: t0,
        duration_ms: Date.now() - t0,
      });
      setEngineerOutput(result);
      setGcodeVersion((v) => v + 1);
      setShowRevise(false);
    } catch (err) {
      setStepError("engineer", err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setStepLoading("engineer", false);
    }
  }

  // ── Loading state
  if (!engineerOutput && stepLoading.engineer) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label="Generating G-code..." />
      </div>
    );
  }

  if (!engineerOutput) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          maxWidth: "1100px",
          margin: "0 auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxSizing: "border-box",
        }}
      >
        {/* Print metrics */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <MetricTile
            label="Size"
            value={
              meta?.width_mm && meta?.depth_mm
                ? `${meta.width_mm}×${meta.depth_mm}mm`
                : "?"
            }
          />
          {meta?.num_layers != null && (
            <MetricTile
              label="Layers"
              value={`${meta.num_layers} layers`}
            />
          )}
          <MetricTile
            label="Print time"
            value={
              meta?.estimated_print_time_seconds
                ? formatPrintTime(meta.estimated_print_time_seconds)
                : "?"
            }
          />
          {(engineerOutput?.pieces ?? 1) > 1 && (
            <MetricTile
              label="Pieces"
              value={`${engineerOutput!.pieces} pieces`}
            />
          )}
          {meta?.print_weight_g != null && meta?.recipe_weight_g != null && (
            <MetricTile
              label="Paste"
              value={`${meta.print_weight_g}g / ${meta.recipe_weight_g}g`}
            />
          )}
        </div>

        {/* Extrusion controls */}
        <ExtrusionControls
          emValues={emValues}
          lhValue={lhValue}
          onChange={setEmValues}
          onLhChange={setLhValue}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />

        {/* GCode + 3D viewer */}
        {g && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              height: "460px",
            }}
          >
            {/* GCode panel */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--fg)" }}>
                  G-code ({lineCount} lines)
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "10px",
                  fontSize: "10px",
                  lineHeight: "1.4",
                  flex: 1,
                  overflowY: "auto",
                  background: "#1a1a1a",
                  color: "#d4d4d4",
                  fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
                }}
              >
                {g.split("\n").slice(0, 400).map((line, i) => {
                  let color = "#d4d4d4";
                  if (line.startsWith(";")) color = "#666";
                  else if (line.startsWith("G0")) color = "#8ac4ff";
                  else if (line.startsWith("G1")) color = "#ffa07a";
                  else if (line.startsWith("T")) color = "#ccc";
                  return (
                    <span key={i}>
                      <span style={{ color: "#444", userSelect: "none" }}>
                        {String(i + 1).padStart(4, " ")}{"  "}
                      </span>
                      <span style={{ color }}>{line}</span>
                      {"\n"}
                    </span>
                  );
                })}
                {lineCount > 400 && (
                  <span style={{ color: "#444" }}>{`\n... ${lineCount - 400} more lines`}</span>
                )}
              </pre>
            </div>

            {/* 3D viewer */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--fg)",
                  flexShrink: 0,
                }}
              >
                3D Preview
              </div>
              <div style={{ flex: 1, minHeight: 0, padding: "8px" }}>
                <GCodeCanvas key={gcodeVersion} gcode={g} />
              </div>
            </div>
          </div>
        )}

        {/* Calibration (hidden researcher details) */}
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
            Extrusion Calibration
          </summary>
          <CalibrationPanel numSyringes={emValues.length} />
        </details>

        {/* Revise panel */}
        {showRevise && (
          <RevisePanel
            onRevisePrompt={handleRevisePrompt}
            loading={stepLoading.engineer}
            error={stepError.engineer}
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

      {/* Download / Revise bar */}
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
            Your food is ready to print. Download the G-code file to send to your printer.
          </p>
          <Button variant="primary" size="md" onClick={handleDownload} disabled={!g}>
            Download G-code
          </Button>
        </div>
      )}
    </div>
  );
}
