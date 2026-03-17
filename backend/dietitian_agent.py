"""
Dietitian Agent — nutrition calculation pipeline.

Deterministic BMR/TDEE math (Mifflin-St Jeor), illness adjustment (LLM+RAG),
and macro target generation. propose() is the main entry point.
"""

from __future__ import annotations

from typing import Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv


load_dotenv()
client = OpenAI()


# ═══════════════════════════════════════════════════════════════════════
# 1. Deterministic Calculation Functions (UNCHANGED from v2)
# ═══════════════════════════════════════════════════════════════════════

def calc_bmr_mifflin(sex: str, weight_kg: float, height_cm: float, age_years: int) -> Tuple[float, str]:
    if sex == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age_years + 5
        eq = f"10 × {weight_kg} + 6.25 × {height_cm} - 5 × {age_years} + 5 = {bmr:.1f}"
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age_years - 161
        eq = f"10 × {weight_kg} + 6.25 × {height_cm} - 5 × {age_years} - 161 = {bmr:.1f}"
    return round(bmr, 1), eq


def calc_bmr_pediatric(sex: str, weight_kg: float, height_cm: float, age_years: int) -> Tuple[float, str]:
    if age_years < 3:
        if sex == "male":
            bmr = 60.9 * weight_kg - 54
            eq = f"Schofield <3y male: 60.9 × {weight_kg} - 54 = {bmr:.1f}"
        else:
            bmr = 61.0 * weight_kg - 51
            eq = f"Schofield <3y female: 61.0 × {weight_kg} - 51 = {bmr:.1f}"
    elif age_years < 10:
        if sex == "male":
            bmr = 22.7 * weight_kg + 495
            eq = f"Schofield 3-10y male: 22.7 × {weight_kg} + 495 = {bmr:.1f}"
        else:
            bmr = 22.5 * weight_kg + 499
            eq = f"Schofield 3-10y female: 22.5 × {weight_kg} + 499 = {bmr:.1f}"
    else:
        return calc_bmr_mifflin(sex, weight_kg, height_cm, age_years)
    return round(bmr, 1), eq


ACTIVITY_FACTORS = {
    "confined": 1.0, "ambulatory_light": 1.2, "low": 1.3,
    "active": 1.5, "very_active": 1.725, "unknown": 1.2,
}

def get_activity_factor(level: str) -> Tuple[float, str]:
    factor = ACTIVITY_FACTORS.get(level, 1.2)
    return factor, f"activity_factor({level}) = {factor}"


WEIGHT_GOAL_MULTIPLIERS = {"maintain": 1.0, "gain": 1.15, "loss": 0.80, "unknown": 1.0}

def get_weight_goal_factor(goal: str) -> Tuple[float, str]:
    factor = WEIGHT_GOAL_MULTIPLIERS.get(goal, 1.0)
    return factor, f"weight_goal_factor({goal}) = {factor}"


# CACFP meal allocation fractions for adults
MEAL_TYPE_FRACTIONS = {"snack": 0.07, "meal-light": 0.22, "meal-regular": 0.32, "unknown": 0.22}


def get_meal_fraction(meal_type) -> Tuple[float, str]:
    frac = MEAL_TYPE_FRACTIONS.get(meal_type, 0.25)
    return frac, f"meal_type[{meal_type}] = {frac}"


DEFAULT_MACRO_SPLIT = {"carbs": 0.55, "protein": 0.20, "fat": 0.25}
CONSTRAINT_ADJUSTMENTS = {
    "high_protein": {"carbs": 0.40, "protein": 0.35, "fat": 0.25},
    "low_calorie":  {"carbs": 0.50, "protein": 0.25, "fat": 0.25},
    "high_calorie": {"carbs": 0.55, "protein": 0.20, "fat": 0.25},
}

def get_macro_split(constraints_text):
    for c in constraints_text:
        if c in CONSTRAINT_ADJUSTMENTS:
            split = CONSTRAINT_ADJUSTMENTS[c]
            return split, f"adjusted for constraint '{c}': {split}"
    return DEFAULT_MACRO_SPLIT.copy(), f"default AMDR split: {DEFAULT_MACRO_SPLIT}"


def calc_macro_grams(meal_kcal, split):
    carbs_mid = meal_kcal * split["carbs"] / 4
    protein_mid = meal_kcal * split["protein"] / 4
    fat_mid = meal_kcal * split["fat"] / 9
    def rng(mid):
        return {"min": round(mid * 0.8, 1), "max": round(mid * 1.2, 1)}
    return {"carbs_g": rng(carbs_mid), "protein_g": rng(protein_mid), "fat_g": rng(fat_mid)}



