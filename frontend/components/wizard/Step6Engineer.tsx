"use client";

import React, { useState } from "react";
import { useWizardStore } from "../../store/wizardStore";
import { LoadingBlock } from "../ui/Spinner";
import { regenerateGCode, runEngineer } from "../../lib/api";
import { formatPrintTime } from "../../lib/formatters";
import { GCodeCanvas, SYRINGE_COLORS } from "../engineer/GCodeCanvas";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — consistent with Step 3, 5 and the homepage
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  ink:       "#1A1410",
  muted:     "#6B5D50",
  card:      "#FFFFFF",
  border:    "rgba(26, 20, 16, 0.12)",
  forest:    "rgb(21, 60, 54)",
  forestInk: "#FFF4E6",
  cream:     "rgb(244, 244, 232)",
  bg:        "#F5F5F0",
};

// ─────────────────────────────────────────────────────────────────────────────
// Micro-components
// ─────────────────────────────────────────────────────────────────────────────

function SyringeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2l4 4-4 4" />
      <path d="M14 6l4-4" />
      <path d="M6 20l-4 4" />
      <path d="M14 6L6 14l4 4 8-8" />
      <line x1="6" y1="14" x2="2" y2="18" />
      <line x1="10" y1="10" x2="14" y2="14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ overflow: "visible" }}>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calibration G-code generator (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────

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
// MetricTile — print stats card with optional stepper
// ─────────────────────────────────────────────────────────────────────────────

function MetricTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{
      flex: "1 1 0", padding: "14px 16px",
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: T.muted,
        fontFamily: "'Geist Mono', monospace",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: T.ink,
        fontFamily: "'Geist', sans-serif", letterSpacing: "-0.02em",
      }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 500, color: T.muted, marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtrusionCard — syringe EM + layer height in one row
// ─────────────────────────────────────────────────────────────────────────────

