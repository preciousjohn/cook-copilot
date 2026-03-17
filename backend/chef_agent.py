"""
Chef Agent — syringe recipe generation for food 3D printing.

propose() generates paste recipes for each syringe based on nutrition targets.
A silhouette image is generated via OpenAI image generation for shape preview and GCode path tracing.
"""

from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv
from nutrition_analyzer import fetch_ingredient_profiles


load_dotenv()
client = OpenAI()


# ═══════════════════════════════════════════════════════════════════════
# Structured Output Models
# ═══════════════════════════════════════════════════════════════════════

_SYRINGE_LABELS = ["Protein-rich Paste", "Carb-rich Paste"]


class IngredientPlan(BaseModel):
    syringe1_ingredients: List[str]  # main ingredient names only, e.g. ["cream cheese", "Greek yogurt"]
    syringe2_ingredients: List[str]  # e.g. ["banana", "oat flour"]


class IngredientGrams(BaseModel):
    name: str = Field(description="Ingredient name — plain words only, no parentheses or notes (e.g. 'Greek yogurt', not 'Greek yogurt (plain)')")
    grams: float = Field(description="Amount in grams")


class RecipeInstructions(BaseModel):
    """LLM output: gram amounts, naming, cooking instructions, and post-processing."""
    menu_name: str = Field(
        description="Simple dish-style name (e.g. 'Banana Cream Snack')")
    syringe1_title: str = Field(
        description="Short flavor name ending with 'Flavor'")
    syringe1_ingredients: List[IngredientGrams] = Field(
        description="Gram amounts for each ingredient in syringe 1")
    syringe1_instructions: List[str] = Field(
        description="Step-by-step cooking instructions for syringe 1 (max 4 steps)")
    syringe2_title: str = Field(
        description="Short flavor name ending with 'Flavor'")
    syringe2_ingredients: List[IngredientGrams] = Field(
        description="Gram amounts for each ingredient in syringe 2")
    syringe2_instructions: List[str] = Field(
        description="Step-by-step cooking instructions for syringe 2 (max 4 steps)")
    post_processing: List[str] = Field(
        description="Post-print heating instructions ONLY. Do NOT include allergen notes, ingredient substitution notes, or any other information here.")


# ═══════════════════════════════════════════════════════════════════════
# Chef System Prompt — named sections for ablation / evaluation
# ═══════════════════════════════════════════════════════════════════════

