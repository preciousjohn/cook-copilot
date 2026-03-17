"""
POST /api/engineer — Run the Engineer AI stage.
POST /api/gcode/regenerate — Regenerate GCode with updated EM/LH.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.pipeline import (
    EngineerRequest,
    EngineerResponse,
    GCodeRegenerateRequest,
    GCodeRegenerateResponse,
)
import services.engineer as engineer_service

router = APIRouter()


@router.post("/api/engineer", response_model=EngineerResponse)
async def run_engineer(req: EngineerRequest) -> EngineerResponse:
    try:
        result = engineer_service.run(
            prompt=req.prompt,
            chef_output=req.recipes,
            age=req.age,
            meal_type=req.meal_type,
        )
        return EngineerResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/api/gcode/regenerate", response_model=GCodeRegenerateResponse)
async def regenerate_gcode(req: GCodeRegenerateRequest) -> GCodeRegenerateResponse:
    try:
        gcode = engineer_service.regenerate(
            syringe_recipes=[r.model_dump() if hasattr(r, "model_dump") else r for r in req.syringe_recipes],
            silhouette_b64=req.silhouette_b64,
            em_values=req.em_values,
            lh=req.lh,
        )
        return GCodeRegenerateResponse(gcode=gcode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
