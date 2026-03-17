"""
Pydantic schemas for user profiles.
Matches the UserProfile TypeScript type in frontend/lib/types.ts.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class UserProfileCreate(BaseModel):
    profileName: str
    sex: str = "other"                    # "female" | "male" | "other"
    weightKg: float = 0.0
    heightCm: float = 0.0
    age: int = 0
    activityLevel: str = "moderate"       # "sedentary" | "light" | "moderate" | "active" | "very_active"
    weightGoal: str = "maintain"          # "maintain" | "lose" | "gain"
    allergies: List[str] = Field(default_factory=list)
    allergyOther: str = ""
    medicalConditions: List[str] = Field(default_factory=list)
    dietaryPreferences: List[str] = Field(default_factory=list)
    notes: str = ""


class UserProfileOut(UserProfileCreate):
    id: str
    createdAtIso: str
