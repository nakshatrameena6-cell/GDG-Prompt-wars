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
    conn = sqlite3.connect(get_db_path(), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def init_db():
    """Initializes SQLite schema and performance indices on startup."""
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

        CREATE TABLE IF NOT EXISTS assessment_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            accuracy_pct REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS assessment_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attempt_id INTEGER NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            question_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            selected_option INTEGER NOT NULL,
            is_correct BOOLEAN NOT NULL,
            response_time REAL NOT NULL,
            difficulty TEXT NOT NULL,
            error_tag TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            agent_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            details TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_assessment_attempts_profile ON assessment_attempts(profile_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_responses_attempt ON assessment_responses(attempt_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_responses_profile ON assessment_responses(profile_id);
        CREATE INDEX IF NOT EXISTS idx_agent_events_profile ON agent_events(profile_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_skill_ratings_profile ON skill_ratings(profile_id);
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
        DROP TABLE IF EXISTS agent_events;
        DROP TABLE IF EXISTS assessment_responses;
        DROP TABLE IF EXISTS assessment_attempts;
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


def record_assessment_attempt(
    profile_id: int,
    score: int,
    total_questions: int,
    accuracy_pct: float
) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO assessment_attempts (profile_id, score, total_questions, accuracy_pct)
            VALUES (?, ?, ?, ?)
        """, (profile_id, score, total_questions, accuracy_pct))
        conn.commit()
        return cursor.lastrowid


def record_assessment_responses(
    attempt_id: int,
    profile_id: int,
    responses: List[Dict[str, Any]]
):
    with get_connection() as conn:
        for r in responses:
            conn.execute("""
                INSERT INTO assessment_responses (
                    attempt_id, profile_id, question_id, skill_id,
                    selected_option, is_correct, response_time, difficulty, error_tag
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                attempt_id,
                profile_id,
                r.get("question_id", ""),
                r.get("skill_id", ""),
                r.get("selected_option", -1),
                1 if r.get("is_correct") else 0,
                r.get("response_time", 0.0),
                r.get("difficulty", "MEDIUM"),
                r.get("error_tag", "")
            ))
        conn.commit()


def get_assessment_history(profile_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT id, score, total_questions, accuracy_pct, created_at
            FROM assessment_attempts
            WHERE profile_id = ?
            ORDER BY created_at DESC
        """, (profile_id,)).fetchall()
        return [dict(r) for r in rows]


def record_agent_event(
    profile_id: int,
    agent_name: str,
    event_type: str,
    details: str
):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO agent_events (profile_id, agent_name, event_type, details)
            VALUES (?, ?, ?, ?)
        """, (profile_id, agent_name, event_type, details))
        conn.commit()


def get_agent_events(profile_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT id, agent_name, event_type, details, created_at
            FROM agent_events
            WHERE profile_id = ?
            ORDER BY id DESC
            LIMIT ?
        """, (profile_id, limit)).fetchall()
        return [dict(r) for r in rows]



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