# Each key is a toggleable section. Order here determines prompt order.
CHEF_SECTIONS: dict[str, str] = {
    "printer_context": """\
## PRINTER CONTEXT
You design food paste recipes that can be loaded into syringes of a Food 3D printer.
Your primary goal is to create food paste that is delicious — not just nutritionally correct.
- Syringe-based extrusion.
- Pastes must be smooth enough to extrude through a nozzle (2.5mm tip).
- Good consistency: (e.g. thick yogurt, hummus).
- Avoid chunks, seeds, or fibrous pieces that clog the nozzle. (e.g. no peanut butter with bits, no chunky salsa, garlic must be grated, use oat flour instead of rolled oats, etc.)""",

    "food_safety_rules": """\
## FOOD SAFETY RULES
The following must never be consumed raw — always fully cook before use or recommend heating in post-processing:
raw flour, raw eggs, raw poultry, raw pork, raw beans (especially kidney beans), unprocessed cassava""",

    "food_design": """\
## FOOD DESIGN
### FLAVOR PHILOSOPHY
- Printed portions are small. You cannot rely on large volumes to deliver flavor.
- Compensate with bold seasoning: use spices, herbs, citrus zest, miso, vanilla, cinnamon, etc.
- Flavor must be concentrated in the paste itself — think flavor-forward, not bland health food.
- Keep it healthy: prefer natural spices and aromatics over added sugar, excessive salt, or fat.
- If a Requested menu is specified, treat it as the dish concept: use its characteristic ingredients and reflect its flavor profile in the recipe. Name the dish accordingly (e.g. "Requested menu: banana pancake" → use banana + oat flour, name it "Banana Pancake Snack").

### VISUAL APPEARANCE
- The printed food should look visually appealing and match the shape's color theme.
- Choose ingredients whose natural color complements the shape (e.g. sun/star → yellow: banana, egg yolk, pumpkin; heart → red/pink: strawberry, beet, tomato; leaf/tree → green: spinach, matcha, edamame; cloud/moon → white/cream: cream cheese, cauliflower, tofu).
- Consider the combined color of both syringes — aim for a harmonious or contrasting palette that is visually attractive when printed.""",

    "supplementary": """\
## SUPPLEMENTARY CONTEXT
### INGREDIENT DIVERSITY
- Syringe 1: PROTEIN-RICH paste (e.g. cream cheese, Greek yogurt, tofu, bean paste)
- Syringe 2: CARBS-RICH paste (e.g. mashed potato, banana, sweet potato, rice paste)

### INGREDIENT RULES
- Use ONLY ingredients available at a typical grocery store.
- Simple, everyday ingredients only (eggs, butter, milk, oats, cream cheese, banana, potato, etc.).""",

    # generation-only sections (not used in planning step)
    "printability_check": """\
## PRINTABILITY CHECK
Target consistency: yogurt to mashed potato range, 100–20,000 cP (pourable but holds shape when extruded).
After selecting ingredients, check the KNOWLEDGE BASE CONTEXT for viscosity values (cP) of your chosen ingredients.
- If viscosity is too high (e.g. >20,000 cP — cottage cheese): thin it out — include as an ingredient with quantity.
  - Water-based paste (yogurt, bean, tofu): add water or broth.
  - Fat/oil-based paste (cream cheese, nut butter): add oil or milk.
- If viscosity is too low (e.g. <100 cP — fruit juice, oil): thicken with flour or starch, include as an ingredient with quantity.""",

    "food_safety_check": """\
## FOOD SAFETY CHECK
After selecting ingredients, check the KNOWLEDGE BASE CONTEXT for USDA safe minimum internal temperatures.
- If any ingredient requires heat-treatment, post_processing MUST specify heating method and duration sufficient to reach that temperature.
- If no heat-sensitive raw ingredients are used, state "No heating required — serve immediately after printing."
- When in doubt, recommend heating.""",

    "nutrition_rules": """\
## NUTRITION RULES
### HARD CONSTRAINTS (non-negotiable)
- Allergens listed MUST be completely avoided.
- TOTAL kcal MUST be within the target kcal range.
- TOTAL sugar MUST be under the sugar cap.

### SOFT CONSTRAINTS (best-effort)
- Per syringe kcal is a guideline; adjust gram amounts to hit the total kcal target first.
- Macro ranges (protein / carbs / fat) are targets, not hard limits.
- Include requested ingredients if possible; skip if they conflict with allergens or printability.

Before finalising gram amounts, verify your recipe against the targets using RETRIEVED NUTRITION DATA:
1. For each ingredient, compute: (grams / 100) × kcal_per_100g → ingredient kcal contribution.
2. Sum across all ingredients → total kcal. Adjust gram amounts until total kcal is within the target range.
3. Repeat the same check for protein, carbs, fat, and sugar using the per-100g values in RETRIEVED NUTRITION DATA.

## FORMATTING RULES
### NAMING RULES
- menu_name: Simple dish-style name that describes the main ingredients (e.g. "Banana Cream Snack", "Sweet Potato Protein Bite", "Oat & Cheese Snack"). No poetic or abstract titles.

### OUTPUT STYLE
- ingredient names: use only simple, generic names that USDA FoodData Central would recognise (e.g. "banana", "cream cheese", "oat flour"). No parentheses, no adjectives, no preparation notes.
- instructions: max 4 steps per syringe, one short sentence each.
- post_processing: Heating instructions ONLY. Do NOT write allergen notes, substitution notes, or disclaimers here. State only whether heating is required and if so, how (e.g. "Heat in microwave for 30 seconds before serving." or "No heating required — serve immediately after printing.").""",
}