# ═══════════════════════════════════════════════════════════════════════
# 2. Illness Adjustment (LLM — unchanged)
# ═══════════════════════════════════════════════════════════════════════

class IllnessAdjustment(BaseModel):
    stress_factor: float = Field(description="Multiply TDEE by this. 1.0 = no adjustment.")
    sugar_cap_override_g: Optional[float] = None
    macro_adjustment: Optional[Dict[str, float]] = None


ILLNESS_SYSTEM_PROMPT = """\
You are a clinical nutrition advisor. Given a patient's illness/condition and their 
calculated TDEE, determine what adjustments are needed.
Return ONLY the adjustment factors. Do NOT recalculate TDEE yourself.
Guidelines:
- stress_factor: 1.0 for healthy, 1.1-1.3 for mild illness, 1.3-1.5 for severe
- For diabetes: lower carbs to 45%, raise protein to 25%, sugar_cap_override 5-8g per meal
- For kidney disease: protein restriction (10-15%)
- If no illness or "none": stress_factor=1.0, all overrides null
Be conservative. When in doubt, use 1.0 stress factor and no overrides.
"""


def get_illness_adjustment(illness_condition, kb_context="", model="gpt-4o-mini"):
    if not illness_condition or illness_condition.lower() in ("none", "n/a", ""):
        return IllnessAdjustment(stress_factor=1.0)

    system = ILLNESS_SYSTEM_PROMPT
    if kb_context:
        system += f"\n\n## Reference Context:\n{kb_context}\n"

    try:
        response = client.responses.parse(
            model=model,
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Condition: {illness_condition}"},
            ],
            text_format=IllnessAdjustment,
        )
        adj = response.output_parsed
        if adj is None:
            raise ValueError("Empty response from LLM")
        adj.stress_factor = max(0.7, min(2.0, adj.stress_factor))
        return adj
    except Exception:
        return IllnessAdjustment(stress_factor=1.0)



# ═══════════════════════════════════════════════════════════════════════
# 3. Validation (unchanged)
# ═══════════════════════════════════════════════════════════════════════

def validate_and_clamp(result):
    warnings = []
    nt = result.get("nutrition_targets", {})
    kcal = nt.get("kcal", {})
    kcal_min, kcal_max = kcal.get("min", 0), kcal.get("max", 0)

    if kcal_min <= 0 or kcal_max <= 0:
        warnings.append(f"kcal was {kcal_min}-{kcal_max}, clamped to minimum 20")
        kcal_min = max(20, kcal_min)
        kcal_max = max(kcal_min, kcal_max)
        nt["kcal"] = {"min": kcal_min, "max": kcal_max}

    if kcal_max > 1500:
        warnings.append(f"kcal_max={kcal_max} capped at 1500")
        nt["kcal"]["max"] = 1500

    sugar = nt.get("sugar_g", {})
    if sugar.get("max", 0) < 0:
        nt["sugar_g"]["max"] = 0
        warnings.append("sugar_g_max was negative, set to 0")

    result["nutrition_targets"] = nt
    return result, warnings


# ═══════════════════════════════════════════════════════════════════════
# 4. Core Pipeline (unchanged)
# ═══════════════════════════════════════════════════════════════════════

