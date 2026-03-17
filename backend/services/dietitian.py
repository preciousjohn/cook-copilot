"""
Dietitian service — translates the new simplified API input format into
the requirement dict expected by the existing dietitian_agent.propose() function.
"""
from __future__ import annotations

import sys
import os
from typing import Any, Dict

# Ensure parent (backend/) is on the path so legacy agent modules can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.profiles import UserProfileCreate


# ── Activity level mapping ────────────────────────────────────────────────────
# New frontend values → old dietitian_agent ACTIVITY_FACTORS keys

_ACTIVITY_MAP: Dict[str, str] = {
    "sedentary":   "ambulatory_light",  # 1.2 — closest to sedentary
    "light":       "ambulatory_light",  # 1.2
    "moderate":    "low",               # 1.3
    "active":      "active",            # 1.5
    "very_active": "very_active",       # 1.725
}


def _build_requirement(profile: UserProfileCreate, meal_type: str) -> Dict[str, Any]:
    """
    Convert the new simplified UserProfile into the legacy 'requirement'
    dict expected by dietitian_agent._run_hybrid_dietitian().
    """
    # Map new activity level strings to old ones
    old_activity = _ACTIVITY_MAP.get(profile.activityLevel, "low")

    # Combine medical conditions into a single illness string (legacy format)
    conditions = [c for c in profile.medicalConditions if c != "none"]
    illness_str = ", ".join(conditions) if conditions else "none"

    # Determine weight goal key (same values — new frontend matches legacy)
    weight_goal = profile.weightGoal  # "maintain" | "lose" | "gain"

    # Build allergens list for constraints
    allergens = list(profile.allergies)
    if profile.allergyOther:
        allergens.append(profile.allergyOther)

    return {
        "target_user": "Adult-Female" if profile.sex == "female" else "Adult-Male",
        "meal_type": meal_type,
        "user_profile": {
            # New field name → old field name mapping
            "sex": profile.sex if profile.sex != "other" else "female",
            "age_years": profile.age if profile.age > 0 else None,
            "weight_kg": profile.weightKg if profile.weightKg > 0 else None,
            "height_cm": profile.heightCm if profile.heightCm > 0 else None,
            "activity_level": old_activity,
            "illness_condition": illness_str,
            "weight_goal": weight_goal,
        },
        "constraints": {
            "allergens": allergens,
            "constraints_text": profile.dietaryPreferences,
        },
        "nutrition": {},
    }


def run(profile: UserProfileCreate, meal_type: str = "snack", use_rag: bool = True, model: str = "gpt-4o-mini") -> Dict[str, Any]:
    """
    Run the dietitian pipeline for the given profile + meal_type.

    Args:
        meal_type: Pre-parsed by /api/parse. Defaults to "snack" if not provided.
    Returns:
        Full dietitian output dict (DietitianResponse).
    """
    import dietitian_agent

    requirement = _build_requirement(profile, meal_type=meal_type or "snack")
    kb_path = "knowledgebases/nutrition/dietitian_kb.md"
    result = dietitian_agent.propose(requirement, use_kb=use_rag, kb_path=kb_path, model=model)
    result.setdefault("meal_type", meal_type or "snack")
    return result
