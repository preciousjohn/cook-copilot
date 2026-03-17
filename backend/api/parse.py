"""
POST /api/parse — Parse the user's food request prompt.
Input:  { prompt: str }
Output: ParseResponse { meal_type, shape, ingredients, menu }
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.pipeline import ParseRequest, ParseResponse
from db.repositories.settings import get_settings_record

router = APIRouter()


@router.post("/api/parse", response_model=ParseResponse)
async def parse_prompt_endpoint(req: ParseRequest) -> ParseResponse:
    settings = get_settings_record()
    try:
        from prompt_parser import parse
        parsed = parse(req.prompt, model=settings.llm_model)
        return ParseResponse(
            meal_type=parsed.meal_type,
            shape=parsed.shape,
            ingredients=parsed.ingredients,
            menu=parsed.menu,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
