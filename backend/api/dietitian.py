"""
POST /api/dietitian — Run the Dietitian AI stage.
Input:  { prompt, profile }
Output: DietitianResponse
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.pipeline import DietitianRequest, DietitianResponse
from db.repositories.settings import get_settings_record
import services.dietitian as dietitian_service

router = APIRouter()


@router.post("/api/dietitian", response_model=DietitianResponse)
async def run_dietitian(req: DietitianRequest) -> DietitianResponse:
    settings = get_settings_record()
    try:
        result = dietitian_service.run(
            profile=req.profile,
            meal_type=req.meal_type,
            use_rag=settings.use_rag,
            model=settings.llm_model,
        )
        return DietitianResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
