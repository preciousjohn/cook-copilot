// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for CookCopilot
// ─────────────────────────────────────────────────────────────────────────────

// ── User Profile ──────────────────────────────────────────────────────────────

export type Sex = "female" | "male" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type WeightGoal = "maintain" | "lose" | "gain";

/** Common food allergens */
export type Allergen =
  | "peanuts"
  | "tree_nuts"
  | "dairy"
  | "eggs"
  | "wheat_gluten"
  | "soy"
  | "fish"
  | "shellfish"
  | "sesame";

/** Medical conditions relevant to nutrition planning */
export type MedicalCondition =
  | "pregnancy"
  | "gestational_diabetes"
  | "type1_diabetes"
  | "type2_diabetes"
  | "hypertension"
  | "cardiovascular_disease"
  | "celiac_disease"
  | "ibs_ibd"
  | "kidney_disease"
  | "none";

/** Dietary preferences */
export type DietaryPreference =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "kosher"
  | "gluten_free";

export type UserProfile = {
  id: string;
  profileName: string;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  weightGoal: WeightGoal;
  // Extended clinical intake fields
  allergies: Allergen[];
  allergyOther: string; // free-text additional allergies
  medicalConditions: MedicalCondition[];
  dietaryPreferences: DietaryPreference[];
  notes: string;
  createdAtIso: string;
};

// ── Pipeline stage: Dietitian ─────────────────────────────────────────────────

export type MacroPercent = {
  carbs: number;
  protein: number;
  fat: number;
};

export type MacroGrams = {
  carbs_g: { min: number; max: number };
  protein_g: { min: number; max: number };
  fat_g: { min: number; max: number };
};

export type NutritionTargets = {
  kcal: { min: number; max: number };
  sugar_g: { min: number; max: number };
  composition: {
    method: string;
    macro_percent: MacroPercent;
    macro_grams: MacroGrams;
  };
};

export type DailyReference = {
  bmr: number;
  tdee: number;
  adjusted_tdee: number;
  daily_target: number;
  meal_fraction: number;
};

export type CalcStep = {
  step: string;
  value?: number | string;
  formula?: string;
  note?: string;
};

// ── Parsed prompt (from /api/parse) ──────────────────────────────────────────

export type ParsedPrompt = {
  meal_type: string;
  shape: string;
  ingredients: string[];
  menu: string;
};

export type DietitianResponse = {
  nutrition_targets: NutritionTargets;
  allergens: string[];
  daily_reference: DailyReference;
  meal_type: string; // "meal" | "snack"
  assumptions: string[];
  calculation_trace: CalcStep[];
};

// ── Pipeline stage: Chef ──────────────────────────────────────────────────────

export type SyringeSystemSpec = {
  syringe_id: number;
  paste_type: string;
  viscosity: string;
  tip_diameter_mm: number;
  extrusion_temp_c: number | null;
};

export type SyringeRecipe = {
  syringe_id: number;
  label: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  calculated_grams: number;
};

export type RetrievedChunk = {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
};

export type NutritionFacts = {
  serving_size_g: number;
  calories: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  cholesterol_mg: number;
  sodium_mg: number;
  total_carbs_g: number;
  dietary_fiber_g: number;
  total_sugars_g: number;
  protein_g: number;
  resolved_ingredients: string[];
};

export type ChefResponse = {
  menu_name: string;
  num_syringes: number;
  syringe_recipes: SyringeRecipe[];
  post_processing: string[];
  silhouette_image_b64: string | null;
  syringe_system_specs: SyringeSystemSpec[];
  validation_warnings: string[];
  retrieved_chunks?: RetrievedChunk[];
  nutrition_facts?: NutritionFacts | null;
};

// ── Pipeline stage: Engineer ──────────────────────────────────────────────────

export type EngineerMetadata = {
  shape: string;
  gcode_lines: number;
  estimated_print_time_seconds: number;
  width_mm: number;
  depth_mm: number;
  bed_position_mm: [number, number];
  num_tools: number;
  num_layers?: number;
  print_weight_g?: number;
  recipe_weight_g?: number;
  syringe1_print_weight_g?: number;
  syringe2_print_weight_g?: number;
  syringe1_recipe_weight_g?: number;
  syringe2_recipe_weight_g?: number;
};

export type EngineerResponse = {
  metadata: EngineerMetadata;
  warnings: string[];
  silhouette_image_b64: string;
  gcode: string;
  pieces?: number;
};

// ── Researcher pipeline log ───────────────────────────────────────────────────

export type PipelineLogEntry = {
  stage: "dietitian" | "chef" | "engineer";
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  timestamp: number;
  duration_ms: number;
};

// ── App Settings (researcher) ─────────────────────────────────────────────────

export type LLMProvider = "openai" | "anthropic" | "gemini";

export type SystemPrompts = {
  dietitian: string;
  chef: string;
  engineer: string;
};

export type ChefSectionsEnabled = {
  printer_context: boolean;
  food_safety_rules: boolean;
  food_design: boolean;
  supplementary: boolean;
  printability_check: boolean;
  food_safety_check: boolean;
  nutrition_rules: boolean;
};

export const CHEF_SECTION_KEYS = [
  "printer_context",
  "food_safety_rules",
  "food_design",
  "supplementary",
  "printability_check",
  "food_safety_check",
  "nutrition_rules",
] as const;

export type ChefSectionKey = (typeof CHEF_SECTION_KEYS)[number];

export const CHEF_SECTION_META: Record<ChefSectionKey, { label: string; tags: string[] }> = {
  printer_context:    { label: "Printer Context",   tags: ["Prompt"] },
  food_safety_rules:  { label: "Food Safety Rules", tags: ["Prompt"] },
  food_design:        { label: "Food Design",        tags: ["Prompt"] },
  supplementary:      { label: "Supplementary",      tags: ["Prompt"] },
  printability_check: { label: "Printability",       tags: ["Prompt", "RAG"] },
  food_safety_check:  { label: "Food Safety Check",  tags: ["Prompt", "RAG"] },
  nutrition_rules:    { label: "Nutrition Rules",    tags: ["Prompt", "API"] },
};

export type AppSettings = {
  llm_provider: LLMProvider;
  llm_model: string;
  use_rag: boolean;
  rag_sources_enabled: string[];
  system_prompts: SystemPrompts;
  // Evaluation / ablation controls
  chef_sections_enabled: ChefSectionsEnabled;
  chef_sections_content: Record<ChefSectionKey, string>;
  skip_dietitian: boolean;
  use_usda_api: boolean;
};

// ── Batch run ─────────────────────────────────────────────────────────────────

export type BatchRunResult = {
  index: number;
  prompt: string;
  output: Record<string, unknown>;
  duration_ms: number;
  error?: string | null;
};

export type BatchJob = {
  run_id: string;
  stage: "dietitian" | "chef";
  n: number;
  status: "running" | "done" | "error";
  completed: number;
  results: BatchRunResult[];
  started_at: number;
  finished_at?: number | null;
  error?: string | null;
};

export type RAGSource = {
  filename: string;
  enabled: boolean;
  size_bytes: number;
  chunk_count: number;
};

// ── Wizard step ───────────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
