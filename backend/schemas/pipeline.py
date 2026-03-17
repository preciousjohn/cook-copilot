"""
Pydantic schemas for the pipeline API endpoints:
  POST /api/parse      → ParseRequest      → ParseResponse
  POST /api/dietitian  → DietitianRequest  → DietitianResponse
  POST /api/chef       → ChefRequest       → ChefResponse
  POST /api/engineer   → EngineerRequest   → EngineerResponse
  POST /api/gcode/regenerate → GCodeRegenerateRequest → GCodeRegenerateResponse
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from schemas.profiles import UserProfileCreate


# ── Parse ──────────────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    prompt: str


class ParseResponse(BaseModel):
    meal_type: str
    shape: str
    ingredients: List[str] = []
    menu: str = ""


# ── Dietitian ─────────────────────────────────────────────────────────────────

class DietitianRequest(BaseModel):
    profile: UserProfileCreate
    meal_type: str = ""  # Pre-parsed by /api/parse; falls back to "snack" if empty


class DietitianResponse(BaseModel):
    nutrition_targets: Dict[str, Any]
    allergens: List[str] = []
    daily_reference: Dict[str, Any] = {}
    meal_type: str = "snack"
    assumptions: List[str] = []
    calculation_trace: List[Dict[str, Any]] = []


# ── Chef ──────────────────────────────────────────────────────────────────────

class ChefRequest(BaseModel):
    nutrition_targets: Dict[str, Any]
    allergens: List[str] = []
    age: int = 0
    sex: str = ""
    dietary_preferences: List[str] = []
    medical_conditions: List[str] = []
    # Parsed fields from /api/parse (passed directly from frontend)
    shape: str = ""
    meal_type: str = ""
    requested_ingredients: List[str] = []
    requested_menu: str = ""


class SyringeRecipe(BaseModel):
    syringe_id: int = 0
    label: str = ""
    title: str
    ingredients: List[str]
    instructions: List[str]
    calculated_grams: float = 0.0


class SyringeSystemSpec(BaseModel):
    syringe_id: int
    paste_type: str = ""
    viscosity: str = ""
    tip_diameter_mm: float = 2.0
    extrusion_temp_c: Optional[float] = None


class NutritionFacts(BaseModel):
    """Aggregated nutrition facts for the whole recipe (all syringes combined)."""
    serving_size_g: float = 0.0
    calories: float = 0.0
    total_fat_g: float = 0.0
    saturated_fat_g: float = 0.0
    trans_fat_g: float = 0.0
    cholesterol_mg: float = 0.0
    sodium_mg: float = 0.0
    total_carbs_g: float = 0.0
    dietary_fiber_g: float = 0.0
    total_sugars_g: float = 0.0
    protein_g: float = 0.0
    resolved_ingredients: List[str] = []


class ChefResponse(BaseModel):
    menu_name: str
    num_syringes: int
    syringe_recipes: List[SyringeRecipe]
    post_processing: List[str]
    silhouette_image_b64: Optional[str] = None
    syringe_system_specs: List[SyringeSystemSpec] = []
    validation_warnings: List[str] = []
    retrieved_chunks: List[Dict[str, Any]] = []
    nutrition_facts: Optional[NutritionFacts] = None


# ── Engineer ──────────────────────────────────────────────────────────────────

class EngineerRequest(BaseModel):
    prompt: str
    recipes: Dict[str, Any]     # ChefResponse as dict
    age: int = 0
    meal_type: str = ""


class EngineerResponse(BaseModel):
    metadata: Dict[str, Any]
    warnings: List[str]
    silhouette_image_b64: Optional[str] = None
    gcode: str
    pieces: int = 1


# ── GCode Regenerate ──────────────────────────────────────────────────────────

class GCodeRegenerateRequest(BaseModel):
    syringe_recipes: List[Dict[str, Any]]
    silhouette_b64: str
    em_values: List[float]
    lh: float


class GCodeRegenerateResponse(BaseModel):
    gcode: str
