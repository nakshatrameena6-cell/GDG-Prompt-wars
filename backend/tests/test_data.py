import json
from pathlib import Path
import pytest

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_json(filename: str):
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def skills_data():
    return load_json("skills.json")


@pytest.fixture
def roles_data():
    return load_json("roles.json")


@pytest.fixture
def resources_data():
    return load_json("resources.json")


def test_every_role_skill_exists(roles_data, skills_data):
    """Checks that every skill referenced in any role's required_skills exists in skills.json."""
    skill_ids = {s["id"] for s in skills_data}
    assert len(skill_ids) > 0

    for role in roles_data:
        assert "required_skills" in role
        for skill_id in role["required_skills"].keys():
            assert skill_id in skill_ids, f"Role '{role['id']}' references unknown skill '{skill_id}'"


def test_every_prereq_exists(skills_data):
    """Checks that every prerequisite referenced by any skill exists in skills.json."""
    skill_ids = {s["id"] for s in skills_data}

    for skill in skills_data:
        prereqs = skill.get("prerequisites", [])
        for prereq in prereqs:
            assert prereq in skill_ids, f"Skill '{skill['id']}' references unknown prerequisite '{prereq}'"


def test_no_prereq_cycles(skills_data):
    """Checks that there are no circular dependencies among skill prerequisites."""
    graph = {s["id"]: s.get("prerequisites", []) for s in skills_data}

    visited = set()
    rec_stack = set()

    def has_cycle(node):
        visited.add(node)
        rec_stack.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True

        rec_stack.remove(node)
        return False

    for skill_id in graph:
        if skill_id not in visited:
            assert not has_cycle(skill_id), f"Circular prerequisite dependency detected involving '{skill_id}'"


def test_every_skill_has_min_two_resources(skills_data, resources_data):
    """Checks that every skill in skills.json has at least 2 resources."""
    resource_counts = {}
    for r in resources_data:
        s_id = r["skill_id"]
        resource_counts[s_id] = resource_counts.get(s_id, 0) + 1

    for skill in skills_data:
        s_id = skill["id"]
        count = resource_counts.get(s_id, 0)
        assert count >= 2, f"Skill '{s_id}' has only {count} resources (minimum 2 required)"


def test_resources_urls_and_levels(resources_data, skills_data):
    """Checks that every resource URL starts with https:// and level is an integer between 1 and 5."""
    skill_ids = {s["id"] for s in skills_data}

    for r in resources_data:
        assert r["skill_id"] in skill_ids, f"Resource '{r['id']}' references unknown skill '{r['skill_id']}'"
        assert r["url"].startswith("https://"), f"Resource '{r['id']}' URL must start with https://, got '{r['url']}'"
        assert isinstance(r["level"], int), f"Resource '{r['id']}' level must be an int, got {type(r['level'])}"
        assert 1 <= r["level"] <= 5, f"Resource '{r['id']}' level {r['level']} is not between 1 and 5"
