"""
CRUD endpoints for user profiles.
GET    /api/profiles
POST   /api/profiles
PUT    /api/profiles/{id}
DELETE /api/profiles/{id}
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import List

from schemas.profiles import UserProfileCreate, UserProfileOut
from db.repositories import profiles as profiles_repo

router = APIRouter()


@router.get("/api/profiles", response_model=List[UserProfileOut])
async def list_profiles() -> List[UserProfileOut]:
    return profiles_repo.list_profiles()


@router.post("/api/profiles", response_model=UserProfileOut, status_code=201)
async def create_profile(data: UserProfileCreate) -> UserProfileOut:
    return profiles_repo.create_profile(data)


@router.put("/api/profiles/{profile_id}", response_model=UserProfileOut)
async def update_profile(profile_id: str, data: UserProfileCreate) -> UserProfileOut:
    updated = profiles_repo.update_profile(profile_id, data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated


@router.delete("/api/profiles/{profile_id}", status_code=204)
async def delete_profile(profile_id: str) -> None:
    if not profiles_repo.delete_profile(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
