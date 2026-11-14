import json
from pathlib import Path
import pytest
from backend.core.profile_analyst import generate_profile_summary
from backend.core.gap import analyze_gaps

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

with open(DATA_DIR / "skills.json", "r", encoding="utf-8") as f:
    SKILLS_CATALOG = json.load(f)

with open(DATA_DIR / "roles.json", "r", encoding="utf-8") as f:
    ROLES_MAP = {r["id"]: r for r in json.load(f)}


def test_sample_student_profile_summary():
    profile = {
        "id": 1,
        "name": "Sample Student",
        "goal": "full_stack_developer",
        "interests": "Web application architecture, API engineering",
    }
    role = ROLES_MAP["full_stack_developer"]
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": None},
        "sql": {"claimed_level": 3, "verified_level": None},
        "html_css": {"claimed_level": 2, "verified_level": None},
    }

    gap_report = analyze_gaps(role["required_skills"], user_skills, SKILLS_CATALOG)
    summary = generate_profile_summary(profile, role, user_skills, gap_report, SKILLS_CATALOG)

    # 1. Interests
    assert summary["interests"] == "Web application architecture, API engineering"

    # 2. Claimed strengths (Python 3, SQL 3)
    strength_ids = [s["skill_id"] for s in summary["claimed_strengths"]]
    assert "python" in strength_ids
    assert "sql" in strength_ids
    assert "html_css" not in strength_ids  # Level 2 < 3

    # 3. Selected career
    assert summary["selected_career"]["id"] == "full_stack_developer"
    assert summary["selected_career"]["title"] == "Full Stack Developer"

    # 4. Main skill gaps (must include javascript, react, nodejs, rest_api)
    gap_ids = [g["skill_id"] for g in summary["main_skill_gaps"]]
    assert "javascript" in gap_ids
    assert "react" in gap_ids
    assert "nodejs" in gap_ids
    assert "rest_api" in gap_ids
    assert "python" not in gap_ids
    assert "sql" not in gap_ids

    # 5. Short transparent observation
    obs = summary["observation"]
    assert "Sample Student" in obs
    assert "Python" in obs or "SQL" in obs
    assert "Full Stack Developer" in obs
    assert len(obs) > 20


def test_profile_summary_fallback_interests():
    profile = {
        "id": 2,
        "name": "Alice",
        "goal": "data_analyst",
        "interests": "",
    }
    role = ROLES_MAP["data_analyst"]
    user_skills = {
        "python": {"claimed_level": 4, "verified_level": None},
    }

    gap_report = analyze_gaps(role["required_skills"], user_skills, SKILLS_CATALOG)
    summary = generate_profile_summary(profile, role, user_skills, gap_report, SKILLS_CATALOG)

    assert len(summary["interests"]) > 0
    assert summary["selected_career"]["id"] == "data_analyst"