# Sections used in each step (plan = ingredient selection, generate = full recipe)
_PLAN_SECTION_KEYS = ["printer_context", "food_safety_rules", "food_design", "supplementary"]
_GEN_SECTION_KEYS = _PLAN_SECTION_KEYS + ["printability_check", "food_safety_check", "nutrition_rules"]

_PLAN_INGREDIENTS_EXTRA = """
## NUTRITION RULES
### HARD CONSTRAINTS (non-negotiable)
- Allergens listed MUST be completely avoided.

### SOFT CONSTRAINTS (best-effort)
- If a Requested menu is specified, choose ingredients that are characteristic of that dish (e.g. "banana pancake" → banana, oat flour, egg).
- Prefer ingredients that match any requested ingredients listed by the user.

## YOUR TASK
- List the 2–4 main ingredient names for each syringe.
- Output the base ingredient name only — no quantities, no instructions, no adjectives.
- Strip preparation/form descriptors: write "chickpea" not "canned chickpea", "potato" not "mashed potato", "tuna" not "canned tuna".
- Use only simple, generic names that USDA FoodData Central would recognise (e.g. "banana", "cream cheese", "oat flour")."""


def build_prompt(
    step: str,
    enabled: dict[str, bool] | None = None,
    content_overrides: dict[str, str] | None = None,
) -> str:
    """Build the system prompt for the given step, filtering by enabled sections.

    Args:
        step: "plan" or "generate"
        enabled: per-section bool flags (True = include). Defaults all True.
        content_overrides: per-section custom text. Falls back to CHEF_SECTIONS[key].
    Returns:
        Assembled system prompt string.
    """
    keys = _PLAN_SECTION_KEYS if step == "plan" else _GEN_SECTION_KEYS
    parts = []
    for key in keys:
        if enabled and not enabled.get(key, True):
            continue
        text = (content_overrides or {}).get(key) or CHEF_SECTIONS[key]
        parts.append(text)
    return "\n\n".join(parts)


# Legacy alias — full prompt with all sections enabled (used externally if needed)
RECIPE_GENERATION_PROMPT = build_prompt("generate")


# ═══════════════════════════════════════════════════════════════════════
# propose() — 3-step pipeline
# ═══════════════════════════════════════════════════════════════════════

