"""
backend/db.py - SQLite storage engine and data access layer.
Handles schema initialization and persistence helpers.
"""

import os
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from backend.config import settings

def get_db_path() -> Path:
    p = Path(settings.DB_PATH)
    if not p.is_absolute():
        p = Path(__file__).resolve().parent.parent / p
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initializes SQLite schema on startup."""
    with get_connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            goal TEXT NOT NULL,
            interests TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS skill_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            skill_id TEXT NOT NULL,
            claimed_level INTEGER NOT NULL DEFAULT 0,
            verified_level INTEGER DEFAULT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(profile_id, skill_id)
        );

        CREATE TABLE IF NOT EXISTS completed_modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            skill_id TEXT NOT NULL,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(profile_id, skill_id)
        );
        """)
        try:
            conn.execute("ALTER TABLE profiles ADD COLUMN interests TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        conn.commit()


def reset_db():
    """Resets database schema completely."""
    with get_connection() as conn:
        conn.executescript("""
        DROP TABLE IF EXISTS completed_modules;
        DROP TABLE IF EXISTS skill_ratings;
        DROP TABLE IF EXISTS profiles;
        """)
        conn.commit()
    init_db()


def create_profile(name: str, goal: str, interests: Optional[str] = None) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO profiles (name, goal, interests) VALUES (?, ?, ?)",
            (name, goal, interests or "")
        )
        conn.commit()
        profile_id = cursor.lastrowid
        return get_profile(profile_id)


def get_profile(profile_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
        if not row:
            return None
        return dict(row)


def get_default_profile() -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM profiles ORDER BY id ASC LIMIT 1").fetchone()
        if not row:
            return None
        return dict(row)


def update_profile(
    profile_id: int,
    name: Optional[str] = None,
    goal: Optional[str] = None,
    interests: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if goal is not None:
        updates.append("goal = ?")
        params.append(goal)
    if interests is not None:
        updates.append("interests = ?")
        params.append(interests)

    if not updates:
        return get_profile(profile_id)

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(profile_id)

    with get_connection() as conn:
        conn.execute(
            f"UPDATE profiles SET {', '.join(updates)} WHERE id = ?",
            params
        )
        conn.commit()
    return get_profile(profile_id)


def get_user_skills(profile_id: int) -> Dict[str, Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT skill_id, claimed_level, verified_level FROM skill_ratings WHERE profile_id = ?",
            (profile_id,)
        ).fetchall()
        return {
            row["skill_id"]: {
                "claimed_level": row["claimed_level"],
                "verified_level": row["verified_level"],
            }
            for row in rows
        }


def set_skill_rating(
    profile_id: int,
    skill_id: str,
    claimed_level: int,
    verified_level: Optional[int] = None
):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO skill_ratings (profile_id, skill_id, claimed_level, verified_level, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(profile_id, skill_id) DO UPDATE SET
                claimed_level = excluded.claimed_level,
                verified_level = excluded.verified_level,
                updated_at = CURRENT_TIMESTAMP
        """, (profile_id, skill_id, claimed_level, verified_level))
        conn.commit()


def batch_set_skills(profile_id: int, skills_dict: Dict[str, int]):
    """Sets claimed levels for multiple skills in a single transaction."""
    with get_connection() as conn:
        for skill_id, claimed in skills_dict.items():
            conn.execute("""
                INSERT INTO skill_ratings (profile_id, skill_id, claimed_level, verified_level, updated_at)
                VALUES (?, ?, ?, NULL, CURRENT_TIMESTAMP)
                ON CONFLICT(profile_id, skill_id) DO UPDATE SET
                    claimed_level = excluded.claimed_level,
                    updated_at = CURRENT_TIMESTAMP
            """, (profile_id, skill_id, claimed))
        conn.commit()


def get_completed_skills(profile_id: int) -> Set[str]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT skill_id FROM completed_modules WHERE profile_id = ?",
            (profile_id,)
        ).fetchall()
        return {row["skill_id"] for row in rows}


def mark_skill_completed(profile_id: int, skill_id: str):
    with get_connection() as conn:
        conn.execute("""
            INSERT OR IGNORE INTO completed_modules (profile_id, skill_id)
            VALUES (?, ?)
        """, (profile_id, skill_id))
        conn.commit()


def count_db_rows() -> Dict[str, int]:
    """Helper to audit total row counts across all tables."""
    with get_connection() as conn:
        p_count = conn.execute("SELECT count(*) FROM profiles").fetchone()[0]
        s_count = conn.execute("SELECT count(*) FROM skill_ratings").fetchone()[0]
        m_count = conn.execute("SELECT count(*) FROM completed_modules").fetchone()[0]
        return {
            "profiles": p_count,
            "skill_ratings": s_count,
            "completed_modules": m_count,
            "total": p_count + s_count + m_count,
        }


def seed_sample_student() -> Dict[str, Any]:
    """
    Seeds database with Sample Student:
    Name: 'Sample Student'
    Goal: 'full_stack_developer'
    Interests: 'Web application architecture, RESTful API design, database systems'
    Skills: Python 3, SQL 3, html_css 2
    """
    reset_db()
    profile = create_profile(
        name="Sample Student",
        goal="full_stack_developer",
        interests="Web application architecture, RESTful API design, database systems"
    )
    p_id = profile["id"]

    # Seed ratings: Python 3, SQL 3, html_css 2
    set_skill_rating(p_id, "python", claimed_level=3)
    set_skill_rating(p_id, "sql", claimed_level=3)
    set_skill_rating(p_id, "html_css", claimed_level=2)

    return get_profile(p_id)

