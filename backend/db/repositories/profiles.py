"""
Profile CRUD operations against the SQLite profiles table.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from db.connection import db_cursor
from schemas.profiles import UserProfileCreate, UserProfileOut


def _row_to_profile(row) -> UserProfileOut:
    return UserProfileOut(
        id=row["id"],
        createdAtIso=row["created_at"],
        profileName=row["profile_name"],
        sex=row["sex"],
        weightKg=row["weight_kg"],
        heightCm=row["height_cm"],
        age=row["age"],
        activityLevel=row["activity_level"],
        weightGoal=row["weight_goal"],
        allergies=json.loads(row["allergies_json"] or "[]"),
        allergyOther=row["allergy_other"] or "",
        medicalConditions=json.loads(row["medical_conditions_json"] or "[]"),
        dietaryPreferences=json.loads(row["dietary_preferences_json"] or "[]"),
        notes=row["notes"] or "",
    )


def list_profiles() -> List[UserProfileOut]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM profiles ORDER BY created_at DESC")
        return [_row_to_profile(row) for row in cur.fetchall()]


def get_profile(profile_id: str) -> Optional[UserProfileOut]:
    with db_cursor() as cur:
        cur.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,))
        row = cur.fetchone()
        return _row_to_profile(row) if row else None


def create_profile(data: UserProfileCreate) -> UserProfileOut:
    profile_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO profiles (
                id, created_at, profile_name, sex, weight_kg, height_cm, age,
                activity_level, weight_goal, allergies_json, allergy_other,
                medical_conditions_json, dietary_preferences_json, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                profile_id, created_at, data.profileName, data.sex,
                data.weightKg, data.heightCm, data.age,
                data.activityLevel, data.weightGoal,
                json.dumps(data.allergies), data.allergyOther,
                json.dumps(data.medicalConditions),
                json.dumps(data.dietaryPreferences), data.notes,
            ),
        )
    return UserProfileOut(
        id=profile_id, createdAtIso=created_at, **data.model_dump()
    )


def update_profile(profile_id: str, data: UserProfileCreate) -> Optional[UserProfileOut]:
    with db_cursor() as cur:
        cur.execute(
            """UPDATE profiles SET
                profile_name=?, sex=?, weight_kg=?, height_cm=?, age=?,
                activity_level=?, weight_goal=?, allergies_json=?, allergy_other=?,
                medical_conditions_json=?, dietary_preferences_json=?, notes=?
            WHERE id=?""",
            (
                data.profileName, data.sex, data.weightKg, data.heightCm, data.age,
                data.activityLevel, data.weightGoal,
                json.dumps(data.allergies), data.allergyOther,
                json.dumps(data.medicalConditions),
                json.dumps(data.dietaryPreferences), data.notes,
                profile_id,
            ),
        )
        if cur.rowcount == 0:
            return None
    return get_profile(profile_id)


def delete_profile(profile_id: str) -> bool:
    with db_cursor() as cur:
        cur.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
        return cur.rowcount > 0