def propose(
    requirement: Dict[str, Any],
    dietitian_output: Dict[str, Any],
    use_kb: bool = False,
    kb_paths: Optional[List[str]] = None,
    model: str = "gpt-4o-mini",
    sections_enabled: Optional[Dict[str, bool]] = None,
    sections_content: Optional[Dict[str, str]] = None,
    use_usda_api: bool = True,
) -> Dict[str, Any]:
    """Generate syringe recipes based on requirement and dietitian targets.

    Three-step flow:
      1. Ingredient planning — LLM decides which ingredients to use.
      2. RAG + API — fetch viscosity/temperature from KB, nutrients from USDA.
      3. Recipe generation — LLM decides gram amounts + instructions with retrieved data.
    """
    # Step 1: Ingredient planning
    plan = _plan_ingredients(requirement, dietitian_output, model, sections_enabled, sections_content)
    print(f"[Chef] Ingredient plan — S1: {plan.syringe1_ingredients}, S2: {plan.syringe2_ingredients}")

    # Step 2: RAG + USDA API
    # Skip USDA API if disabled (ablation: nutrition_rules section off)
    if use_usda_api:
        profiles = fetch_ingredient_profiles(plan.syringe1_ingredients, plan.syringe2_ingredients)
        print(f"[Chef] Resolved {len(profiles)} USDA profiles")
    else:
        profiles = []
        print("[Chef] USDA API disabled — skipping nutrition fetch")

    # Only retrieve RAG for sections that are enabled
    rag_enabled = use_kb and kb_paths
    food_safety_rag = rag_enabled and (sections_enabled is None or sections_enabled.get("food_safety_check", True))
    printability_rag = rag_enabled and (sections_enabled is None or sections_enabled.get("printability_check", True))
    filtered_kb_paths = [
        p for p in (kb_paths or [])
        if (printability_rag and "viscosity" in p) or (food_safety_rag and "temperature" in p)
    ]
    kb_context, all_chunks = _retrieve_kb_context(plan, filtered_kb_paths) if filtered_kb_paths else ("", [])

    # Step 3: Recipe generation
    instructions = _generate_instructions(
        requirement, dietitian_output, plan, profiles, kb_context, model, sections_enabled, sections_content
    )

    # Step 4: Silhouette image generation
    silhouette = _generate_silhouette_image(requirement)

    # Re-fetch USDA profiles for accurate nutrition calculation (skip if API disabled)
    if use_usda_api:
        s1_names = [item.name for item in instructions.syringe1_ingredients]
        s2_names = [item.name for item in instructions.syringe2_ingredients]
        final_profiles = fetch_ingredient_profiles(s1_names, s2_names)
        print(f"[Chef] Resolved {len(final_profiles)} USDA profiles for nutrition calculation")
    else:
        final_profiles = []

    result = _assemble_chef_output(instructions, final_profiles, silhouette)
    result["retrieved_chunks"] = all_chunks
    return result


def _plan_ingredients(
    requirement: Dict[str, Any],
    dietitian_output: Dict[str, Any],
    model: str,
    sections_enabled: Optional[Dict[str, bool]] = None,
    sections_content: Optional[Dict[str, str]] = None,
) -> IngredientPlan:
    """Step 1 — LLM decides main ingredients per syringe."""
    user_message = _build_chef_user_message(requirement, dietitian_output)
    plan_prompt = build_prompt("plan", sections_enabled, sections_content) + _PLAN_INGREDIENTS_EXTRA
    response = client.responses.parse(
        model=model,
        input=[
            {"role": "system", "content": plan_prompt},
            {"role": "user", "content": user_message},
        ],
        text_format=IngredientPlan,
    )
    return response.output_parsed


def _retrieve_kb_context(
    plan: IngredientPlan,
    kb_paths: List[str],
) -> tuple:
    """Step 2a — Query KB for viscosity and temperature context for each ingredient.

    Returns (kb_context_str, all_chunks_list).
    """
    from rag import kb_store

    all_ingredients = plan.syringe1_ingredients + plan.syringe2_ingredients
    temperature_queries = [f"{ing} minimum internal temperature cooking safe" for ing in all_ingredients]
    viscosity_queries = [f"{ing} viscosity cP consistency" for ing in all_ingredients]

    def _queries_for_kb(kb_path: str) -> list:
        return viscosity_queries if "viscosity" in kb_path else temperature_queries

    all_context = []
    all_chunks: list = []
    for kb_path in kb_paths:
        for q in _queries_for_kb(kb_path):
            try:
                chunks = kb_store.retrieve_with_scores(kb_path, q, top_k=3)
                relevant = [c for c in chunks if c["score"] >= 0.2]
                all_chunks.extend(relevant)
                if relevant:
                    parts = []
                    for i, chunk in enumerate(relevant, 1):
                        heading = chunk["metadata"].get("heading", "")
                        parts.append(
                            f"[Retrieved Chunk {i} | Section: {heading} | score={chunk['score']:.2f}]\n"
                            f"{chunk['content']}"
                        )
                    all_context.append("\n\n---\n\n".join(parts))
            except Exception:
                pass

    return "\n\n---\n\n".join(all_context) if all_context else "", all_chunks


