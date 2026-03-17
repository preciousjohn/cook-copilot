"""
App settings repository — singleton row in app_settings table.
"""
from __future__ import annotations

import json
from typing import Optional

from db.connection import db_cursor
from schemas.settings import AppSettings


def get_settings_record() -> AppSettings:
    """Return current app settings, or defaults if none saved yet."""
    with db_cursor() as cur:
        cur.execute("SELECT settings_json FROM app_settings WHERE id = 1")
        row = cur.fetchone()
        if row:
            data = json.loads(row["settings_json"])
            return AppSettings(**data)
        return AppSettings()


def save_settings_record(settings: AppSettings) -> AppSettings:
    """Upsert the singleton settings row."""
    data = json.dumps(settings.model_dump())
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO app_settings (id, settings_json) VALUES (1, ?)
               ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json""",
            (data,),
        )
    return settings