def _run_hybrid_dietitian(requirement, kb_context="", model="gpt-4o-mini"):
    """The original deterministic pipeline — untouched."""
    profile = requirement.user_profile if hasattr(requirement, 'user_profile') else _dict_profile(requirement)
    steps, assumptions, missing_fields, sources = [], [], [], []

    sex = profile.get("sex", "unknown") if isinstance(profile, dict) else (profile.sex if profile.sex != "unknown" else "female")
    if (isinstance(profile, dict) and profile.get("sex") == "unknown") or (hasattr(profile, 'sex') and profile.sex == "unknown"):
        sex = "female"
        assumptions.append("Sex unknown → defaulted to female")
        missing_fields.append("sex")

    age = profile.get("age_years") if isinstance(profile, dict) else profile.age_years
    if age is None:
        age = 35; assumptions.append("Age unknown → defaulted to 35"); missing_fields.append("age_years")

    weight = profile.get("weight_kg") if isinstance(profile, dict) else profile.weight_kg
    if weight is None:
        weight = 65.0 if sex == "female" else 75.0
        assumptions.append(f"Weight unknown → defaulted to {weight} kg"); missing_fields.append("weight_kg")

    height = profile.get("height_cm") if isinstance(profile, dict) else profile.height_cm
    if height is None:
        height = 160.0 if sex == "female" else 175.0
        assumptions.append(f"Height unknown → defaulted to {height} cm"); missing_fields.append("height_cm")

    # Step 1: BMR
    if age < 10:
        bmr, bmr_eq = calc_bmr_pediatric(sex, weight, height, age)
        sources.append("Schofield equation (pediatric)")
    else:
        bmr, bmr_eq = calc_bmr_mifflin(sex, weight, height, age)
        sources.append("Mifflin-St Jeor equation")
    steps.append({"step": "Calculate BMR", "value": f"{bmr} kcal/day", "reasoning": bmr_eq})

    # Step 2: Activity Factor
    act_level = _get_attr(profile, "activity_level", "unknown")
    act_factor, act_reason = get_activity_factor(act_level)
    tdee = round(bmr * act_factor, 1)
    steps.append({"step": "Apply activity factor → TDEE", "value": f"{bmr} × {act_factor} = {tdee} kcal/day", "reasoning": act_reason})
    sources.append("Activity factor table")

    # Step 3: Illness adjustment
    illness = _get_attr(profile, "illness_condition", None)
    illness_adj = get_illness_adjustment(illness, kb_context, model=model)
    adjusted_tdee = round(tdee * illness_adj.stress_factor, 1)
    steps.append({"step": "Illness/stress adjustment", "value": f"{tdee} × {illness_adj.stress_factor} = {adjusted_tdee} kcal/day"})

    # Step 4: Weight goal
    wg = _get_attr(profile, "weight_goal", "unknown")
    wg_factor, wg_reason = get_weight_goal_factor(wg)
    daily_target = round(adjusted_tdee * wg_factor, 1)
    steps.append({"step": "Weight goal adjustment", "value": f"{adjusted_tdee} × {wg_factor} = {daily_target} kcal/day", "reasoning": wg_reason})

    # Step 5: Meal fraction
    meal_type = _get_attr(requirement, "meal_type", "unknown")

    meal_frac, frac_reason = get_meal_fraction(meal_type)
    meal_kcal = round(daily_target * meal_frac, 1)
    kcal_min = round(meal_kcal * 0.85, 1)
    kcal_max = round(meal_kcal * 1.15, 1)
    steps.append({"step": "Allocate meal fraction", "value": f"{daily_target} × {meal_frac} = {meal_kcal} kcal (range: {kcal_min}–{kcal_max})", "reasoning": frac_reason})

    # Step 6: User kcal override
    user_kcal = _get_nutrition(requirement, "kcal")
    if user_kcal.get("min") is not None or user_kcal.get("max") is not None:
        if user_kcal.get("min") is not None: kcal_min = user_kcal["min"]
        if user_kcal.get("max") is not None: kcal_max = user_kcal["max"]
        meal_kcal = (kcal_min + kcal_max) / 2
        steps.append({"step": "User kcal override", "value": f"{kcal_min}–{kcal_max} kcal", "reasoning": "User explicitly set targets"})

    # Step 7: Macro split
    constraints_text = _get_constraints_text(requirement)
    if illness_adj.macro_adjustment:
        macro_split = illness_adj.macro_adjustment
        # Normalize keys: LLM may return 'carbohydrates', 'carbohydrate', etc.
        key_map = {
            "carbohydrate": "carbs",
            "carbohydrates": "carbs",
            "proteins": "protein",
            "fats": "fat",
            "lipids": "fat",
        }
        macro_split = {key_map.get(k, k): v for k, v in macro_split.items()}
        # Fallback to default if required keys are missing
        for required in ("carbs", "protein", "fat"):
            if required not in macro_split:
                macro_split[required] = DEFAULT_MACRO_SPLIT[required]
        split_reason = f"illness-adjusted split: {macro_split}"
    else:
        macro_split, split_reason = get_macro_split(constraints_text)

    macro_grams = calc_macro_grams(meal_kcal, macro_split)
    steps.append({"step": "Calculate macros", "value": f"C{macro_split['carbs']*100:.0f}%/P{macro_split['protein']*100:.0f}%/F{macro_split['fat']*100:.0f}%", "reasoning": split_reason})
    sources.append("AMDR macronutrient distribution")

    # Step 8: Sugar cap
    if illness_adj.sugar_cap_override_g is not None:
        sugar_max = illness_adj.sugar_cap_override_g
    else:
        sugar_max = round(meal_kcal * 0.10 / 4, 1)
    if "low_sugar" in constraints_text:
        sugar_max = min(sugar_max, round(meal_kcal * 0.05 / 4, 1))

    user_sugar = _get_nutrition(requirement, "sugar_g")
    if user_sugar.get("max") is not None:
        sugar_max = user_sugar["max"]

    steps.append({"step": "Sugar cap", "value": f"max {sugar_max}g", "reasoning": "10% of kcal / 4"})

    allergens = _get_attr(_get_attr(requirement, "constraints", {}), "allergens", [])

    result = {
        "nutrition_targets": {
            "kcal": {"min": kcal_min, "max": kcal_max},
            "sugar_g": {"min": 0, "max": sugar_max},
            "composition": {
                "method": "AMDR",
                "macro_percent": {
                    "carbs": round(macro_split["carbs"] * 100, 1),
                    "protein": round(macro_split["protein"] * 100, 1),
                    "fat": round(macro_split["fat"] * 100, 1),
                },
                "macro_grams": macro_grams,
            },
        },
        "allergens": allergens or [],
        "daily_reference": {"bmr": bmr, "tdee": tdee, "adjusted_tdee": adjusted_tdee, "daily_target": daily_target, "meal_fraction": meal_frac},
        "assumptions": assumptions,
        "missing_fields": missing_fields,
        "sources_used": sources,
        "calculation_trace": steps,
    }

    result, val_warnings = validate_and_clamp(result)
    if val_warnings:
        result["validation_warnings"] = val_warnings

    return result