# ═══════════════════════════════════════════════════════════════════════
# Internal Helpers
# ═══════════════════════════════════════════════════════════════════════

def _build_chef_user_message(requirement, dietitian_output):
    """Build the user message for recipe generation."""
    lines = []

    nt = dietitian_output.get("nutrition_targets", {})
    kcal = nt.get("kcal", {})
    kcal_min, kcal_max = kcal.get("min", 100), kcal.get("max", 200)
    kcal_mid = (kcal_min + kcal_max) / 2
    sugar_max = nt.get("sugar_g", {}).get("max", 10)
    comp = nt.get("composition", {})
    mg = comp.get("macro_grams", {})
    constraints = requirement.get("constraints", {})

    # User Context
    lines.append("## User Context")
    age = requirement.get("age", 0)
    sex = requirement.get("sex", "")
    user_parts = [p for p in [sex, f"{age} years old" if age else ""] if p]
    lines.append(f"User: {', '.join(user_parts) if user_parts else 'unknown'}")
    medical = constraints.get("medical_conditions", [])
    lines.append(f"Medical conditions: {', '.join(medical) if medical else 'none'}")
    allergens = constraints.get("allergens", [])
    lines.append(f"Allergens: {', '.join(allergens) if allergens else 'none'}")

    # Meal Preferences
    lines.append("\n## Meal Preferences")
    lines.append(f"Meal type: {requirement.get('meal_type', 'unknown')}")
    dietary_prefs = constraints.get("dietary_preferences", [])
    lines.append(f"Dietary preferences: {', '.join(dietary_prefs) if dietary_prefs else 'none'}")
    requested = requirement.get("requested_ingredients", [])
    lines.append(f"Requested ingredients: {', '.join(requested) if requested else 'none'} (include at least one in either syringe — not required in both)")
    menu = requirement.get("requested_menu", "")
    if menu:
        lines.append(f"Requested menu: {menu}")
    shape = requirement.get("shape", {})
    lines.append(f"Shape: {shape.get('custom_text', 'N/A')}")

    # Nutrition Targets
    lines.append("\n## Nutrition Targets")
    lines.append(f"TOTAL kcal: {kcal_min}–{kcal_max}")
    lines.append(f"TOTAL sugar: under {sugar_max}g")
    lines.append(f"Per syringe: ~{kcal_mid/2:.0f} kcal")
    if mg:
        def _rng(d): return f"{d['min']}–{d['max']}g"
        lines.append(f"Macros: protein {_rng(mg['protein_g'])} / carbs {_rng(mg['carbs_g'])} / fat {_rng(mg['fat_g'])}")

    return "\n".join(lines)


def _generate_instructions(
    requirement: Dict[str, Any],
    dietitian_output: Dict[str, Any],
    ingredient_plan: IngredientPlan,
    profiles: list,
    kb_context: str,
    model: str,
    sections_enabled: Optional[Dict[str, bool]] = None,
    sections_content: Optional[Dict[str, str]] = None,
) -> RecipeInstructions:
    """LLM call: decide gram amounts and generate instructions using USDA per-100g data."""
    # User message: shape, user context, constraints, macros, pre-selected ingredients
    user_lines: list = [_build_chef_user_message(requirement, dietitian_output)]
    s1 = ", ".join(ingredient_plan.syringe1_ingredients)
    s2 = ", ".join(ingredient_plan.syringe2_ingredients)
    user_lines.append(
        f"\n## PRE-SELECTED BASE INGREDIENTS\n"
        f"Use these as your primary base ingredients:\n"
        f"- Syringe 1: {s1}\n"
        f"- Syringe 2: {s2}"
    )
    user_message = "\n".join(user_lines)

    # System prompt: base + USDA data + KB context
    sys_lines: list = [build_prompt("generate", sections_enabled, sections_content)]

    if profiles:
        sys_lines.append("\n## RETRIEVED NUTRITION DATA (per 100g, from USDA FoodData Central)")
        for p in profiles:
            sys_lines.append(
                f"- {p.name}: {p.calories:.0f} kcal, "
                f"protein {p.protein_g:.1f}g, carbs {p.total_carbs_g:.1f}g, "
                f"fat {p.total_fat_g:.1f}g, sugar {p.total_sugars_g:.1f}g "
                f"(syringe {p.syringe})"
            )

    if kb_context:
        sys_lines.append(f"\n## KNOWLEDGE BASE CONTEXT\n{kb_context}")

    system = "\n".join(sys_lines)

    response = client.responses.parse(
        model=model,
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        text_format=RecipeInstructions,
    )
    return response.output_parsed


