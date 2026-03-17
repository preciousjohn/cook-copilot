"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Wizard store — central state for the entire CookCopilot wizard flow
//
// Persisted to localStorage (via Zustand persist middleware):
//   - currentStep, profiles, selectedProfileId
//
// Session-only (cleared on "Start over"):
//   - prompt, dietitianOutput, chefOutput, engineerOutput, gcode, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "../lib/formatters";
import type {
  WizardStep,
  UserProfile,
  ParsedPrompt,
  DietitianResponse,
  ChefResponse,
  EngineerResponse,
  PipelineLogEntry,
} from "../lib/types";

// ── Default empty profile for the creation form ───────────────────────────────

export function makeEmptyProfile(): Omit<UserProfile, "id" | "createdAtIso"> {
  return {
    profileName: "",
    sex: "other",
    weightKg: 0,
    heightCm: 0,
    age: 0,
    activityLevel: "moderate",
    weightGoal: "maintain",
    allergies: [],
    allergyOther: "",
    medicalConditions: [],
    dietaryPreferences: [],
    notes: "",
  };
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface WizardState {
  // ── Navigation ──────────────────────────────────────────────────────────────
  currentStep: WizardStep;
  goToStep: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;

  // ── Profiles (persisted) ────────────────────────────────────────────────────
  profiles: UserProfile[];
  selectedProfileId: string | null;
  addProfile: (data: Omit<UserProfile, "id" | "createdAtIso">) => UserProfile;
  updateProfile: (id: string, data: Partial<UserProfile>) => void;
  deleteProfile: (id: string) => void;
  selectProfile: (id: string | null) => void;
  getSelectedProfile: () => UserProfile | null;

  // ── Session: prompt ─────────────────────────────────────────────────────────
  prompt: string;
  setPrompt: (p: string) => void;

  // ── Session: parsed prompt (from /api/parse) ─────────────────────────────────
  parsedPrompt: ParsedPrompt | null;
  setParsedPrompt: (p: ParsedPrompt) => void;

  // ── Session: pipeline outputs ───────────────────────────────────────────────
  dietitianOutput: DietitianResponse | null;
  chefOutput: ChefResponse | null;
  engineerOutput: EngineerResponse | null;
  gcode: string;
  silhouetteB64: string | null;

  setDietitianOutput: (d: DietitianResponse) => void;
  setChefOutput: (c: ChefResponse) => void;
  setEngineerOutput: (e: EngineerResponse) => void;
  setGcode: (g: string) => void;

  // ── Session: loading / error per stage ──────────────────────────────────────
  stepLoading: Record<"dietitian" | "chef" | "engineer", boolean>;
  stepError: Record<"dietitian" | "chef" | "engineer", string | null>;
  setStepLoading: (stage: "dietitian" | "chef" | "engineer", v: boolean) => void;
  setStepError: (stage: "dietitian" | "chef" | "engineer", msg: string | null) => void;

  // ── Session: researcher pipeline log ────────────────────────────────────────
  pipelineLog: PipelineLogEntry[];
  appendLog: (entry: PipelineLogEntry) => void;
  clearLog: () => void;

  // ── Engineer controls ────────────────────────────────────────────────────────
  emValues: number[];
  lhValue: number;
  setEmValues: (v: number[]) => void;
  setLhValue: (v: number) => void;

  // ── Session management ───────────────────────────────────────────────────────
  /** Clear all pipeline session data and return to the prompt step */
  startOver: () => void;
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      // ── Navigation ────────────────────────────────────────────────────────────
      currentStep: 1,
      goToStep: (step) => set({ currentStep: step }),
      goNext: () =>
        set((s) => ({
          currentStep: Math.min(s.currentStep + 1, 6) as WizardStep,
        })),
      goBack: () =>
        set((s) => ({
          currentStep: Math.max(s.currentStep - 1, 1) as WizardStep,
        })),

      // ── Profiles ──────────────────────────────────────────────────────────────
      profiles: [],
      selectedProfileId: null,

      addProfile: (data) => {
        const profile: UserProfile = {
          ...data,
          id: uid(),
          createdAtIso: new Date().toISOString(),
        };
        set((s) => ({ profiles: [...s.profiles, profile] }));
        return profile;
      },

      updateProfile: (id, data) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),

      deleteProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          selectedProfileId:
            s.selectedProfileId === id ? null : s.selectedProfileId,
        })),

      selectProfile: (id) => set({ selectedProfileId: id }),

      getSelectedProfile: () => {
        const { profiles, selectedProfileId } = get();
        return profiles.find((p) => p.id === selectedProfileId) ?? null;
      },

      // ── Prompt ────────────────────────────────────────────────────────────────
      prompt: "",
      setPrompt: (p) => set({ prompt: p }),

      // ── Parsed prompt ─────────────────────────────────────────────────────────
      parsedPrompt: null,
      setParsedPrompt: (p) => set({ parsedPrompt: p }),

      // ── Pipeline outputs ──────────────────────────────────────────────────────
      dietitianOutput: null,
      chefOutput: null,
      engineerOutput: null,
      gcode: "",
      silhouetteB64: null,

      setDietitianOutput: (d) => set({ dietitianOutput: d }),
      setChefOutput: (c) =>
        set({
          chefOutput: c,
          // Initialise EM values based on number of syringes
          emValues: Array(c.num_syringes).fill(0.01),
          silhouetteB64: c.silhouette_image_b64,
        }),
      setEngineerOutput: (e) =>
        set({
          engineerOutput: e,
          gcode: e.gcode,
          silhouetteB64: e.silhouette_image_b64,
        }),
      setGcode: (g) => set({ gcode: g }),

      // ── Loading / error ───────────────────────────────────────────────────────
      stepLoading: { dietitian: false, chef: false, engineer: false },
      stepError: { dietitian: null, chef: null, engineer: null },

      setStepLoading: (stage, v) =>
        set((s) => ({
          stepLoading: { ...s.stepLoading, [stage]: v },
        })),
      setStepError: (stage, msg) =>
        set((s) => ({
          stepError: { ...s.stepError, [stage]: msg },
        })),

      // ── Pipeline log ──────────────────────────────────────────────────────────
      pipelineLog: [],
      appendLog: (entry) =>
        set((s) => ({ pipelineLog: [...s.pipelineLog, entry] })),
      clearLog: () => set({ pipelineLog: [] }),

      // ── Engineer controls ─────────────────────────────────────────────────────
      emValues: [0.01, 0.01],
      lhValue: 1.0,
      setEmValues: (v) => set({ emValues: v }),
      setLhValue: (v) => set({ lhValue: v }),

      // ── Start over ────────────────────────────────────────────────────────────
      startOver: () =>
        set({
          prompt: "",
          parsedPrompt: null,
          dietitianOutput: null,
          chefOutput: null,
          engineerOutput: null,
          gcode: "",
          silhouetteB64: null,
          stepLoading: { dietitian: false, chef: false, engineer: false },
          stepError: { dietitian: null, chef: null, engineer: null },
          pipelineLog: [],
          emValues: [0.01, 0.01],
          lhValue: 1.0,
          currentStep: 3, // Return to prompt step with same profile
        }),
    }),
    {
      name: "cookpilot-wizard-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      // Only persist navigation state and profiles — NOT session pipeline data
      partialize: (state) => ({
        currentStep: state.currentStep,
        profiles: state.profiles,
        selectedProfileId: state.selectedProfileId,
      }),
    }
  )
);