# ═══════════════════════════════════════════════════════════════════════
# 5. Multi-Agent Interface — propose()
# ═══════════════════════════════════════════════════════════════════════

def propose(requirement, use_kb: bool = True, kb_path: str = "knowledgebases/dietitian_kb.md", model: str = "gpt-4o-mini") -> Dict[str, Any]:
    """
    Phase 1: Dietitian proposes nutrition targets.
    This is a wrapper around the existing pipeline.
    """
    if use_kb:
        return _propose_with_kb(requirement, kb_path, model=model)
    return _run_hybrid_dietitian(requirement, kb_context="", model=model)


def _propose_with_kb(requirement, kb_path: str, model: str = "gpt-4o-mini") -> Dict[str, Any]:
    """Propose with RAG context (same as dietitian_with_kb from v2)."""
    from rag import kb_store

    profile = requirement.get("user_profile", {}) if isinstance(requirement, dict) else requirement.user_profile
    queries = []
    illness = profile.get("illness_condition") if isinstance(profile, dict) else getattr(profile, 'illness_condition', None)
    if illness:
        queries.append(f"nutrition adjustment for {illness}")
    queries.append("meal allocation nutrition guidelines")

    all_context = []
    for q in queries:
        try:
            ctx = kb_store.format_context(kb_path, q, top_k=3)
            if ctx: all_context.append(ctx)
        except Exception:
            pass

    kb_context = "\n\n---\n\n".join(all_context) if all_context else ""
    result = _run_hybrid_dietitian(requirement, kb_context=kb_context, model=model)

    if kb_context:
        try:
            chunks = kb_store.retrieve_with_scores(kb_path, queries[0] if queries else "nutrition", top_k=4)
            result["retrieved_chunks"] = chunks
        except Exception:
            result["retrieved_chunks"] = []

    return result

# ═══════════════════════════════════════════════════════════════════════
# 7. Backward-compatible API (unchanged function signatures)
# ═══════════════════════════════════════════════════════════════════════

def dietitian_without_kb(requirement) -> Dict[str, Any]:
    return _run_hybrid_dietitian(requirement, kb_context="")

def dietitian_with_kb(requirement, kb_path: str) -> Dict[str, Any]:
    return _propose_with_kb(requirement, kb_path)


# ═══════════════════════════════════════════════════════════════════════
# Helpers for handling both Pydantic models and dicts
# ═══════════════════════════════════════════════════════════════════════

def _get_attr(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def _get_nutrition(req, field):
    if isinstance(req, dict):
        return req.get("nutrition", {}).get(field, {})
    nutrition = getattr(req, "nutrition", None)
    if nutrition is None:
        return {}
    val = getattr(nutrition, field, None)
    if val is None:
        return {}
    if hasattr(val, 'model_dump'):
        return val.model_dump()
    return val if isinstance(val, dict) else {}

def _get_constraints_text(req):
    if isinstance(req, dict):
        return req.get("constraints", {}).get("constraints_text", [])
    constraints = getattr(req, "constraints", None)
    if constraints is None:
        return []
    return getattr(constraints, "constraints_text", []) or []

def _dict_profile(req):
    if isinstance(req, dict):
        return req.get("user_profile", {})
    return req.user_profile if hasattr(req, 'user_profile') else {}

