"""
POST /api/silhouettes — Generate 3 distinct SVG shape variants via Claude.

Single LLM call returns all three variants as inline SVG (~2-4s vs ~15-20s for DALL-E).
SVG is resolution-independent so it scales to any display size with no quality loss.
"""
from __future__ import annotations

import json
import re

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import APIRouter
from pydantic import BaseModel

load_dotenv()

router = APIRouter()
_client = Anthropic()

# ── Schemas ───────────────────────────────────────────────────────────────────

class SilhouetteRequest(BaseModel):
    shape: str

class SilhouetteVariant(BaseModel):
    label: str
    description: str
    svg: str

class SilhouettesResponse(BaseModel):
    variants: list[SilhouetteVariant]

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM = """You are a shape designer for 3D printed food molds. Generate exactly 3 distinct SVG silhouette variants for the requested shape.

VARIETY RULES — the 3 variants must look clearly different from each other:
- For geometric/abstract shapes (star, heart, diamond, arrow...):
    Vary the design significantly: e.g. a 5-point star, a 6-point star, and a rounded/puffy star
- For animals or organic shapes (chick, duck, rabbit...):
    Vary pose and proportion: e.g. side-profile walking, upright front-facing, compact rounded body
- For food shapes (cookie, cupcake, pizza...):
    Vary the style: e.g. classic shape, overhead view, stylized/simplified version
- All 3 must be instantly recognizable as the same type of object
- Do NOT just rotate or slightly scale the same path — they must be genuinely different outlines

SVG RULES:
- viewBox must be "0 0 100 100"
- Use ONLY <path> elements with fill="black" — no strokes, no gradients, no text, no <g> wrappers
- All paths must be closed (end with Z)
- No part narrower than 3 units — shapes must survive 3D printing
- Center the shape with ~10 units padding on each side

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "variants": [
    {"label": "Classic",    "description": "...", "svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='...'/></svg>"},
    {"label": "Alternate",  "description": "...", "svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='...'/></svg>"},
    {"label": "Stylized",   "description": "...", "svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='...'/></svg>"}
  ]
}"""


def _generate(shape: str) -> SilhouettesResponse:
    message = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        system=_SYSTEM,
        messages=[{"role": "user", "content": f"Generate 3 distinct silhouette variants for: {shape}"}],
    )
    raw = "".join(b.text for b in message.content if hasattr(b, "text")).strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE).strip()
    data = json.loads(raw)
    return SilhouettesResponse(
        variants=[SilhouetteVariant(**v) for v in data["variants"]]
    )


@router.post("/api/silhouettes", response_model=SilhouettesResponse)
async def generate_silhouettes(req: SilhouetteRequest) -> SilhouettesResponse:
    import asyncio
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _generate, req.shape)
