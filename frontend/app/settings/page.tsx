"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchSettings,
  saveSettings,
  fetchRAGSources,
  toggleRAGSource,
  deleteRAGSource,
  uploadRAGSource,
  fetchChefSections,
  startBatchRun,
  fetchBatchRun,
  fetchBatchList,
} from "@/lib/api";
import type { AppSettings, RAGSource, BatchJob, ChefSectionKey } from "@/lib/types";
import { CHEF_SECTION_KEYS, CHEF_SECTION_META } from "@/lib/types";
import { useWizardStore } from "@/store/wizardStore";

// ── Presets ───────────────────────────────────────────────────────────────────

const ALL_ON = Object.fromEntries(CHEF_SECTION_KEYS.map((k) => [k, true])) as Record<ChefSectionKey, boolean>;

const EVAL_PRESETS: Record<string, { label: string; skip_dietitian: boolean; chef_sections: Record<ChefSectionKey, boolean> }> = {
  full_pipeline:   { label: "Full Pipeline",        skip_dietitian: false, chef_sections: { ...ALL_ON } },
  eval1_baseline:  { label: "Eval 1: No Dietitian", skip_dietitian: true,  chef_sections: { ...ALL_ON } },
  "2a_food_safety":{ label: "2-A Food Safety",      skip_dietitian: false, chef_sections: { ...ALL_ON, food_safety_rules: false, food_safety_check: false } },
  "2b_flavor":     { label: "2-B Flavor",           skip_dietitian: false, chef_sections: { ...ALL_ON, food_design: false } },
  "2c_visual":     { label: "2-C Visual",           skip_dietitian: false, chef_sections: { ...ALL_ON, food_design: false } },
  "2d_printability":{ label: "2-D Printability",    skip_dietitian: false, chef_sections: { ...ALL_ON, printability_check: false } },
};

// ── Default settings ──────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  llm_provider: "openai",
  llm_model: "gpt-4o-mini",
  use_rag: true,
  rag_sources_enabled: ["nutrition/dietitian_kb.md", "recipe/viscosity_charts.md", "recipe/usda_safe_temperature_chart.md"],
  system_prompts: { dietitian: "", chef: "", engineer: "" },
  chef_sections_enabled: { printer_context: true, food_safety_rules: true, food_design: true, supplementary: true, printability_check: true, food_safety_check: true, nutrition_rules: true },
  chef_sections_content: { printer_context: "", food_safety_rules: "", food_design: "", supplementary: "", printability_check: "", food_safety_check: "", nutrition_rules: "" },
  skip_dietitian: false,
  use_usda_api: true,
};

const MODELS: Record<string, string[]> = {
  openai:    ["gpt-4o", "gpt-4o-mini", "gpt-5-mini", "gpt-5-nano"],
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
  gemini:    ["gemini-2.0-flash", "gemini-1.5-pro"],
};

