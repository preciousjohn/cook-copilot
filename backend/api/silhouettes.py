"""
POST /api/silhouettes — Generate 3 distinct shape silhouette variants via DALL-E.

Runs all three generations concurrently so the caller gets all variants in one round-trip.
Each variant is a different pose/style of the same subject.
"""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

router = APIRouter()
_executor = ThreadPoolExecutor(max_workers=3)

# ── Schemas ───────────────────────────────────────────────────────────────────

class SilhouetteRequest(BaseModel):
    shape: str

class SilhouetteVariant(BaseModel):
    label: str
    description: str
    b64: Optional[str] = None

class SilhouettesResponse(BaseModel):
    variants: list[SilhouetteVariant]

# ── Variant definitions ───────────────────────────────────────────────────────

_VARIANTS = [
    {
        "label": "Classic",
        "description": "Standard form",
        "suffix": (
            "Most recognizable, commonly depicted form of the subject. "
            "For geometric shapes: standard proportions (e.g. a 5-point star). "
            "For animals: front-facing or three-quarter view, faithful proportions. "
            "Single fully-closed solid shape, no gaps or floating islands."
        ),
    },
    {
        "label": "Alternate",
        "description": "Different design",
        "suffix": (
            "A clearly distinct design of the same subject. "
            "For geometric shapes: change the number of points or sides (e.g. a 6-point star, or a star with elongated points). "
            "For animals: strict side-profile (lateral) view facing left. "
            "Must look noticeably different from the Classic variant. Single closed solid shape."
        ),
    },
    {
        "label": "Stylized",
        "description": "Unique take",
        "suffix": (
            "A stylized or simplified version — rounder, chunkier, or bolder than the classic. "
            "For geometric shapes: rounded/puffy version with soft curves instead of sharp points. "
            "For animals: compact rounded body, slightly squatter proportions. "
            "Single closed solid shape suitable for 3D food printing."
        ),
    },
]

# ── Generation ────────────────────────────────────────────────────────────────

_BASE_PROMPT = (
    "Pure solid black (#000000) filled silhouette of {shape} on a pure white (#FFFFFF) background. "
    "Flat 2D, centered, no texture, no internal lines, no gradients, no shading. "
    "Single closed shape — no disconnected parts. Like a rubber stamp or cookie cutter. {suffix}"
)


def _generate_one(shape: str, suffix: str) -> Optional[str]:
    try:
        client = OpenAI()
        prompt = _BASE_PROMPT.format(shape=shape, suffix=suffix)
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
            quality="low",
        )
        return response.data[0].b64_json
    except Exception as e:
        print(f"[Silhouettes] Generation failed for '{shape}': {e}")
        return None


@router.post("/api/silhouettes", response_model=SilhouettesResponse)
async def generate_silhouettes(req: SilhouetteRequest) -> SilhouettesResponse:
    loop = asyncio.get_running_loop()
    tasks = [
        loop.run_in_executor(_executor, _generate_one, req.shape, v["suffix"])
        for v in _VARIANTS
    ]
    results = await asyncio.gather(*tasks)
    return SilhouettesResponse(
        variants=[
            SilhouetteVariant(label=v["label"], description=v["description"], b64=b64)
            for v, b64 in zip(_VARIANTS, results)
        ]
    )
