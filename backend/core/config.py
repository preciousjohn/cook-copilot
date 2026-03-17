"""
Application configuration — loaded from environment variables via pydantic-settings.
Includes default system prompts for each AI agent.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # type: ignore[no-redef]


# ── Default system prompts ────────────────────────────────────────────────────

DEFAULT_DIETITIAN_PROMPT = """\
You are a clinical dietitian AI. Given a user's profile and food request, calculate
precise nutrition targets (kcal range, macro split, sugar cap) using the Mifflin-St
Jeor equation and TDEE adjustment. Consider any medical conditions, allergies, and
dietary preferences provided in the profile. Return structured JSON output."""

DEFAULT_CHEF_PROMPT = """\
You are a Chef Agent in an AI Food 3D Printing system (CookPilot).
You design food paste recipes that can be loaded into syringes of a Jubilee multi-tool
3D printer. Syringe-based extrusion (30-60ml per syringe). Pastes must be smooth enough
to extrude through a 1-3mm nozzle tip. Avoid chunks, seeds, or fibrous pieces that clog.
Syringe 1: PROTEIN-RICH paste. Syringe 2: CARBS-RICH paste."""

DEFAULT_ENGINEER_PROMPT = """\
You are a food 3D printing engineer AI. Generate GCode for a multi-syringe food printer
based on the provided recipes and food shape silhouette. Output valid GCode with
appropriate layer heights, extrusion multipliers, and travel moves."""


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    db_path: str = "app.db"
    kb_dir: str = "knowledgebases"

    # Default LLM settings (can be overridden per-session via /api/settings)
    default_llm_provider: str = "openai"
    default_llm_model: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
