// ─────────────────────────────────────────────────────────────────────────────
// Typed API client — wraps all backend endpoints
// ─────────────────────────────────────────────────────────────────────────────

import type {
  UserProfile,
  ParsedPrompt,
  DietitianResponse,
  NutritionTargets,
  ChefResponse,
  EngineerResponse,
  AppSettings,
  RAGSource,
  SyringeRecipe,
  BatchJob,
} from "./types";
import { formatProfileForAPI } from "./formatters";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

// ── Core pipeline endpoints ───────────────────────────────────────────────────

/** Parse the user's food request: extract shape, meal_type, ingredients, menu */
export async function runParse(prompt: string): Promise<ParsedPrompt> {
  return post<ParsedPrompt>("/api/parse", { prompt });
}

/** Run the Dietitian AI stage: calculates nutrition targets from profile */
export async function runDietitian(
  profile: UserProfile,
  mealType: string = ""
): Promise<DietitianResponse> {
  return post<DietitianResponse>("/api/dietitian", {
    profile: formatProfileForAPI(profile),
    meal_type: mealType,
  });
}

/** Run the Chef AI stage: designs syringe recipes meeting nutrition targets */
export async function runChef(
  nutritionTargets: NutritionTargets,
  allergens: string[] = [],
  age: number = 0,
  sex: string = "",
  dietaryPreferences: string[] = [],
  shape: string = "",
  mealType: string = "",
  requestedIngredients: string[] = [],
  requestedMenu: string = ""
): Promise<ChefResponse> {
  return post<ChefResponse>("/api/chef", {
    nutrition_targets: nutritionTargets,
    allergens,
    age,
    sex,
    dietary_preferences: dietaryPreferences,
    shape,
    meal_type: mealType,
    requested_ingredients: requestedIngredients,
    requested_menu: requestedMenu,
  });
}

/** Run the Engineer AI stage: generates GCode from recipes */
export async function runEngineer(
  prompt: string,
  chefOutput: ChefResponse,
  age: number = 0,
  mealType: string = ""
): Promise<EngineerResponse> {
  return post<EngineerResponse>("/api/engineer", {
    prompt,
    recipes: chefOutput,
    age,
    meal_type: mealType,
  });
}

/** Regenerate GCode with updated extrusion/layer-height parameters */
export async function regenerateGCode(params: {
  syringe_recipes: SyringeRecipe[];
  silhouette_b64: string;
  em_values: number[];
  lh: number;
}): Promise<{ gcode: string }> {
  return post<{ gcode: string }>("/api/gcode/regenerate", params);
}

// ── Profile endpoints ─────────────────────────────────────────────────────────

export async function fetchProfiles(): Promise<UserProfile[]> {
  return get<UserProfile[]>("/api/profiles");
}

export async function createProfile(profile: Omit<UserProfile, "id" | "createdAtIso">): Promise<UserProfile> {
  return post<UserProfile>("/api/profiles", profile);
}

export async function updateProfile(id: string, profile: Partial<UserProfile>): Promise<UserProfile> {
  return put<UserProfile>(`/api/profiles/${id}`, profile);
}

export async function deleteProfile(id: string): Promise<void> {
  return del(`/api/profiles/${id}`);
}

// ── Settings endpoints ────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<AppSettings> {
  return get<AppSettings>("/api/settings");
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  return put<AppSettings>("/api/settings", settings);
}

export async function fetchChefSections(): Promise<Record<string, string>> {
  return get<Record<string, string>>("/api/chef/sections");
}

// ── RAG source endpoints ──────────────────────────────────────────────────────

export async function fetchRAGSources(): Promise<RAGSource[]> {
  return get<RAGSource[]>("/api/rag/sources");
}

export async function toggleRAGSource(filename: string): Promise<RAGSource> {
  return put<RAGSource>(`/api/rag/sources/${encodeURIComponent(filename)}/toggle`, {});
}

export async function deleteRAGSource(filename: string): Promise<void> {
  return del(`/api/rag/sources/${encodeURIComponent(filename)}`);
}

// ── Batch run endpoints ───────────────────────────────────────────────────────

export async function startBatchRun(params: {
  n: number;
  stage: "dietitian" | "chef";
  inputs: Array<{ prompt: string; profile: Omit<UserProfile, "id" | "createdAtIso"> }>;
}): Promise<{ run_id: string; n: number; stage: string; status: string }> {
  return post("/api/batch/run", params);
}

export async function fetchBatchRun(runId: string): Promise<BatchJob> {
  return get<BatchJob>(`/api/batch/${runId}`);
}

export async function fetchBatchList(): Promise<BatchJob[]> {
  return get<BatchJob[]>("/api/batch");
}

// ── RAG source endpoints ──────────────────────────────────────────────────────

export async function uploadRAGSource(file: File, folder: string = ""): Promise<RAGSource> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch(`${BASE}/api/rag/sources/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<RAGSource>;
}
