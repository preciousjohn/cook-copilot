"""
SQLite database connection and schema initialization.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Generator

from core.config import get_settings


def db_connect() -> sqlite3.Connection:
    """Open a database connection with row_factory for dict-like access."""
    settings = get_settings()
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_cursor() -> Generator[sqlite3.Cursor, None, None]:
    """Context manager yielding a cursor; commits on success, rolls back on error."""
    conn = db_connect()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def db_init() -> None:
    """
    Create all required tables if they don't already exist.
    Safe to call on every startup.
    """
    with db_cursor() as cur:
        # ── User profiles ────────────────────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                profile_name TEXT NOT NULL,
                sex TEXT DEFAULT 'other',
                weight_kg REAL DEFAULT 0,
                height_cm REAL DEFAULT 0,
                age INTEGER DEFAULT 0,
                activity_level TEXT DEFAULT 'moderate',
                weight_goal TEXT DEFAULT 'maintain',
                allergies_json TEXT DEFAULT '[]',
                allergy_other TEXT DEFAULT '',
                medical_conditions_json TEXT DEFAULT '[]',
                dietary_preferences_json TEXT DEFAULT '[]',
                notes TEXT DEFAULT ''
            )
        """)

        # ── App settings (singleton row, id always 1) ─────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                settings_json TEXT NOT NULL
            )
        """)

        # ── Legacy tables (kept for backward compatibility) ───────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                prompt TEXT,
                result_json TEXT
            )
        """)
