"""
GET  /api/settings  — Fetch current app settings
PUT  /api/settings  — Update app settings
"""
from __future__ import annotations

from fastapi import APIRouter

from schemas.settings import AppSettings
from db.repositories.settings import get_settings_record, save_settings_record

router = APIRouter()


@router.get("/api/settings", response_model=AppSettings)
async def get_settings() -> AppSettings:
    return get_settings_record()


@router.put("/api/settings", response_model=AppSettings)
async def update_settings(data: AppSettings) -> AppSettings:
    return save_settings_record(data)


@router.get("/api/chef/sections")
async def get_chef_sections() -> dict:
    """Return the default content for each named chef prompt section."""
    from chef_agent import CHEF_SECTIONS
    return CHEF_SECTIONS
