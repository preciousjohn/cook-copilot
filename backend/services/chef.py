"""
Chef service — translates the new simplified API input format into
the requirement + dietitian_output dicts expected by chef_agent.propose().
"""
from __future__ import annotations

import sys
import os
from typing import Any, Dict, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prompt_parser import ParsedPrompt


def _build_requirement_from_parsed(
    parsed: ParsedPrompt,
    allergens: List[str],
    age: int,
    sex: str,
    dietary_preferences: List[str],
    medical_conditions: List[str],
) -> Dict[str, Any]:
    """
    Build a minimal requirement dict for the Chef from the parsed prompt.
    """
    return {
        "shape": {"mode": "custom", "custom_text": parsed.shape, "preset_name": parsed.shape},
        "age": age,
        "sex": sex,
        "meal_type": parsed.meal_type,
        "constraints": {
            "allergens": allergens,
            "dietary_preferences": dietary_preferences,
            "medical_conditions": medical_conditions,
        },
        "requested_ingredients": parsed.ingredients,
        "requested_menu": parsed.menu,
    }


def run(
    nutrition_targets: Dict[str, Any],
    allergens: List[str] = [],
    age: int = 0,
    sex: str = "",
    dietary_preferences: List[str] = [],
    medical_conditions: List[str] = [],
    use_rag: bool = False,
    model: str = "gpt-4o-mini",
    shape: str = "",
    meal_type: str = "",
    requested_ingredients: List[str] = [],
    requested_menu: str = "",
) -> Dict[str, Any]:
    """
    Run the chef pipeline.

    Args:
        nutrition_targets: The NutritionTargets dict from the dietitian output
        allergens:         Allergen list from the dietitian output constraints
        use_rag:           Whether to use RAG context from chef_kb
        shape, meal_type, requested_ingredients, requested_menu:
                           Pre-parsed fields from /api/parse (passed via frontend).
    Returns:
        Full chef output dict (ChefResponse)
    """
    import chef_agent

    parsed = ParsedPrompt(
        meal_type=meal_type or "snack",
        shape=shape or "circle",
        ingredients=requested_ingredients,
        menu=requested_menu,
    )
    requirement = _build_requirement_from_parsed(parsed, allergens, age, sex, dietary_preferences, medical_conditions)

    # The chef's propose() expects a full dietitian_output dict, not just nutrition_targets.
    # We build a minimal wrapper around the nutrition_targets.
    dietitian_output = {
        "nutrition_targets": nutrition_targets,
        "allergens": allergens,
    }

    # Load settings for RAG paths + ablation controls
    from db.repositories.settings import get_settings_record
    settings = get_settings_record()

    kb_paths: List[str] = []
    if use_rag:
        for rel in settings.rag_sources_enabled:
            if rel.startswith("recipe/"):
                kb_paths.append(f"knowledgebases/{rel}")

    sections_enabled = settings.chef_sections_enabled.model_dump()
    sections_content = settings.chef_sections_content

    return chef_agent.propose(
        requirement,
        dietitian_output,
        use_kb=use_rag,
        kb_paths=kb_paths,
        model=model,
        sections_enabled=sections_enabled,
        sections_content=sections_content,
        use_usda_api=settings.use_usda_api,
    )
