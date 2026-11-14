import json
from pathlib import Path
import pytest
from backend.core.planner import (
    topological_sort_skills,
    generate_roadmap,
    diff_goals,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

with open(DATA_DIR / "skills.json", "r", encoding="utf-8") as f:
    SKILLS_CATALOG = json.load(f)

with open(DATA_DIR / "roles.json", "r", encoding="utf-8") as f:
    ROLES_CATALOG = {r["id"]: r for r in json.load(f)}

with open(DATA_DIR / "resources.json", "r", encoding="utf-8") as f:
    RESOURCES_CATALOG = json.load(f)


def test_topological_sort():
    prereq_map = {s["id"]: s.get("prerequisites", []) for s in SKILLS_CATALOG}
    role_skills = set(ROLES_CATALOG["full_stack_developer"]["required_skills"].keys())

    ordered = topological_sort_skills(role_skills, prereq_map)

    # Must contain all skills
    assert set(ordered) == role_skills

    # javascript must precede react and nodejs
    js_idx = ordered.index("javascript")
    react_idx = ordered.index("react")
    node_idx = ordered.index("nodejs")
    api_idx = ordered.index("rest_api")

    assert js_idx < react_idx, "javascript must precede react"
    assert js_idx < node_idx, "javascript must precede nodejs"
    assert node_idx < api_idx, "nodejs must precede rest_api"


def test_roadmap_sample_student_statuses():
    role = ROLES_CATALOG["full_stack_developer"]
    # Sample student: Python 3, SQL 3, html_css 2
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": None},
        "sql": {"claimed_level": 3, "verified_level": None},
        "html_css": {"claimed_level": 2, "verified_level": None},
    }
    completed_skill_ids = set()

    roadmap = generate_roadmap(
        role_id="full_stack_developer",
        role_title=role["title"],
        required_skills=role["required_skills"],
        skills_catalog=SKILLS_CATALOG,
        resources_catalog=RESOURCES_CATALOG,
        user_skills=user_skills,
        completed_skill_ids=completed_skill_ids,
    )

    modules_by_skill = {m["skill_id"]: m for m in roadmap}

    # Python and SQL have effective level >= required -> done
    assert modules_by_skill["python"]["status"] == "done"
    assert modules_by_skill["sql"]["status"] == "done"
    assert modules_by_skill["html_css"]["status"] == "done"

    # JavaScript has no unmet prereqs -> active
    assert modules_by_skill["javascript"]["status"] == "active"

    # React and Node.js depend on JavaScript (not done) -> locked
    assert modules_by_skill["react"]["status"] == "locked"
    assert modules_by_skill["nodejs"]["status"] == "locked"
    assert modules_by_skill["rest_api"]["status"] == "locked"

    # Ordering: javascript precedes react and nodejs
    ordered_ids = [m["skill_id"] for m in roadmap]
    assert ordered_ids.index("javascript") < ordered_ids.index("react")
    assert ordered_ids.index("javascript") < ordered_ids.index("nodejs")

    # Resource selection check: each module has resources
    for mod in roadmap:
        assert len(mod["resources"]) >= 2
        assert all(r["skill_id"] == mod["skill_id"] for r in mod["resources"])


def test_completing_javascript_unlocks_react_and_nodejs():
    role = ROLES_CATALOG["full_stack_developer"]
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": None},
        "sql": {"claimed_level": 3, "verified_level": None},
        "html_css": {"claimed_level": 2, "verified_level": None},
    }

    # Simulate marking JavaScript complete
    completed_skill_ids = {"javascript"}

    roadmap = generate_roadmap(
        role_id="full_stack_developer",
        role_title=role["title"],
        required_skills=role["required_skills"],
        skills_catalog=SKILLS_CATALOG,
        resources_catalog=RESOURCES_CATALOG,
        user_skills=user_skills,
        completed_skill_ids=completed_skill_ids,
    )

    modules_by_skill = {m["skill_id"]: m for m in roadmap}

    assert modules_by_skill["javascript"]["status"] == "done"
    # Unlocked!
    assert modules_by_skill["react"]["status"] == "active"
    assert modules_by_skill["nodejs"]["status"] == "active"
    # rest_api still waits for nodejs
    assert modules_by_skill["rest_api"]["status"] == "locked"


def test_diff_goals():
    fs_role = ROLES_CATALOG["full_stack_developer"]
    da_role = ROLES_CATALOG["data_analyst"]
    user_skills = {
        "python": {"claimed_level": 3, "verified_level": None},
        "sql": {"claimed_level": 3, "verified_level": None},
        "html_css": {"claimed_level": 2, "verified_level": None},
    }

    diff = diff_goals(
        current_goal_skills=fs_role["required_skills"],
        new_goal_skills=da_role["required_skills"],
        user_skills=user_skills,
    )

    assert set(diff["kept_skills"]) == {"python", "sql", "git"}
    assert set(diff["added_skills"]) == {"pandas", "data_analysis", "data_visualization"}
    assert set(diff["removed_skills"]) == {"javascript", "react", "nodejs", "rest_api", "html_css"}
    assert diff["readiness_before"] == 36.4
    assert diff["readiness_after"] == 35.3