const TAG_COLOR: Record<string, string> = { Prompt: "#4a90d9", RAG: "#e67e22", API: "#27ae60" };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<"config" | "batch" | "results">("config");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ragSources, setRagSources] = useState<RAGSource[]>([]);
  const [sectionDefaults, setSectionDefaults] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showSystemPrompts, setShowSystemPrompts] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("recipe");

  const profiles = useWizardStore((s) => s.profiles);
  const [batchPrompt, setBatchPrompt] = useState("");
  const [batchProfileId, setBatchProfileId] = useState("");
  const [batchN, setBatchN] = useState(10);
  const [batchStage, setBatchStage] = useState<"dietitian" | "chef">("chef");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<BatchJob | null>(null);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(console.error);
    fetchRAGSources().then(setRagSources).catch(console.error);
    fetchChefSections().then(setSectionDefaults).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeRunId) return;
    pollRef.current = setInterval(async () => {
      try {
        const job = await fetchBatchRun(activeRunId);
        setActiveJob(job);
        if (job.status !== "running") {
          clearInterval(pollRef.current!);
          setActiveRunId(null);
          fetchBatchList().then(setBatchJobs).catch(console.error);
        }
      } catch { clearInterval(pollRef.current!); }
    }, 2000);
    return () => clearInterval(pollRef.current!);
  }, [activeRunId]);

  useEffect(() => {
    if (tab === "results") fetchBatchList().then(setBatchJobs).catch(console.error);
  }, [tab]);

  const handleSave = async () => {
    setSaving(true);
    try { await saveSettings(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  };

  const applyPreset = (key: string) => {
    const p = EVAL_PRESETS[key];
    if (!p) return;
    setSettings((prev) => ({ ...prev, skip_dietitian: p.skip_dietitian, chef_sections_enabled: { ...p.chef_sections } }));
  };

  const activePreset = Object.entries(EVAL_PRESETS).find(([, p]) =>
    p.skip_dietitian === settings.skip_dietitian &&
    CHEF_SECTION_KEYS.every((k) => p.chef_sections[k] === settings.chef_sections_enabled[k])
  )?.[0] ?? null;

  const handleBatchRun = async () => {
    const profile = profiles.find((p) => p.id === batchProfileId) ?? profiles[0];
    if (!profile) { alert("No profile selected"); return; }
    if (!batchPrompt.trim()) { alert("Enter a prompt"); return; }
    const { id: _id, createdAtIso: _ts, ...profileData } = profile;
    const res = await startBatchRun({ n: batchN, stage: batchStage, inputs: [{ prompt: batchPrompt, profile: profileData }] });
    setActiveRunId(res.run_id);
    setActiveJob(null);
    setTab("batch");
  };

  const exportJSON = (job: BatchJob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(job.results, null, 2)], { type: "application/json" }));
    a.download = `batch_${job.run_id}_${job.stage}.json`;
    a.click();
  };

  const exportCSV = (job: BatchJob) => {
    const header = "index,prompt,kcal,protein_g,carbs_g,fat_g,sugar_g,recipes,warnings,duration_ms,error";
    const rows = job.results.map((r) => {
      const nf = (r.output as Record<string, number | undefined>);
      const nff = (r.output as Record<string, unknown>)?.nutrition_facts as Record<string, number> | undefined;
      void nf;
      const recipes = (r.output as Record<string, unknown>)?.syringe_recipes as Array<{ title: string }> | undefined;
      const warnings = (r.output as Record<string, unknown>)?.validation_warnings as string[] | undefined;
      return [r.index, JSON.stringify(r.prompt), nff?.calories ?? "", nff?.protein_g ?? "", nff?.total_carbs_g ?? "", nff?.total_fat_g ?? "", nff?.total_sugars_g ?? "", recipes?.map((x) => x.title).join("|") ?? "", warnings?.length ?? 0, r.duration_ms, r.error ?? ""].join(",");
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[header, ...rows].join("\n")], { type: "text/csv" }));
    a.download = `batch_${job.run_id}_${job.stage}.csv`;
    a.click();
  };

  const selectedJob = batchJobs.find((j) => j.run_id === selectedJobId) ?? null;

  // ── Styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8e8e8", borderRadius: "10px", padding: "20px", marginBottom: "16px" };
  const cardTitle: React.CSSProperties = { fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" };
  const inputStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: "6px", border: "1px solid #e0e0e0", fontSize: "13px", background: "#fff", color: "#111" };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const textareaStyle: React.CSSProperties = { width: "100%", fontSize: "12px", fontFamily: "monospace", lineHeight: "1.55", padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0", background: "#fafafa", resize: "vertical", boxSizing: "border-box", color: "#222", marginTop: "8px" };

  const chipBtn = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px", fontSize: "12px", fontWeight: 500, borderRadius: "6px",
    border: active ? "1.5px solid #111" : "1px solid #ddd",
    background: active ? "#111" : "#fff", color: active ? "#fff" : "#444",
    cursor: "pointer", whiteSpace: "nowrap",
  });

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      style={{ width: "36px", height: "20px", borderRadius: "10px", background: on ? "#111" : "#d0d0d0", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.15s" }}
    >
      <div style={{ position: "absolute", top: "3px", left: on ? "19px" : "3px", width: "14px", height: "14px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f7", fontFamily: "'Inter', system-ui, sans-serif", color: "#111", padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: "740px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <a href="/" style={{ color: "#aaa", fontSize: "13px", textDecoration: "none" }}>← Back</a>
          <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Research Console</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid #e5e5e5" }}>
          {(["config", "batch", "results"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", fontSize: "13px", fontWeight: tab === t ? 600 : 400, color: tab === t ? "#111" : "#999", background: "none", border: "none", borderBottom: tab === t ? "2px solid #111" : "2px solid transparent", cursor: "pointer", marginBottom: "-1px" }}>
              {t === "config" ? "Configuration" : t === "batch" ? "Batch Run" : "Results"}
            </button>
          ))}
        </div>

        {/* ────────────────────────────────────────────────────────────────
            Tab: Configuration
        ──────────────────────────────────────────────────────────────── */}
        {tab === "config" && <>

          {/* Evaluation Presets */}
          <div style={card}>
            <div style={cardTitle}>Evaluation Presets</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.entries(EVAL_PRESETS).map(([key, p]) => (
                <button key={key} style={chipBtn(activePreset === key)} onClick={() => applyPreset(key)}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* Pipeline Stages */}
          <div style={card}>
            <div style={cardTitle}>Pipeline Stages</div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid #f2f2f2" }}>
              <Toggle on={!settings.skip_dietitian} onToggle={() => setSettings((p) => ({ ...p, skip_dietitian: !p.skip_dietitian }))} />
              <span style={{ fontSize: "13px" }}>Dietitian Stage</span>
              {settings.skip_dietitian && <span style={{ fontSize: "11px", color: "#e67e22", fontWeight: 500 }}>skipped — Eval 1 baseline</span>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0" }}>
              <Toggle on={settings.use_usda_api} onToggle={() => setSettings((p) => ({ ...p, use_usda_api: !p.use_usda_api }))} />
              <span style={{ fontSize: "13px" }}>USDA Nutrition API</span>
              {!settings.use_usda_api && <span style={{ fontSize: "11px", color: "#e67e22", fontWeight: 500 }}>disabled</span>}
            </div>
          </div>

          {/* AI Model */}
          <div style={card}>
            <div style={cardTitle}>AI Model</div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              {(["openai", "anthropic", "gemini"] as const).map((p) => (
                <button key={p} style={chipBtn(settings.llm_provider === p)}
                  onClick={() => setSettings((prev) => ({ ...prev, llm_provider: p, llm_model: MODELS[p][0] }))}>
                  {p === "openai" ? "OpenAI" : p === "anthropic" ? "Anthropic" : "Gemini"}
                </button>
              ))}
            </div>
            <select style={{ ...selectStyle, width: "100%" }} value={settings.llm_model}
              onChange={(e) => setSettings((p) => ({ ...p, llm_model: e.target.value }))}>
              {MODELS[settings.llm_provider].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Chef Prompt Components */}
          <div style={card}>
            <div style={cardTitle}>Chef Prompt Components</div>
            {CHEF_SECTION_KEYS.map((key) => {
              const meta = CHEF_SECTION_META[key];
              const on = settings.chef_sections_enabled[key];
              const expanded = expandedSections[key] ?? false;
              const content = settings.chef_sections_content[key] || sectionDefaults[key] || "";
              return (
                <div key={key} style={{ opacity: on ? 1 : 0.55, transition: "opacity 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid #f2f2f2" }}>
                    <Toggle on={on} onToggle={() => setSettings((p) => ({ ...p, chef_sections_enabled: { ...p.chef_sections_enabled, [key]: !on } }))} />
                    <span style={{ fontSize: "13px", fontWeight: 500, flex: 1 }}>{meta.label}</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {meta.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: (TAG_COLOR[tag] ?? "#888") + "18", color: TAG_COLOR[tag] ?? "#888", letterSpacing: "0.04em" }}>{tag}</span>
                      ))}
                    </div>
                    <button onClick={() => setExpandedSections((p) => ({ ...p, [key]: !p[key] }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: "12px", padding: "2px 6px" }}>
                      {expanded ? "▲" : "▼"}
                    </button>
                  </div>
                  {expanded && (
                    <textarea
                      style={{ ...textareaStyle, minHeight: "140px" }}
                      value={content}
                      onChange={(e) => setSettings((p) => ({ ...p, chef_sections_content: { ...p.chef_sections_content, [key]: e.target.value } }))}
                      placeholder={sectionDefaults[key] ? "(using default — edit to override)" : "Loading…"}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Knowledge Base */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ ...cardTitle, marginBottom: 0 }}>Knowledge Base</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select style={{ ...selectStyle, fontSize: "12px", padding: "5px 8px" }} value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
                  <option value="">root</option>
                  <option value="nutrition">nutrition/</option>
                  <option value="recipe">recipe/</option>
                </select>
                <label style={{ padding: "5px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer", background: "#fff", color: "#444" }}>
                  Upload KB
                  <input type="file" accept=".md,.txt,.pdf,.docx" style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const src = await uploadRAGSource(file, uploadFolder);
                      setRagSources((p) => [...p, src]);
                      e.target.value = "";
                    }} />
                </label>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: "1px solid #f2f2f2", marginBottom: "6px" }}>
              <Toggle on={settings.use_rag} onToggle={() => setSettings((p) => ({ ...p, use_rag: !p.use_rag }))} />
              <span style={{ fontSize: "12px", color: "#666" }}>Enable RAG context injection</span>
            </div>

            {ragSources.map((src) => {
              const enabled = settings.rag_sources_enabled.includes(src.filename);
              return (
                <div key={src.filename} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: "1px solid #f7f7f7", fontSize: "12px" }}>
                  <Toggle on={enabled} onToggle={async () => {
                    await toggleRAGSource(src.filename);
                    setSettings((p) => ({
                      ...p,
                      rag_sources_enabled: enabled
                        ? p.rag_sources_enabled.filter((f) => f !== src.filename)
                        : [...p.rag_sources_enabled, src.filename],
                    }));
                  }} />
                  <span style={{ flex: 1, fontFamily: "monospace", color: enabled ? "#111" : "#bbb", fontSize: "11px" }}>{src.filename}</span>
                  <span style={{ color: "#bbb", fontSize: "11px" }}>{src.chunk_count} chunks · {(src.size_bytes / 1024).toFixed(1)} KB</span>
                  <button onClick={async () => {
                    if (!confirm(`Delete ${src.filename}?`)) return;
                    await deleteRAGSource(src.filename);
                    setRagSources((p) => p.filter((s) => s.filename !== src.filename));
                  }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: "15px", padding: "0 4px", lineHeight: 1 }}>×</button>
                </div>
              );
            })}
          </div>

          {/* System Prompts — collapsed */}
          <div style={card}>
            <button onClick={() => setShowSystemPrompts((p) => !p)}
              style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ ...cardTitle, marginBottom: 0 }}>System Prompts (Advanced)</span>
                <span style={{ color: "#bbb", fontSize: "12px" }}>{showSystemPrompts ? "▲" : "▼"}</span>
              </div>
            </button>
            {showSystemPrompts && (
              <div style={{ marginTop: "14px" }}>
                {(["dietitian", "chef", "engineer"] as const).map((agent) => (
                  <div key={agent} style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", textTransform: "capitalize", color: "#555" }}>{agent}</div>
                    <textarea style={{ ...textareaStyle, minHeight: "90px" }}
                      value={settings.system_prompts[agent]}
                      onChange={(e) => setSettings((p) => ({ ...p, system_prompts: { ...p.system_prompts, [agent]: e.target.value } }))}
                      placeholder={`Default ${agent} system prompt`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>}

        {/* ────────────────────────────────────────────────────────────────
            Tab: Batch Run
        ──────────────────────────────────────────────────────────────── */}
        {tab === "batch" && <>
          <div style={card}>
            <div style={cardTitle}>Batch Input</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              <div>
                <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "5px" }}>User Prompt</div>
                <textarea style={{ ...textareaStyle, minHeight: "72px" }} value={batchPrompt}
                  onChange={(e) => setBatchPrompt(e.target.value)}
                  placeholder="e.g. a star-shaped snack with banana" />
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "5px" }}>Profile</div>
                  <select style={{ ...selectStyle, width: "100%" }} value={batchProfileId} onChange={(e) => setBatchProfileId(e.target.value)}>
                    {profiles.length === 0 && <option value="">No profiles saved</option>}
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.profileName}</option>)}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "5px" }}>Stage</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["dietitian", "chef"] as const).map((st) => (
                      <button key={st} style={chipBtn(batchStage === st)} onClick={() => setBatchStage(st)}>{st}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "5px" }}>Runs (N)</div>
                  <input type="number" min={1} max={100} value={batchN}
                    onChange={(e) => setBatchN(Math.max(1, Math.min(100, Number(e.target.value))))}
                    style={{ ...inputStyle, width: "70px" }} />
                </div>
              </div>

              <button onClick={handleBatchRun} disabled={!!activeRunId}
                style={{ alignSelf: "flex-start", padding: "10px 20px", background: activeRunId ? "#ccc" : "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: activeRunId ? "not-allowed" : "pointer" }}>
                {activeRunId ? "Running…" : "▶ Run Batch"}
              </button>
            </div>
          </div>

          {/* Progress */}
          {(activeJob || activeRunId) && (
            <div style={card}>
              <div style={cardTitle}>Progress</div>
              {activeJob ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#777", marginBottom: "10px" }}>
                    <span>{activeJob.stage} · {activeJob.run_id}</span>
                    <span>{activeJob.completed} / {activeJob.n}</span>
                  </div>
                  <div style={{ background: "#f0f0f0", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div style={{ background: activeJob.status === "done" ? "#27ae60" : activeJob.status === "error" ? "#e74c3c" : "#111", height: "100%", width: `${(activeJob.completed / activeJob.n) * 100}%`, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: "12px", marginTop: "8px", color: activeJob.status === "done" ? "#27ae60" : activeJob.status === "error" ? "#e74c3c" : "#888" }}>
                    {activeJob.status === "done" ? "✓ Complete — see Results tab" : activeJob.status === "error" ? `Error: ${activeJob.error}` : "Running…"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "12px", color: "#aaa" }}>Starting…</div>
              )}
            </div>
          )}
        </>}

        {/* ────────────────────────────────────────────────────────────────
            Tab: Results
        ──────────────────────────────────────────────────────────────── */}
        {tab === "results" && <>
          {batchJobs.length === 0 ? (
            <div style={{ ...card, color: "#bbb", fontSize: "13px", textAlign: "center", padding: "48px" }}>
              No batch runs yet — go to Batch Run tab.
            </div>
          ) : (
            <>
              <div style={card}>
                <div style={cardTitle}>Batch Runs</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {batchJobs.map((job) => (
                    <button key={job.run_id} onClick={() => setSelectedJobId(job.run_id)}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "7px", border: selectedJobId === job.run_id ? "1.5px solid #111" : "1px solid #e8e8e8", background: selectedJobId === job.run_id ? "#f5f5f5" : "#fff", cursor: "pointer", textAlign: "left", fontSize: "12px" }}>
                      <span style={{ fontFamily: "monospace", color: "#888" }}>{job.run_id}</span>
                      <span style={{ fontWeight: 600 }}>{job.stage}</span>
                      <span style={{ color: "#aaa" }}>{job.n} runs</span>
                      <span style={{ marginLeft: "auto", color: job.status === "done" ? "#27ae60" : job.status === "error" ? "#e74c3c" : "#e67e22", fontWeight: 500 }}>{job.status}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedJob && (
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ ...cardTitle, marginBottom: 0 }}>Results — {selectedJob.run_id} ({selectedJob.completed}/{selectedJob.n})</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={chipBtn(false)} onClick={() => exportCSV(selectedJob)}>Export CSV</button>
                      <button style={chipBtn(false)} onClick={() => exportJSON(selectedJob)}>Export JSON</button>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                          {["#", "Recipe", "kcal", "protein", "carbs", "fat", "sugar", "warn", "ms", "error"].map((h) => (
                            <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: "#aaa", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedJob.results.map((r) => {
                          const nff = (r.output as Record<string, unknown>)?.nutrition_facts as Record<string, number> | undefined;
                          const recipes = (r.output as Record<string, unknown>)?.syringe_recipes as Array<{ title: string }> | undefined;
                          const warnings = (r.output as Record<string, unknown>)?.validation_warnings as string[] | undefined;
                          return (
                            <tr key={r.index} style={{ borderBottom: "1px solid #f5f5f5" }}>
                              <td style={{ padding: "6px 8px", color: "#ccc" }}>{r.index}</td>
                              <td style={{ padding: "6px 8px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {recipes?.map((x) => x.title).join(" / ") ?? "—"}
                              </td>
                              <td style={{ padding: "6px 8px" }}>{nff?.calories?.toFixed(0) ?? "—"}</td>
                              <td style={{ padding: "6px 8px" }}>{nff?.protein_g?.toFixed(1) ?? "—"}</td>
                              <td style={{ padding: "6px 8px" }}>{nff?.total_carbs_g?.toFixed(1) ?? "—"}</td>
                              <td style={{ padding: "6px 8px" }}>{nff?.total_fat_g?.toFixed(1) ?? "—"}</td>
                              <td style={{ padding: "6px 8px" }}>{nff?.total_sugars_g?.toFixed(1) ?? "—"}</td>
                              <td style={{ padding: "6px 8px", color: (warnings?.length ?? 0) > 0 ? "#e67e22" : "#ccc" }}>{warnings?.length ?? 0}</td>
                              <td style={{ padding: "6px 8px", color: "#ccc" }}>{r.duration_ms.toFixed(0)}</td>
                              <td style={{ padding: "6px 8px", color: "#e74c3c", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.error ?? ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>}

      </div>

      {/* Save button */}
      {tab === "config" && (
        <button onClick={handleSave} disabled={saving}
          style={{ position: "fixed", bottom: "24px", right: "24px", padding: "10px 22px", borderRadius: "8px", background: saved ? "#27ae60" : "#111", color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.15)", transition: "background 0.2s" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Settings"}
        </button>
      )}
    </div>
  );
}
