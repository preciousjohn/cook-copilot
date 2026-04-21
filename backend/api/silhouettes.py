"""
POST /api/silhouettes — Generate 3 distinct shape silhouette variants.

Returns Classic / Rounded / Geometric interpretations of the requested shape,
generated concurrently via DALL-E so the caller gets all three in one round-trip.
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
        "suffix": "Standard proportions and classic recognizable interpretation of the shape.",
    },
    {
        "label": "Rounded",
        "description": "Soft & plump",
        "suffix": "Plump, rounded, chubby version with soft smooth curves. Exaggerated friendly proportions.",
    },
    {
        "label": "Geometric",
        "description": "Angular & bold",
        "suffix": "Simplified angular geometric version. Clean sharp edges, polygon-like, bold and minimal.",
    },
]

# ── Generation ────────────────────────────────────────────────────────────────

def _generate_one(shape: str, suffix: str) -> Optional[str]:
    try:
        client = OpenAI()
        prompt = (
            f"A simple cookie cutter shape of a {shape}. "
            f"Solid black (#000000) filled shape on pure white (#FFFFFF) background. "
            f"Minimal, abstract silhouette — no texture, no internal lines, no shading. "
            f"Like a flat rubber stamp. Centered, 2D. {suffix}"
        )
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
    loop = asyncio.get_event_loop()
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