function ExtrusionCard({
  emValues,
  lhValue,
  onChange,
  onLhChange,
}: {
  emValues: number[];
  lhValue: number;
  onChange: (values: number[]) => void;
  onLhChange: (v: number) => void;
}) {
  const inputStyle = (accentColor?: string): React.CSSProperties => ({
    width: "100%", padding: "5px 8px",
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    fontFamily: "'Geist Mono', monospace", textAlign: "center",
    border: `1.5px solid ${accentColor ? `${accentColor}60` : T.border}`,
    background: T.card, color: T.ink, outline: "none",
    boxSizing: "border-box",
  });

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "16px 20px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: T.muted,
        fontFamily: "'Geist', sans-serif", marginBottom: 14,
      }}>
        Extrusion Multiplier + Layer Height
      </div>
      <div style={{ height: 1, background: T.border, margin: "0 0 14px" }} />

      <div style={{ display: "flex", gap: 16 }}>
        {emValues.map((val, i) => {
          const color = SYRINGE_COLORS[i % SYRINGE_COLORS.length];
          return (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6,
                fontFamily: "'Geist', sans-serif" }}>
                Syringe {i + 1}
              </div>
              <input type="number" min={0.001} max={2.0} step={0.001} value={val}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 0.001 && n <= 2.0) onChange(emValues.map((x, j) => j === i ? n : x));
                }}
                style={inputStyle(color)}
              />
              <input type="range" min={0.001} max={2.0} step={0.001} value={val}
                onChange={(e) => onChange(emValues.map((x, j) => j === i ? Number(e.target.value) : x))}
                style={{ width: "100%", marginTop: 6, accentColor: color } as React.CSSProperties}
              />
            </div>
          );
        })}

        {/* Layer height */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6,
            fontFamily: "'Geist', sans-serif" }}>
            Layer Height
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="number" min={0.5} max={5.0} step={0.1} value={lhValue}
              onChange={(e) => { const n = Number(e.target.value); if (n >= 0.5 && n <= 5.0) onLhChange(n); }}
              style={{ ...inputStyle(), flex: 1 }}
            />
            <span style={{ fontSize: 12, color: T.muted, fontFamily: "'Geist', sans-serif",
              flexShrink: 0 }}>mm</span>
          </div>
          <input type="range" min={0.5} max={5.0} step={0.1} value={lhValue}
            onChange={(e) => onLhChange(Number(e.target.value))}
            style={{ width: "100%", marginTop: 6, accentColor: T.ink } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CalibrationCard — tabbed per-syringe calibration
// ─────────────────────────────────────────────────────────────────────────────

function CalibrationCard({ numSyringes }: { numSyringes: number }) {
  const count = Math.max(numSyringes || 1, 1);
  const [activeTool, setActiveTool] = useState(0);
  const [calEM, setCalEM] = useState(0.1);
  const [calLH, setCalLH] = useState(0.1);

  const accentColor = SYRINGE_COLORS[activeTool % SYRINGE_COLORS.length];

  function downloadCalibration() {
    const gc = generateCalibrationGCode(activeTool, calEM, calLH);
    const blob = new Blob([gc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calibration_T${activeTool}_EM${calEM.toFixed(3)}_LH${calLH.toFixed(1)}.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "5px 8px",
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    fontFamily: "'Geist Mono', monospace", textAlign: "center",
    border: `1.5px solid ${accentColor}60`,
    background: T.card, color: T.ink, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "16px 20px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: T.muted,
        fontFamily: "'Geist', sans-serif", marginBottom: 14,
      }}>
        Printing Calibration
      </div>
      <div style={{ height: 1, background: T.border, margin: "0 0 14px" }} />

      {/* Syringe tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {Array.from({ length: count }, (_, i) => {
          const color = SYRINGE_COLORS[i % SYRINGE_COLORS.length];
          const isActive = activeTool === i;
          return (
            <button key={i} onClick={() => setActiveTool(i)}
              style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                border: isActive ? `1.5px solid ${color}` : `1px solid ${T.border}`,
                background: isActive ? "transparent" : "transparent",
                color: isActive ? color : T.muted,
                fontFamily: "'Geist', sans-serif",
                transition: "border-color 0.12s, color 0.12s",
              }}>
              Syringe {i + 1}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6,
            fontFamily: "'Geist', sans-serif" }}>
            Extrusion Multiplier (rate)
          </div>
          <input type="number" min={0.001} max={1.0} step={0.001} value={calEM}
            onChange={(e) => { const n = Number(e.target.value); if (n >= 0.001 && n <= 1.0) setCalEM(n); }}
            style={inputStyle}
          />
          <input type="range" min={0.001} max={1.0} step={0.001} value={calEM}
            onChange={(e) => setCalEM(Number(e.target.value))}
            style={{ width: "100%", marginTop: 6, accentColor } as React.CSSProperties}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6,
            fontFamily: "'Geist', sans-serif" }}>
            Layer Height
          </div>
          <input type="number" min={0.5} max={5.0} step={0.1} value={calLH}
            onChange={(e) => { const n = Number(e.target.value); if (n >= 0.5 && n <= 5.0) setCalLH(n); }}
            style={inputStyle}
          />
          <input type="range" min={0.5} max={5.0} step={0.1} value={calLH}
            onChange={(e) => setCalLH(Number(e.target.value))}
            style={{ width: "100%", marginTop: 6, accentColor } as React.CSSProperties}
          />
        </div>
      </div>

      <p style={{
        margin: "14px 0 0", fontSize: 11, color: T.muted, lineHeight: 1.5,
        fontFamily: "'Geist', sans-serif",
      }}>
        The calibration file prints a 150mm straight line in the X direction (center ±75mm).
        Adjust the extrusion multiplier and layer height based on the result.
      </p>

      <button onClick={downloadCalibration}
        style={{
          display: "none", /* exposed via the main download button */
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6: Printing Details
// ─────────────────────────────────────────────────────────────────────────────

export function Step6Engineer() {
  const {
    engineerOutput, chefOutput, prompt, parsedPrompt,
    gcode, setGcode, setEngineerOutput,
    emValues, lhValue, setEmValues, setLhValue,
    setStepLoading, setStepError, stepLoading, stepError,
    appendLog,
  } = useWizardStore();

  const [regenerating, setRegenerating] = useState(false);
  const [gcodeVersion, setGcodeVersion] = useState(0);
  const [calTool, setCalTool] = useState(0);
  const [calEM, setCalEM] = useState(0.1);
  const [calLH, setCalLH] = useState(0.1);

  const g = gcode || engineerOutput?.gcode || "";
  const meta = engineerOutput?.metadata;
  const accentColor = SYRINGE_COLORS[calTool % SYRINGE_COLORS.length];
  const numSyringes = chefOutput?.syringe_recipes?.length ?? emValues.length;

  function handleDownload() {
    if (!g) return;
    const blob = new Blob([g], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cookpilot.gcode"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadCalibration() {
    const gc = generateCalibrationGCode(calTool, calEM, calLH);
    const blob = new Blob([gc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calibration_T${calTool}_EM${calEM.toFixed(3)}_LH${calLH.toFixed(1)}.gcode`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadBoth() {
    handleDownload();
    handleDownloadCalibration();
  }

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

  if (!engineerOutput && stepLoading.engineer) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label="Generating G-code..." />
      </div>
    );
  }
  if (!engineerOutput) return null;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden",
        background: T.cream, fontFamily: "'Geist', sans-serif",
      }}>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "32px 28px 24px",
          display: "flex", flexDirection: "column", gap: 24,
          boxSizing: "border-box",
          maxWidth: 1240, margin: "0 auto", width: "100%",
        }}>

          {/* Page title */}
          <h2 style={{
            margin: 0, fontSize: 36, fontWeight: 400,
            color: T.ink, fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.01em", lineHeight: 1.1,
          }}>
            Printing Details
          </h2>

          {/* Main two-column layout */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

            {/* ── Left: 3D Preview card ── */}
            <div style={{
              width: 380, flexShrink: 0,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 16, overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {/* Card header */}
              <div style={{ padding: "16px 20px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: T.forest, color: T.forestInk,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <SyringeIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>3D Preview</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1,
                      fontFamily: "'Geist Mono', monospace" }}>
                      G-code print path
                    </div>
                  </div>
                </div>
                <div style={{ height: 1, background: T.border, marginTop: 14 }} />
              </div>

              {/* Canvas */}
              <div style={{ flex: 1, minHeight: 320, padding: "0 12px 12px", position: "relative" }}>
                {g ? (
                  <GCodeCanvas key={gcodeVersion} gcode={g} />
                ) : (
                  <div style={{
                    height: 320, display: "flex", alignItems: "center", justifyContent: "center",
                    color: T.muted, fontSize: 13,
                  }}>
                    No G-code generated
                  </div>
                )}
              </div>

              {/* Progress slider */}
              <div style={{
                padding: "8px 20px 16px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <input type="range" min={0} max={100} defaultValue={100}
                  style={{ flex: 1, accentColor: T.ink } as React.CSSProperties} />
                <span style={{ fontSize: 12, color: T.muted, fontFamily: "'Geist Mono', monospace",
                  flexShrink: 0 }}>
                  100%
                </span>
              </div>
            </div>

            {/* ── Right: controls column ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

              {/* Metric tiles */}
              <div style={{ display: "flex", gap: 10 }}>
                <MetricTile
                  label="Print Time"
                  value={meta?.estimated_print_time_seconds
                    ? formatPrintTime(meta.estimated_print_time_seconds)
                    : "—"}
                />
                <MetricTile
                  label="Layers"
                  value={meta?.num_layers ? String(meta.num_layers) : "—"}
                  unit={meta?.num_layers ? "layers" : undefined}
                />
                <MetricTile
                  label="Amount"
                  value={String(engineerOutput.pieces ?? 1)}
                  unit="pieces"
                />
              </div>

              {/* Extrusion Multiplier + Layer Height */}
              <ExtrusionCard
                emValues={emValues}
                lhValue={lhValue}
                onChange={setEmValues}
                onLhChange={setLhValue}
              />

              {/* Printing Calibration */}
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "16px 20px",
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: T.muted,
                  marginBottom: 14,
                }}>
                  Printing Calibration
                </div>
                <div style={{ height: 1, background: T.border, margin: "0 0 14px" }} />

                {/* Syringe tabs */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {Array.from({ length: Math.max(numSyringes, 1) }, (_, i) => {
                    const color = SYRINGE_COLORS[i % SYRINGE_COLORS.length];
                    const isActive = calTool === i;
                    return (
                      <button key={i} onClick={() => setCalTool(i)}
                        style={{
                          padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                          border: isActive ? `1.5px solid ${color}` : `1px solid ${T.border}`,
                          background: "transparent",
                          color: isActive ? color : T.muted,
                          fontFamily: "'Geist', sans-serif",
                          transition: "border-color 0.12s, color 0.12s",
                        }}>
                        Syringe {i + 1}
                      </button>
                    );
                  })}
                </div>

                {/* EM + LH controls */}
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                      Extrusion Multiplier (rate)
                    </div>
                    <input type="number" min={0.001} max={1.0} step={0.001} value={calEM}
                      onChange={(e) => { const n = Number(e.target.value); if (n >= 0.001 && n <= 1.0) setCalEM(n); }}
                      style={{
                        width: "100%", padding: "5px 8px", borderRadius: 8,
                        fontSize: 13, fontWeight: 600, textAlign: "center",
                        border: `1.5px solid ${accentColor}60`,
                        background: T.card, color: T.ink, outline: "none",
                        boxSizing: "border-box", fontFamily: "'Geist Mono', monospace",
                      }}
                    />
                    <input type="range" min={0.001} max={1.0} step={0.001} value={calEM}
                      onChange={(e) => setCalEM(Number(e.target.value))}
                      style={{ width: "100%", marginTop: 6, accentColor } as React.CSSProperties}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                      Layer Height
                    </div>
                    <input type="number" min={0.5} max={5.0} step={0.1} value={calLH}
                      onChange={(e) => { const n = Number(e.target.value); if (n >= 0.5 && n <= 5.0) setCalLH(n); }}
                      style={{
                        width: "100%", padding: "5px 8px", borderRadius: 8,
                        fontSize: 13, fontWeight: 600, textAlign: "center",
                        border: `1.5px solid ${accentColor}60`,
                        background: T.card, color: T.ink, outline: "none",
                        boxSizing: "border-box", fontFamily: "'Geist Mono', monospace",
                      }}
                    />
                    <input type="range" min={0.5} max={5.0} step={0.1} value={calLH}
                      onChange={(e) => setCalLH(Number(e.target.value))}
                      style={{ width: "100%", marginTop: 6, accentColor } as React.CSSProperties}
                    />
                  </div>
                </div>

                <p style={{
                  margin: "14px 0 0", fontSize: 11, color: T.muted, lineHeight: 1.5,
                }}>
                  The calibration file prints a 150mm straight line in the X direction (center ±75mm).
                  Adjust the extrusion multiplier and layer height based on the result.
                </p>
              </div>

              {/* Error */}
              {stepError.engineer && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "#fff0f0", border: "1px solid #fcc",
                  color: "#c0392b", fontSize: 13,
                }}>
                  {stepError.engineer}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          flexShrink: 0, background: T.card,
          borderTop: `1.5px solid ${T.border}`,
          padding: "14px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Regenerate */}
          <button
            onClick={handleRegenerate}
            disabled={regenerating || !g}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12,
              border: `1.5px solid ${T.border}`,
              background: "transparent", color: T.ink,
              fontSize: 14, fontWeight: 500, cursor: regenerating ? "not-allowed" : "pointer",
              fontFamily: "'Geist', sans-serif", opacity: regenerating ? 0.6 : 1,
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => { if (!regenerating) (e.currentTarget as HTMLElement).style.background = T.cream; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <span style={{ animation: regenerating ? "spin 0.8s linear infinite" : "none", display: "flex" }}>
              <RefreshIcon />
            </span>
            {regenerating ? "Regenerating…" : "Regenerate G-code"}
          </button>

          {/* Download */}
          <button
            onClick={handleDownloadBoth}
            disabled={!g}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 24px", borderRadius: 12,
              border: "none",
              background: g ? T.forest : T.border,
              color: g ? T.forestInk : T.muted,
              fontSize: 14, fontWeight: 600, cursor: g ? "pointer" : "not-allowed",
              fontFamily: "'Geist', sans-serif",
            }}
          >
            <DownloadIcon />
            Download G-code + Calibration
          </button>
        </div>
      </div>
    </>
  );
}
