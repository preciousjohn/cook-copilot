"""
USDA FoodData Central API helpers.

Resolves ingredient names to USDA FDC IDs, fetches per-100g nutrient data,
and provides a batch resolver that returns NutrientProfile objects.

Required env var: USDA_FDC_API_KEY
"""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from openai import OpenAI
from usda_fdc import FdcClient

_openai = OpenAI()

# ── In-memory caches for USDA lookups (avoid repeated API calls) ─────────────
# Key: bare ingredient name → (resolved_name, fdc_id)
_name_cache: Dict[str, Tuple[str, Optional[int]]] = {}
# Key: fdc_id → per-100g nutrient dict
_nutrient_cache: Dict[int, Dict[str, float]] = {}

# ── FDC nutrient IDs → NutritionFacts field names ──────────────────────────
# FDC nutrient IDs are the `id` field on usda_fdc.models.Nutrient (not nutrient_nbr).
# Data is per 100g for Foundation & SR Legacy foods.
_NUTRIENT_ID_TO_FIELD: Dict[int, str] = {
    1008: "calories",          # Energy (kcal)
    1003: "protein_g",         # Protein
    1004: "total_fat_g",       # Total lipid (fat)
    1258: "saturated_fat_g",   # Fatty acids, total saturated
    1257: "trans_fat_g",       # Fatty acids, total trans-octadecenoic
    1253: "cholesterol_mg",    # Cholesterol
    1093: "sodium_mg",         # Sodium, Na
    1005: "total_carbs_g",     # Carbohydrate, by difference
    1079: "dietary_fiber_g",   # Fiber, total dietary
    2000: "total_sugars_g",    # Sugars, total including NLEA
    1063: "total_sugars_g",    # Sugars, total (older FDC entries)
}


# ── USDA search + nutrient fetch ────────────────────────────────────────────

def _search_fdc_id(name: str, fdc_client: FdcClient) -> Optional[int]:
    """
    Search USDA FDC for the ingredient name.
    Prefers Foundation > SR Legacy > any data type.
    Returns fdc_id of best match, or None.
    """
    try:
        result = fdc_client.search(
            query=name,
            data_type=["Foundation", "SR Legacy"],
            page_size=5,
        )
        if result.foods:
            return result.foods[0].fdc_id
        # Broader fallback (includes Branded)
        result2 = fdc_client.search(query=name, page_size=3)
        if result2.foods:
            return result2.foods[0].fdc_id
    except Exception as e:
        print(f"[NutriAnalyzer] Search error for '{name}': {e}")
    return None


def _fetch_per_100g(fdc_id: int, fdc_client: FdcClient) -> Dict[str, float]:
    """
    Fetch full food data and return a dict of nutrient values per 100g.
    Keys match NutritionFacts fields.
    """
    result: Dict[str, float] = {}
    try:
        food = fdc_client.get_food(fdc_id, format="full")
        for nutrient in food.nutrients:
            nid = nutrient.id
            if nid is None:
                continue
            field = _NUTRIENT_ID_TO_FIELD.get(int(nid))
            if field and field not in result:
                result[field] = float(nutrient.amount or 0.0)
    except Exception as e:
        print(f"[NutriAnalyzer] Nutrient fetch error for fdc_id={fdc_id}: {e}")
    return result


# ── LLM reformulation ───────────────────────────────────────────────────────

def _reformulate_with_llm(original_text: str, attempt: int) -> str:
    """
    Ask gpt-4o-mini to reformulate the ingredient into the simplest generic
    term that USDA FoodData Central would recognise.
    Returns the reformulated name (lowercase, no quantity).
    """
    response = _openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a nutrition database expert. "
                    "When given a recipe ingredient, return the simplest, most generic "
                    "food name that exists in the USDA FoodData Central database. "
                    "Use one or two plain English words — no quantities, no preparation "
                    "methods, no brand names, no adjectives. "
                    "Return ONLY the food name, nothing else."
                ),
            },
            {
                "role": "user",
                "content": (
                    f'Simplify for USDA FoodData Central (attempt {attempt}/3): '
                    f'"{original_text}"'
                ),
            },
        ],
        max_tokens=20,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip().strip('"').lower()


# ── Public API ───────────────────────────────────────────────────────────────

