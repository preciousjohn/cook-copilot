"""
POST /api/silhouettes — Generate 3 distinct SVG shape variants via Claude.

Uses a single Claude call (much faster than DALL-E) to return three clean
solid-black silhouettes suitable for 3D food printing cookie-cutter paths.
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

Rules:
- All 3 variants must be recognizably the same subject — same animal/object — just different poses or proportions
- Variant 1 (Upright): standard front-facing or three-quarter pose, faithful proportions
- Variant 2 (Profile): strict left-facing side-profile pose, clearly distinct silhouette from variant 1
- Variant 3 (Compact): same front pose as variant 1 but rounder, chunkier proportions — cuter/squatter version
- SVG viewBox must be "0 0 100 100"
- Use ONLY <path> elements with fill="black". No strokes, no gradients, no text, no <g> groups, no other elements
- Paths must be fully closed (end with Z). No open paths
- No ultra-thin parts narrower than 3 units — shapes must be printable
- Center the shape within the viewBox with reasonable padding (10 units on each side)
- Return ONLY valid JSON — absolutely no markdown, no code fences, no explanation

JSON structure (return exactly this):
{
  "variants": [
    {"label": "Upright", "description": "Standing front-facing pose", "svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='...'/></svg>"},
    {"label": "Profile", "description": "Side view walking pose", "svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='...'/></svg>"},
    {"label": "Compact", "description": "Rounded compact form", "svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='...'/></svg>"}
  ]
}"""


def _generate(shape: str) -> SilhouettesResponse:
    message = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        system=_SYSTEM,
        messages=[{"role": "user", "content": f"Generate 3 silhouette variants for: {shape}"}],
    )
    raw = "".join(b.text for b in message.content if hasattr(b, "text")).strip()
    # Strip markdown fences if present despite instructions
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