def _assemble_chef_output(
    instructions: RecipeInstructions,
    profiles: list,
    silhouette: Optional[str],
) -> Dict[str, Any]:
    """Assemble the final output dict from RecipeInstructions + USDA profiles."""
    syringe_recipes = []

    for i, (ing_list, title, steps) in enumerate([
        (instructions.syringe1_ingredients,
         instructions.syringe1_title, instructions.syringe1_instructions),
        (instructions.syringe2_ingredients,
         instructions.syringe2_title, instructions.syringe2_instructions),
    ], start=1):
        ing_strings = []
        total_g = 0.0
        for item in ing_list:
            ing_strings.append(f"{item.grams:.0f}g {item.name}")
            total_g += item.grams

        syringe_recipes.append({
            "syringe_id": i,
            "label": _SYRINGE_LABELS[i - 1] if i <= len(_SYRINGE_LABELS) else f"Paste {i}",
            "title": title,
            "ingredients": ing_strings,
            "instructions": steps,
            "calculated_grams": round(total_g, 1),
        })

    # Compute nutrition_facts from LLM-decided gram amounts + USDA profiles
    profile_map = {p.name.lower(): p for p in profiles} if profiles else {}
    _NUTRITION_FIELDS = [
        "calories", "protein_g", "total_fat_g", "saturated_fat_g",
        "trans_fat_g", "cholesterol_mg", "sodium_mg", "total_carbs_g",
        "dietary_fiber_g", "total_sugars_g",
    ]
    totals: Dict[str, float] = {f: 0.0 for f in _NUTRITION_FIELDS}
    total_weight = 0.0
    resolved = []

    all_items = list(instructions.syringe1_ingredients) + list(instructions.syringe2_ingredients)
    for item in all_items:
        resolved.append(f"{item.grams:.0f}g {item.name}")
        total_weight += item.grams
        p = profile_map.get(item.name.lower())
        if p:
            scale = item.grams / 100.0
            for fld in _NUTRITION_FIELDS:
                totals[fld] += getattr(p, fld, 0.0) * scale

    nutrition_facts = {
        "serving_size_g": round(total_weight, 1),
        **{k: round(v, 1) for k, v in totals.items()},
        "resolved_ingredients": resolved,
    }

    return {
        "menu_name": instructions.menu_name,
        "num_syringes": 2,
        "syringe_recipes": syringe_recipes,
        "post_processing": instructions.post_processing,
        "silhouette_image_b64": silhouette,
        "nutrition_facts": nutrition_facts,
    }


def _generate_silhouette_image(requirement: Dict[str, Any]) -> Optional[str]:
    """Generate a black silhouette on white background for Engineer GCode path tracing."""
    try:
        shape = requirement.get("shape", {}).get("custom_text", "round shape")

        prompt = (
            f"A simple cookie cutter shape of a {shape}. "
            f"Solid black (#000000) filled shape on pure white (#FFFFFF) background. "
            f"Minimal, abstract silhouette — no details, no texture, no internal lines. "
            f"Like a flat rubber stamp. Centered, 2D."
        )
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
            quality="low",
        )
        return response.data[0].b64_json
    except Exception as e:
        print(f"[Chef] Silhouette image generation failed: {e}")
        return None