def resolve_ingredient_name(
    bare_name: str,
    max_retries: int = 3,
) -> Tuple[str, Optional[int]]:
    """Resolve a bare ingredient name (e.g. "banana") to a USDA FDC ID.

    Results are cached in-memory so repeated calls for the same ingredient
    do not hit the USDA API again.

    Returns ``(name_used, fdc_id)``.  *fdc_id* is ``None`` if unresolvable.
    """
    if bare_name in _name_cache:
        return _name_cache[bare_name]

    api_key = os.environ.get("USDA_FDC_API_KEY", "")
    if not api_key:
        print("[NutriAnalyzer] USDA_FDC_API_KEY not set.")
        return bare_name, None

    fdc_client = FdcClient(api_key)
    fdc_id = _search_fdc_id(bare_name, fdc_client)
    if fdc_id:
        print(f"[NutriAnalyzer] '{bare_name}' -> fdc_id={fdc_id}")
        _name_cache[bare_name] = (bare_name, fdc_id)
        return bare_name, fdc_id

    for attempt in range(1, max_retries + 1):
        reformulated = _reformulate_with_llm(bare_name, attempt)
        print(f"[NutriAnalyzer] '{bare_name}' not found -> reformulated '{reformulated}' (attempt {attempt})")
        fdc_id = _search_fdc_id(reformulated, fdc_client)
        if fdc_id:
            print(f"[NutriAnalyzer] '{reformulated}' -> fdc_id={fdc_id}")
            _name_cache[bare_name] = (reformulated, fdc_id)
            return reformulated, fdc_id

    print(f"[NutriAnalyzer] Could not resolve '{bare_name}' after {max_retries} retries.")
    _name_cache[bare_name] = (bare_name, None)
    return bare_name, None


def fetch_per_100g_by_fdc_id(fdc_id: int) -> Dict[str, float]:
    """Fetch per-100g nutrient data for a given FDC ID.

    Results are cached in-memory so repeated calls for the same fdc_id
    do not hit the USDA API again.

    Returns a dict of per-100g nutrient values keyed by NutritionFacts field
    names.  Returns ``{}`` if the API key is not set.
    """
    if fdc_id in _nutrient_cache:
        return _nutrient_cache[fdc_id]

    api_key = os.environ.get("USDA_FDC_API_KEY", "")
    if not api_key:
        return {}
    fdc_client = FdcClient(api_key)
    result = _fetch_per_100g(fdc_id, fdc_client)
    if result:
        _nutrient_cache[fdc_id] = result
    return result


# ── NutrientProfile + batch resolver ─────────────────────────────────────────

@dataclass
class NutrientProfile:
    """Per-100g nutrient data for one ingredient (from USDA)."""
    name: str
    syringe: int
    calories: float = 0.0
    protein_g: float = 0.0
    total_carbs_g: float = 0.0
    total_fat_g: float = 0.0
    total_sugars_g: float = 0.0
    saturated_fat_g: float = 0.0
    trans_fat_g: float = 0.0
    cholesterol_mg: float = 0.0
    sodium_mg: float = 0.0
    dietary_fiber_g: float = 0.0


def fetch_ingredient_profiles(
    syringe1_ingredients: List[str],
    syringe2_ingredients: List[str],
) -> List[NutrientProfile]:
    """Query USDA for per-100g nutrition data for each ingredient.

    Ingredients are resolved in parallel using a thread pool.
    Ingredients that cannot be resolved are excluded.

    Returns a sorted list of ``NutrientProfile`` objects.
    """
    tasks: List[Tuple[int, str]] = []
    for syringe_id, names in [(1, syringe1_ingredients), (2, syringe2_ingredients)]:
        for name in names:
            tasks.append((syringe_id, name))

    def _resolve_one(syringe_id: int, name: str) -> Optional[NutrientProfile]:
        resolved_name, fdc_id = resolve_ingredient_name(name)
        if fdc_id is None:
            print(f"[NutriAnalyzer] Could not resolve '{name}' in USDA — skipping.")
            return None
        per_100g = fetch_per_100g_by_fdc_id(fdc_id)
        if not per_100g:
            print(f"[NutriAnalyzer] No nutrient data for '{name}' (fdc_id={fdc_id}) — skipping.")
            return None
        return NutrientProfile(
            name=name,
            syringe=syringe_id,
            calories=per_100g.get("calories", 0.0),
            protein_g=per_100g.get("protein_g", 0.0),
            total_carbs_g=per_100g.get("total_carbs_g", 0.0),
            total_fat_g=per_100g.get("total_fat_g", 0.0),
            total_sugars_g=per_100g.get("total_sugars_g", 0.0),
            saturated_fat_g=per_100g.get("saturated_fat_g", 0.0),
            trans_fat_g=per_100g.get("trans_fat_g", 0.0),
            cholesterol_mg=per_100g.get("cholesterol_mg", 0.0),
            sodium_mg=per_100g.get("sodium_mg", 0.0),
            dietary_fiber_g=per_100g.get("dietary_fiber_g", 0.0),
        )

    profiles: List[NutrientProfile] = []
    with ThreadPoolExecutor(max_workers=len(tasks) or 1) as pool:
        futures = {pool.submit(_resolve_one, sid, name): (sid, name) for sid, name in tasks}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                profiles.append(result)

    profiles.sort(key=lambda p: (p.syringe, p.name))
    return profiles
