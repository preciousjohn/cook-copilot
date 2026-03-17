"""
POST /api/chef — Run the Chef AI stage.
Input:  { nutrition_targets, allergens, shape, meal_type, requested_ingredients, requested_menu, ... }
Output: ChefResponse
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.pipeline import ChefRequest, ChefResponse
from db.repositories.settings import get_settings_record
import services.chef as chef_service

router = APIRouter()


@router.post("/api/chef", response_model=ChefResponse)
async def run_chef(req: ChefRequest) -> ChefResponse:
    settings = get_settings_record()
    try:
        result = chef_service.run(
            nutrition_targets=req.nutrition_targets,
            allergens=req.allergens,
            age=req.age,
            sex=req.sex,
            dietary_preferences=req.dietary_preferences,
            medical_conditions=req.medical_conditions,
            use_rag=settings.use_rag,
            model=settings.llm_model,
            shape=req.shape,
            meal_type=req.meal_type,
            requested_ingredients=req.requested_ingredients,
            requested_menu=req.requested_menu,
        )
        return ChefResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
